from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class TenantContextMiddleware(BaseHTTPMiddleware):
    """
    Extracts tenant_id from the authenticated user's JWT claims
    and stores it on request.state for downstream use.

    The actual RLS SET LOCAL happens in the get_db dependency when
    tenant context is available. This middleware just makes tenant_id
    accessible early in the request lifecycle.
    """

    # Paths that don't require tenant context
    EXEMPT_PATHS = ("/api/v1/auth/", "/docs", "/redoc", "/openapi.json", "/api/health")

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip tenant context for exempt paths
        path = request.url.path
        if any(path.startswith(p) for p in self.EXEMPT_PATHS):
            request.state.tenant_id = None
            return await call_next(request)

        # tenant_id is set by the auth dependency (get_current_user)
        # This middleware just ensures the attribute exists
        if not hasattr(request.state, "tenant_id"):
            request.state.tenant_id = None

        return await call_next(request)
