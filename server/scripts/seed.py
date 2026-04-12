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

# --- Deals: fixed UUIDs ---
IT_FUND_ID = uuid.UUID("10000000-0000-0000-0000-000000000001")
IT_DIRECT_ID = uuid.UUID("10000000-0000-0000-0000-000000000002")
IT_COINVEST_ID = uuid.UUID("10000000-0000-0000-0000-000000000003")
IT_OTHER_ID = uuid.UUID("10000000-0000-0000-0000-000000000004")

MANDATE_GROWTH_ID = uuid.UUID("20000000-0000-0000-0000-000000000001")
MANDATE_REAL_ID = uuid.UUID("20000000-0000-0000-0000-000000000002")

AM_ABINGWORTH_ID = uuid.UUID("30000000-0000-0000-0000-000000000001")
AM_BLACKSTONE_ID = uuid.UUID("30000000-0000-0000-0000-000000000002")
AM_SEQUOIA_ID = uuid.UUID("30000000-0000-0000-0000-000000000003")

OPP_1_ID = uuid.UUID("40000000-0000-0000-0000-000000000001")
OPP_2_ID = uuid.UUID("40000000-0000-0000-0000-000000000002")
OPP_3_ID = uuid.UUID("40000000-0000-0000-0000-000000000003")
OPP_4_ID = uuid.UUID("40000000-0000-0000-0000-000000000004")
OPP_5_ID = uuid.UUID("40000000-0000-0000-0000-000000000005")
OPP_6_ID = uuid.UUID("40000000-0000-0000-0000-000000000006")

PASSWORD_HASH = hash_password("password123")


