"""
Seed script — populates the database with test data matching the frontend MSW mocks.
Run: python scripts/seed.py
"""
import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.service import hash_password
from app.config import settings

# Fixed UUIDs for predictable seeding
ORG_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
USMAN_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")
PINE_ID = uuid.UUID("00000000-0000-0000-0000-000000000011")
JOHN_ID = uuid.UUID("00000000-0000-0000-0000-000000000012")
SARAH_ID = uuid.UUID("00000000-0000-0000-0000-000000000013")
RAOOF_ID = uuid.UUID("00000000-0000-0000-0000-000000000014")

PASSWORD_HASH = hash_password("password123")


async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db:
        # Disable RLS for seeding
        await db.execute(text("SET session_replication_role = 'replica'"))

        # --- Clean existing data (in reverse FK order) ---
        await db.execute(text("DELETE FROM admin.audit_logs WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        await db.execute(text("DELETE FROM admin.invitations WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        await db.execute(text("DELETE FROM admin.org_preferences WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        await db.execute(text("DELETE FROM admin.org_branding WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        await db.execute(text("DELETE FROM admin.user_module_roles WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        await db.execute(text("DELETE FROM admin.users WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        await db.execute(text("DELETE FROM admin.organizations WHERE id = :id"), {"id": str(ORG_ID)})

        # --- Organization ---
        await db.execute(
            text("""
                INSERT INTO admin.organizations (id, name, registration_number, website, currency, timezone, support_email, status, address, created_at, updated_at)
                VALUES (:id, :name, :reg, :website, :currency, :tz, :email, 'active', :address, NOW(), NOW())
            """),
            {
                "id": str(ORG_ID),
                "name": "Watar Partners",
                "reg": "WP-2024-001",
                "website": "https://watar.com",
                "currency": "USD",
                "tz": "Asia/Dubai",
                "email": "support@watar.com",
                "address": json.dumps({"line1": "123 Financial District", "city": "Dubai", "state": "Dubai", "postalCode": "00000", "country": "UAE"}),
            },
        )

        # --- Users ---
        users = [
            (USMAN_ID, "usman@watar.com", "Usman", "Al-Rashid", "active"),
            (PINE_ID, "pine@watar.com", "Pine", "Anderson", "active"),
            (JOHN_ID, "john@watar.com", "John", "Smith", "active"),
            (SARAH_ID, "sarah@watar.com", "Sarah", "Johnson", "invited"),
            (RAOOF_ID, "raoof@watar.com", "Raoof", "Naushad", "active"),
        ]

        for user_id, email, first, last, status in users:
            pw = PASSWORD_HASH if status == "active" else None
            await db.execute(
                text("""
                    INSERT INTO admin.users (id, tenant_id, email, password_hash, first_name, last_name, status, created_at, updated_at)
                    VALUES (:id, :tenant_id, :email, :pw, :first, :last, :status, NOW(), NOW())
                """),
                {
                    "id": str(user_id),
                    "tenant_id": str(ORG_ID),
                    "email": email,
                    "pw": pw,
                    "first": first,
                    "last": last,
                    "status": status,
                },
            )

        # --- Module Roles ---
        roles = [
            (USMAN_ID, "admin", "owner"), (USMAN_ID, "deals", "owner"), (USMAN_ID, "engage", "owner"),
            (USMAN_ID, "plan", "owner"), (USMAN_ID, "insights", "owner"), (USMAN_ID, "tools", "owner"),
            (PINE_ID, "deals", "manager"), (PINE_ID, "engage", "manager"), (PINE_ID, "insights", "manager"),
            (JOHN_ID, "deals", "analyst"), (JOHN_ID, "engage", "analyst"), (JOHN_ID, "insights", "analyst"),
            (SARAH_ID, "deals", "analyst"),
            (RAOOF_ID, "admin", "owner"), (RAOOF_ID, "deals", "manager"),
            (RAOOF_ID, "engage", "manager"), (RAOOF_ID, "insights", "analyst"),
        ]

        for user_id, module_slug, role in roles:
            await db.execute(
                text("""
                    INSERT INTO admin.user_module_roles (id, tenant_id, user_id, module_slug, role, created_at)
                    VALUES (:id, :tenant_id, :user_id, :module_slug, :role, NOW())
                """),
                {
                    "id": str(uuid.uuid4()),
                    "tenant_id": str(ORG_ID),
                    "user_id": str(user_id),
                    "module_slug": module_slug,
                    "role": role,
                },
            )

        # --- Branding ---
        await db.execute(
            text("""
                INSERT INTO admin.org_branding (id, tenant_id, header_logo, brand_color, email_footer, created_at, updated_at)
                VALUES (:id, :tenant_id, 'small', '#1E3A5F', 'Watar Partners | Dubai, UAE | support@watar.com', NOW(), NOW())
            """),
            {"id": str(uuid.uuid4()), "tenant_id": str(ORG_ID)},
        )

        # --- Preferences ---
        await db.execute(
            text("""
                INSERT INTO admin.org_preferences (id, tenant_id, date_format, number_format, created_at, updated_at)
                VALUES (:id, :tenant_id, 'DD/MM/YYYY', 'en-US', NOW(), NOW())
            """),
            {"id": str(uuid.uuid4()), "tenant_id": str(ORG_ID)},
        )

        # --- Invitations ---
        invitations = [
            ("alex@example.com", "Alex", "Turner", [{"moduleSlug": "deals", "role": "analyst"}, {"moduleSlug": "engage", "role": "analyst"}]),
            ("maria@example.com", "Maria", "Garcia", [{"moduleSlug": "insights", "role": "manager"}]),
        ]
        for email, first, last, module_roles in invitations:
            await db.execute(
                text("""
                    INSERT INTO admin.invitations (id, tenant_id, email, first_name, last_name, module_roles, status, invited_by, expires_at, created_at)
                    VALUES (:id, :tenant_id, :email, :first, :last, :roles, 'pending', :invited_by, :expires_at, NOW())
                """),
                {
                    "id": str(uuid.uuid4()),
                    "tenant_id": str(ORG_ID),
                    "email": email,
                    "first": first,
                    "last": last,
                    "roles": json.dumps(module_roles),
                    "invited_by": str(RAOOF_ID),
                    "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                },
            )

        await db.execute(text("SET session_replication_role = 'origin'"))
        await db.commit()

    await engine.dispose()
    print("Seed complete!")
    print(f"  Organization: Watar Partners ({ORG_ID})")
    print(f"  Users: 5 (login with raoof@watar.com / password123)")
    print(f"  Invitations: 2 pending")


if __name__ == "__main__":
    asyncio.run(seed())
