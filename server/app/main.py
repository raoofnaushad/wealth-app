from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.shared.exceptions import AppException, app_exception_handler
from app.shared.middleware import RateLimitMiddleware, RequestLoggingMiddleware, TenantContextMiddleware

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.ENVIRONMENT == "development" else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO level
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("server_starting", environment=settings.ENVIRONMENT)
    yield
    logger.info("server_stopping")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Invictus AI",
        description="Wealth Management Platform API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Exception handlers
    app.add_exception_handler(AppException, app_exception_handler)

    # Middleware (order matters — outermost first)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=100)
    app.add_middleware(TenantContextMiddleware)

    # Routers
    from app.auth.router import router as auth_router
    from app.modules.admin.router import router as admin_router
    from app.account.router import router as account_router

    app.include_router(auth_router)
    app.include_router(admin_router)
    app.include_router(account_router)

    # Health check
    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
