import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool, text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.database.base import Base

# Import all models so they register with Base.metadata
from app.auth.models import RefreshToken  # noqa: F401
from app.modules.admin.models import (  # noqa: F401
    AuditLog,
    Invitation,
    Organization,
    OrgBranding,
    OrgPreferences,
    User,
    UserModuleRole,
)
from app.modules.deals.models import (  # noqa: F401
    AssetManager,
    DocumentTemplate,
    InvestmentType,
    Mandate,
    Opportunity,
)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table_schema="public",
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_schemas=True,
        version_table_schema="public",
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(settings.DATABASE_URL, poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.execute(text("CREATE SCHEMA IF NOT EXISTS admin"))
        await connection.execute(text("CREATE SCHEMA IF NOT EXISTS platform"))
        await connection.execute(text("CREATE SCHEMA IF NOT EXISTS deals"))
        await connection.commit()
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
