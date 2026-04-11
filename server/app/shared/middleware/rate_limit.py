import time

import redis.asyncio as redis
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple Redis-based rate limiter using sliding window."""

    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.redis: redis.Redis | None = None

    async def _get_redis(self) -> redis.Redis:
        if self.redis is None:
            self.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        return self.redis

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip rate limiting for health checks and docs
        if request.url.path in ("/api/health", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        # Identify client by user ID (if authenticated) or IP
        user_id = getattr(request.state, "user_id", None)
        client_key = f"ratelimit:{user_id or request.client.host}"

        try:
            r = await self._get_redis()
            now = time.time()
            window_start = now - 60

            pipe = r.pipeline()
            pipe.zremrangebyscore(client_key, 0, window_start)
            pipe.zadd(client_key, {str(now): now})
            pipe.zcard(client_key)
            pipe.expire(client_key, 60)
            results = await pipe.execute()

            request_count = results[2]

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
            response.headers["X-RateLimit-Remaining"] = str(
                max(0, self.requests_per_minute - request_count)
            )
            response.headers["X-RateLimit-Reset"] = str(int(now + 60))

            if request_count > self.requests_per_minute:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": {
                            "code": "RATE_LIMITED",
                            "message": "Too many requests",
                            "details": None,
                        },
                        "meta": {"request_id": getattr(request.state, "request_id", None)},
                    },
                )

            return response
        except Exception:
            # If Redis is down, allow the request through
            return await call_next(request)
