import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    UUID,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
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


class NewsItem(Base, TenantMixin, TimestampMixin):
    __tablename__ = "news_items"
    __table_args__ = (
        Index("ix_news_items_tenant", "tenant_id"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    headline: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    full_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    opportunity_links: Mapped[list["NewsOpportunityLink"]] = relationship(
        back_populates="news_item", cascade="all, delete-orphan", lazy="selectin"
    )


class NewsOpportunityLink(Base):
    __tablename__ = "news_opportunity_links"
    __table_args__ = {"schema": "deals"}

    news_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("deals.news_items.id", ondelete="CASCADE"), primary_key=True)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("deals.opportunities.id", ondelete="CASCADE"), primary_key=True)

    news_item: Mapped["NewsItem"] = relationship(back_populates="opportunity_links")
    opportunity: Mapped["Opportunity"] = relationship()


class SourceFile(Base, TenantMixin, TimestampMixin):
    __tablename__ = "source_files"
    __table_args__ = (
        Index("ix_source_files_opportunity", "opportunity_id"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.opportunities.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    vector_store_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    processed: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    source_origin: Mapped[str | None] = mapped_column(String(20), nullable=True)


class Document(Base, TenantMixin, TimestampMixin):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_opportunity", "opportunity_id"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.opportunities.id", ondelete="CASCADE"),
        nullable=False,
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.document_templates.id"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), server_default="draft", nullable=False)
    version: Mapped[int] = mapped_column(Integer, server_default="1", nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class DocumentReview(Base, TenantMixin):
    __tablename__ = "document_reviews"
    __table_args__ = (
        Index("ix_document_reviews_reviewer_status", "reviewer_id", "status"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    requested_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), server_default="pending", nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    rationale_generated: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["DocumentReviewItem"]] = relationship(
        back_populates="review", cascade="all, delete-orphan", lazy="selectin"
    )


class DocumentReviewItem(Base):
    __tablename__ = "document_review_items"
    __table_args__ = (
        UniqueConstraint("review_id", "document_id", name="uq_document_review_items_review_document"),
        {"schema": "deals"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.document_reviews.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.documents.id", ondelete="CASCADE"),
        nullable=False,
    )

    review: Mapped["DocumentReview"] = relationship(back_populates="items")
    document: Mapped["Document"] = relationship()


class DocumentShare(Base, TenantMixin):
    __tablename__ = "document_shares"
    __table_args__ = {"schema": "deals"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deals.documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    shared_with: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    shared_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    permission: Mapped[str] = mapped_column(String(20), server_default="comment", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
