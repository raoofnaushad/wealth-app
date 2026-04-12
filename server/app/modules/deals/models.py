import uuid

from sqlalchemy import (
    ARRAY,
    UUID,
    Boolean,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TenantMixin, TimestampMixin


class InvestmentType(Base, TenantMixin, TimestampMixin):
    __tablename__ = "investment_types"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_investment_types_tenant_slug"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    snapshot_config: Mapped[dict] = mapped_column(JSONB, nullable=False)

    document_templates: Mapped[list["DocumentTemplate"]] = relationship(
        back_populates="investment_type", cascade="all, delete-orphan", lazy="selectin"
    )


class DocumentTemplate(Base, TenantMixin, TimestampMixin):
    __tablename__ = "document_templates"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "investment_type_id", "slug", name="uq_document_templates_tenant_type_slug"
        ),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investment_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.investment_types.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), nullable=False)
    prompt_template: Mapped[str] = mapped_column(Text, nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)

    investment_type: Mapped["InvestmentType"] = relationship(back_populates="document_templates")


class Mandate(Base, TenantMixin, TimestampMixin):
    __tablename__ = "mandates"
    __table_args__ = (
        Index("ix_mandates_tenant_status", "tenant_id", "status"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), server_default="draft", nullable=False)
    target_allocation: Mapped[float | None] = mapped_column(Numeric(20, 2), nullable=True)
    expected_return: Mapped[str | None] = mapped_column(String(100), nullable=True)
    time_horizon: Mapped[str | None] = mapped_column(String(100), nullable=True)
    investment_types: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    asset_allocation: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    target_sectors: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    geographic_focus: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    investment_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    investment_constraints: Mapped[str | None] = mapped_column(Text, nullable=True)
    investment_strategy: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class AssetManager(Base, TenantMixin, TimestampMixin):
    __tablename__ = "asset_managers"
    __table_args__ = (
        Index("ix_asset_managers_tenant", "tenant_id"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fund_info: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    firm_info: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    strategy: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    characteristics: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    created_by_type: Mapped[str] = mapped_column(String(50), server_default="system", nullable=False)


class Opportunity(Base, TenantMixin, TimestampMixin):
    __tablename__ = "opportunities"
    __table_args__ = (
        Index("ix_opportunities_tenant_pipeline", "tenant_id", "pipeline_status"),
        Index("ix_opportunities_tenant_assigned", "tenant_id", "assigned_to"),
        Index("ix_opportunities_asset_manager", "asset_manager_id"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    investment_type_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.investment_types.id"),
        nullable=True,
    )
    pipeline_status: Mapped[str] = mapped_column(String(20), server_default="new", nullable=False)
    asset_manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.asset_managers.id"),
        nullable=True,
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    snapshot_data: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    snapshot_citations: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), server_default="manual", nullable=False)
    source_email_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    mandate_fits: Mapped[list] = mapped_column(JSONB, server_default="[]", nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    investment_type: Mapped["InvestmentType | None"] = relationship(lazy="selectin")
    asset_manager: Mapped["AssetManager | None"] = relationship(lazy="selectin")