async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db:
        # Disable RLS for seeding
        await db.execute(text("SET session_replication_role = 'replica'"))

        # --- Clean existing data (in reverse FK order) ---
        # Deals tables
        await db.execute(text("DELETE FROM deals.opportunities WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        await db.execute(text("DELETE FROM deals.asset_managers WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        await db.execute(text("DELETE FROM deals.mandates WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        await db.execute(text("DELETE FROM deals.document_templates WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        await db.execute(text("DELETE FROM deals.investment_types WHERE tenant_id = :id"), {"id": str(ORG_ID)})
        # Admin tables
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

        # =====================================================================
        # DEALS MODULE SEED DATA
        # =====================================================================

        # --- Investment Types ---
        investment_types = [
            {
                "id": str(IT_FUND_ID),
                "name": "Fund",
                "slug": "fund",
                "is_system": True,
                "sort_order": 0,
                "snapshot_config": json.dumps({
                    "sections": [
                        {
                            "name": "Deal Overview",
                            "fields": [
                                {"name": "Deal Name", "type": "text", "required": True, "instruction": "Extract the official fund or deal name"},
                                {"name": "Fund Manager/GP", "type": "text", "required": True, "instruction": "Identify the general partner or fund manager entity"},
                                {"name": "Fund Strategy", "type": "select", "required": True, "instruction": "Classify the fund strategy (e.g. Buyout, Growth, Venture, Credit)"},
                                {"name": "Geographic Focus", "type": "multi_select", "required": False, "instruction": "List target geographies for fund deployment"},
                                {"name": "Source/Referral", "type": "text", "required": False, "instruction": "Identify who referred or sourced this deal"},
                                {"name": "Date Received", "type": "date", "required": True, "instruction": "Extract the date the materials were received"},
                            ],
                        },
                        {
                            "name": "Fund Terms",
                            "fields": [
                                {"name": "Target Fund Size", "type": "currency", "required": True, "instruction": "Extract the target fund size in base currency"},
                                {"name": "Minimum Commitment", "type": "currency", "required": False, "instruction": "Extract the minimum LP commitment amount"},
                                {"name": "Management Fee", "type": "percentage", "required": False, "instruction": "Extract the annual management fee percentage"},
                                {"name": "Carried Interest", "type": "percentage", "required": False, "instruction": "Extract the carried interest / promote percentage"},
                                {"name": "Preferred Return", "type": "percentage", "required": False, "instruction": "Extract the preferred return / hurdle rate"},
                            ],
                        },
                        {
                            "name": "Target Economics",
                            "fields": [
                                {"name": "Target Net IRR", "type": "percentage", "required": False, "instruction": "Extract the target net IRR to LPs"},
                                {"name": "Target Net MOIC", "type": "number", "required": False, "instruction": "Extract the target net multiple on invested capital"},
                            ],
                        },
                    ]
                }),
            },
            {
                "id": str(IT_DIRECT_ID),
                "name": "Direct",
                "slug": "direct",
                "is_system": True,
                "sort_order": 1,
                "snapshot_config": json.dumps({
                    "sections": [
                        {
                            "name": "Deal Overview",
                            "fields": [
                                {"name": "Deal Name", "type": "text", "required": True, "instruction": "Extract the deal or project name"},
                                {"name": "Target Company", "type": "text", "required": True, "instruction": "Identify the target company or asset"},
                                {"name": "Transaction Type", "type": "select", "required": True, "instruction": "Classify the transaction type (e.g. Acquisition, Growth Equity, Recapitalization)"},
                                {"name": "Industry/Sector", "type": "select", "required": True, "instruction": "Classify the primary industry or sector"},
                                {"name": "Source/Referral", "type": "text", "required": False, "instruction": "Identify who referred or sourced this deal"},
                                {"name": "Date Received", "type": "date", "required": True, "instruction": "Extract the date the materials were received"},
                            ],
                        },
                        {
                            "name": "Financial Overview",
                            "fields": [
                                {"name": "LTM Revenue", "type": "currency", "required": False, "instruction": "Extract the last twelve months revenue"},
                                {"name": "LTM EBITDA", "type": "currency", "required": False, "instruction": "Extract the last twelve months EBITDA"},
                                {"name": "Enterprise Value", "type": "currency", "required": False, "instruction": "Extract the enterprise value or asking price"},
                                {"name": "EV/EBITDA Multiple", "type": "number", "required": False, "instruction": "Calculate or extract the EV/EBITDA valuation multiple"},
                            ],
                        },
                    ]
                }),
            },
            {
                "id": str(IT_COINVEST_ID),
                "name": "Co-Investment",
                "slug": "co-investment",
                "is_system": True,
                "sort_order": 2,
                "snapshot_config": json.dumps({
                    "sections": [
                        {
                            "name": "Deal Overview",
                            "fields": [
                                {"name": "Deal Name", "type": "text", "required": True, "instruction": "Extract the co-investment deal name"},
                                {"name": "Target Company", "type": "text", "required": True, "instruction": "Identify the target company or asset"},
                                {"name": "Lead GP/Sponsor", "type": "text", "required": True, "instruction": "Identify the lead GP or sponsor offering the co-invest"},
                                {"name": "Co-Investment Equity Available", "type": "currency", "required": False, "instruction": "Extract the total co-investment equity available"},
                                {"name": "Response Deadline", "type": "date", "required": False, "instruction": "Extract the deadline for co-investment response"},
                            ],
                        },
                    ]
                }),
            },
            {
                "id": str(IT_OTHER_ID),
                "name": "Other",
                "slug": "other",
                "is_system": True,
                "sort_order": 3,
                "snapshot_config": json.dumps({
                    "sections": [
                        {
                            "name": "Deal Overview",
                            "fields": [
                                {"name": "Deal Name", "type": "text", "required": True, "instruction": "Extract the deal or opportunity name"},
                                {"name": "Investment Type", "type": "text", "required": True, "instruction": "Describe the type of investment"},
                                {"name": "Counterparty/Issuer", "type": "text", "required": False, "instruction": "Identify the counterparty or issuer"},
                                {"name": "Description", "type": "textarea", "required": False, "instruction": "Summarize the opportunity in 2-3 sentences"},
                            ],
                        },
                    ]
                }),
            },
        ]

        for it in investment_types:
            await db.execute(
                text("""
                    INSERT INTO deals.investment_types (id, tenant_id, name, slug, is_system, sort_order, snapshot_config, created_at, updated_at)
                    VALUES (:id, :tenant_id, :name, :slug, :is_system, :sort_order, :snapshot_config::jsonb, NOW(), NOW())
                """),
                {"tenant_id": str(ORG_ID), **it},
            )

        # --- Document Templates (5 per investment type) ---
        template_defs = [
            ("Investment Memo", "investment-memo", 0, "Generate a comprehensive investment memo covering thesis, risks, terms, and recommendation."),
            ("Pre-Screening Report", "pre-screening", 1, "Produce a concise pre-screening summary highlighting key metrics, red flags, and initial fit assessment."),
            ("DDQ", "ddq", 2, "Create a due diligence questionnaire covering governance, operations, compliance, and financials."),
            ("Market Analysis", "market-analysis", 3, "Analyze the relevant market landscape, competitive dynamics, and macro trends for this opportunity."),
            ("News/Insights", "news", 4, "Compile recent news, press releases, and market commentary relevant to this opportunity."),
        ]

        for it_id in [IT_FUND_ID, IT_DIRECT_ID, IT_COINVEST_ID, IT_OTHER_ID]:
            for tpl_name, tpl_slug, tpl_order, tpl_prompt in template_defs:
                await db.execute(
                    text("""
                        INSERT INTO deals.document_templates (id, tenant_id, investment_type_id, name, slug, prompt_template, is_system, sort_order, created_at, updated_at)
                        VALUES (:id, :tenant_id, :investment_type_id, :name, :slug, :prompt_template, true, :sort_order, NOW(), NOW())
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "tenant_id": str(ORG_ID),
                        "investment_type_id": str(it_id),
                        "name": tpl_name,
                        "slug": tpl_slug,
                        "prompt_template": tpl_prompt,
                        "sort_order": tpl_order,
                    },
                )

        # --- Mandates ---
        mandates = [
            {
                "id": str(MANDATE_GROWTH_ID),
                "name": "Growth Equity Mandate 2026",
                "status": "active",
                "target_allocation": 50_000_000,
                "expected_return": "15%+ IRR",
                "time_horizon": "5-7 years",
                "investment_types": ["fund", "co-investment", "direct"],
                "asset_allocation": json.dumps([
                    {"assetClass": "Private Equity", "allocationPct": 40, "targetReturn": "15%+"},
                    {"assetClass": "Venture Capital", "allocationPct": 30, "targetReturn": "20%+"},
                    {"assetClass": "Real Estate", "allocationPct": 20, "targetReturn": "12%+"},
                    {"assetClass": "Private Debt", "allocationPct": 10, "targetReturn": "8%+"},
                ]),
                "target_sectors": ["Technology", "Healthcare", "Financial Services"],
                "geographic_focus": ["North America", "Europe"],
                "created_by": str(USMAN_ID),
            },
            {
                "id": str(MANDATE_REAL_ID),
                "name": "Real Assets Fund II",
                "status": "active",
                "target_allocation": 100_000_000,
                "expected_return": "10%+ IRR / 6%+ yield",
                "time_horizon": "3-10 years",
                "investment_types": ["fund", "direct"],
                "asset_allocation": json.dumps([
                    {"assetClass": "Real Estate", "allocationPct": 50, "targetReturn": "10%+"},
                    {"assetClass": "Infrastructure", "allocationPct": 30, "targetReturn": "9%+"},
                    {"assetClass": "Private Debt", "allocationPct": 20, "targetReturn": "7%+"},
                ]),
                "target_sectors": ["Real Estate", "Infrastructure", "Energy"],
                "geographic_focus": ["Middle East & Africa", "Asia-Pacific"],
                "created_by": str(USMAN_ID),
            },
        ]

        for m in mandates:
            await db.execute(
                text("""
                    INSERT INTO deals.mandates (id, tenant_id, name, status, target_allocation, expected_return, time_horizon, investment_types, asset_allocation, target_sectors, geographic_focus, created_by, created_at, updated_at)
                    VALUES (:id, :tenant_id, :name, :status, :target_allocation, :expected_return, :time_horizon, :investment_types, :asset_allocation::jsonb, :target_sectors, :geographic_focus, :created_by, NOW(), NOW())
                """),
                {"tenant_id": str(ORG_ID), **m},
            )

        # --- Asset Managers ---
        asset_managers = [
            {
                "id": str(AM_ABINGWORTH_ID),
                "name": "Abingworth",
                "type": "Venture Capital",
                "location": "United States / Europe",
                "description": "Life sciences and biotech-focused venture capital firm with deep sector expertise across therapeutics, diagnostics, and medtech.",
                "fund_info": json.dumps({"fundSize": "$600M", "vintage": "2024", "fundName": "Abingworth Bioequities Fund VI"}),
                "firm_info": json.dumps({"founded": "1973", "aum": "$2.5B", "headquarters": "London / Boston"}),
                "strategy": json.dumps({"focus": "Life Sciences", "stages": ["Series A", "Series B", "Growth"]}),
                "characteristics": json.dumps({"sectors": ["Biotechnology", "Healthcare", "MedTech"], "geography": ["US", "Europe"]}),
            },
            {
                "id": str(AM_BLACKSTONE_ID),
                "name": "Blackstone Real Estate",
                "type": "Real Estate",
                "location": "Global",
                "description": "World's largest commercial real estate owner, investing across logistics, residential, office, and hospitality sectors globally.",
                "fund_info": json.dumps({"fundSize": "$30B", "vintage": "2023", "fundName": "Blackstone Real Estate Partners X"}),
                "firm_info": json.dumps({"founded": "1985", "aum": "$330B+", "headquarters": "New York"}),
                "strategy": json.dumps({"focus": "Real Estate", "stages": ["Value-Add", "Opportunistic", "Core Plus"]}),
                "characteristics": json.dumps({"sectors": ["Logistics", "Residential", "Office", "Hospitality"], "geography": ["Global"]}),
            },
            {
                "id": str(AM_SEQUOIA_ID),
                "name": "Sequoia Capital",
                "type": "Venture Capital",
                "location": "United States / India / Southeast Asia",
                "description": "Premier technology venture capital firm backing category-defining companies from seed through growth stage across global markets.",
                "fund_info": json.dumps({"fundSize": "$15B+", "vintage": "2024", "fundName": "Sequoia Capital Fund"}),
                "firm_info": json.dumps({"founded": "1972", "aum": "$85B+", "headquarters": "Menlo Park, CA"}),
                "strategy": json.dumps({"focus": "Technology", "stages": ["Seed", "Series A", "Growth"]}),
                "characteristics": json.dumps({"sectors": ["Technology", "Enterprise Software", "Fintech", "AI/ML"], "geography": ["US", "India", "Southeast Asia"]}),
            },
        ]

        for am in asset_managers:
            await db.execute(
                text("""
                    INSERT INTO deals.asset_managers (id, tenant_id, name, type, location, description, fund_info, firm_info, strategy, characteristics, created_by_type, created_at, updated_at)
                    VALUES (:id, :tenant_id, :name, :type, :location, :description, :fund_info::jsonb, :firm_info::jsonb, :strategy::jsonb, :characteristics::jsonb, 'system', NOW(), NOW())
                """),
                {"tenant_id": str(ORG_ID), **am},
            )

        # --- Opportunities ---
        opportunities = [
            # Active — assigned to John, linked to Abingworth, Fund type
            {
                "id": str(OPP_1_ID),
                "name": "Abingworth Bioequities Fund VI",
                "investment_type_id": str(IT_FUND_ID),
                "pipeline_status": "active",
                "asset_manager_id": str(AM_ABINGWORTH_ID),
                "assigned_to": str(JOHN_ID),
                "snapshot_data": json.dumps({
                    "Deal Name": "Abingworth Bioequities Fund VI",
                    "Fund Manager/GP": "Abingworth LLP",
                    "Fund Strategy": "Venture Capital",
                    "Geographic Focus": ["United States", "Europe"],
                    "Target Fund Size": 600000000,
                    "Management Fee": 2.0,
                    "Carried Interest": 20.0,
                    "Target Net IRR": 25.0,
                }),
                "source_type": "email",
                "mandate_fits": json.dumps([
                    {"mandateId": str(MANDATE_GROWTH_ID), "fitScore": "strong", "reasoning": "Biotech/healthcare VC aligns with Growth Equity mandate sector focus and return targets."},
                ]),
                "created_by": str(RAOOF_ID),
            },
            # Active — assigned to Pine, linked to Blackstone, Direct type
            {
                "id": str(OPP_2_ID),
                "name": "Blackstone Logistics Portfolio — MENA",
                "investment_type_id": str(IT_DIRECT_ID),
                "pipeline_status": "active",
                "asset_manager_id": str(AM_BLACKSTONE_ID),
                "assigned_to": str(PINE_ID),
                "snapshot_data": json.dumps({
                    "Deal Name": "Blackstone Logistics Portfolio — MENA",
                    "Target Company": "MENA Logistics HoldCo",
                    "Transaction Type": "Acquisition",
                    "Industry/Sector": "Real Estate / Logistics",
                    "Enterprise Value": 250000000,
                    "LTM Revenue": 45000000,
                    "LTM EBITDA": 22000000,
                    "EV/EBITDA Multiple": 11.4,
                }),
                "source_type": "manual",
                "mandate_fits": json.dumps([
                    {"mandateId": str(MANDATE_REAL_ID), "fitScore": "strong", "reasoning": "MENA logistics real estate directly aligns with Real Assets Fund II geographic and sector targets."},
                ]),
                "created_by": str(PINE_ID),
            },
            # New — unassigned, with mandate fit
            {
                "id": str(OPP_3_ID),
                "name": "Sequoia Growth Fund — Series D Co-Invest",
                "investment_type_id": str(IT_COINVEST_ID),
                "pipeline_status": "new",
                "asset_manager_id": str(AM_SEQUOIA_ID),
                "assigned_to": None,
                "snapshot_data": json.dumps({
                    "Deal Name": "Sequoia Growth Fund — Series D Co-Invest",
                    "Target Company": "TechCo AI",
                    "Lead GP/Sponsor": "Sequoia Capital",
                    "Co-Investment Equity Available": 50000000,
                }),
                "source_type": "email",
                "mandate_fits": json.dumps([
                    {"mandateId": str(MANDATE_GROWTH_ID), "fitScore": "moderate", "reasoning": "Technology co-invest fits Growth Equity mandate sector but co-investment type adds complexity."},
                ]),
                "created_by": None,
            },
            # New — unassigned, no mandate fit
            {
                "id": str(OPP_4_ID),
                "name": "Emerging Markets Credit Opportunity",
                "investment_type_id": str(IT_OTHER_ID),
                "pipeline_status": "new",
                "asset_manager_id": None,
                "assigned_to": None,
                "snapshot_data": json.dumps({
                    "Deal Name": "Emerging Markets Credit Opportunity",
                    "Investment Type": "Structured Credit",
                    "Counterparty/Issuer": "EM Capital Partners",
                    "Description": "Structured credit facility targeting emerging market corporate issuers with investment-grade adjacent profiles.",
                }),
                "source_type": "manual",
                "mandate_fits": json.dumps([]),
                "created_by": str(RAOOF_ID),
            },
            # Archived
            {
                "id": str(OPP_5_ID),
                "name": "Nordic Timber Fund III",
                "investment_type_id": str(IT_FUND_ID),
                "pipeline_status": "archived",
                "asset_manager_id": None,
                "assigned_to": str(JOHN_ID),
                "snapshot_data": json.dumps({
                    "Deal Name": "Nordic Timber Fund III",
                    "Fund Manager/GP": "Nordic Forest Capital",
                    "Fund Strategy": "Natural Resources",
                    "Target Fund Size": 400000000,
                }),
                "source_type": "email",
                "mandate_fits": json.dumps([]),
                "created_by": str(JOHN_ID),
            },
            # Ignored
            {
                "id": str(OPP_6_ID),
                "name": "Crypto Yield Arbitrage Vehicle",
                "investment_type_id": str(IT_OTHER_ID),
                "pipeline_status": "ignored",
                "asset_manager_id": None,
                "assigned_to": None,
                "snapshot_data": json.dumps({
                    "Deal Name": "Crypto Yield Arbitrage Vehicle",
                    "Investment Type": "Digital Assets",
                    "Counterparty/Issuer": "DeFi Capital Ltd",
                    "Description": "Algorithmic yield arbitrage strategy across decentralized finance protocols.",
                }),
                "source_type": "email",
                "mandate_fits": json.dumps([]),
                "created_by": None,
            },
        ]

        for opp in opportunities:
            await db.execute(
                text("""
                    INSERT INTO deals.opportunities (id, tenant_id, name, investment_type_id, pipeline_status, asset_manager_id, assigned_to, snapshot_data, source_type, mandate_fits, created_by, created_at, updated_at)
                    VALUES (:id, :tenant_id, :name, :investment_type_id, :pipeline_status, :asset_manager_id, :assigned_to, :snapshot_data::jsonb, :source_type, :mandate_fits::jsonb, :created_by, NOW(), NOW())
                """),
                {"tenant_id": str(ORG_ID), **opp},
            )

        await db.execute(text("SET session_replication_role = 'origin'"))
        await db.commit()

    await engine.dispose()
    print("Seed complete!")
    print(f"  Organization: Watar Partners ({ORG_ID})")
    print(f"  Users: 5 (login with raoof@watar.com / password123)")
    print(f"  Invitations: 2 pending")
    print(f"  Deals: 4 investment types, 20 document templates, 2 mandates, 3 asset managers, 6 opportunities")


if __name__ == "__main__":
    asyncio.run(seed())
