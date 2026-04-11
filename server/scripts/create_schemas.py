"""Create PostgreSQL schemas required by the application."""
import asyncio

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings


async def create_schemas():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS admin"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS platform"))
    await engine.dispose()
    print("Created schemas: admin, platform")


if __name__ == "__main__":
    asyncio.run(create_schemas())
