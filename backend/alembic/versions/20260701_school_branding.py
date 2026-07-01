"""Add website and branding colors to schools

Revision ID: 20260701_school_branding
Revises: 
Create Date: 2026-07-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260701_school_branding"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("schools", sa.Column("website_url", sa.String(length=500), nullable=True))
    op.add_column("schools", sa.Column("logo_url", sa.String(length=500), nullable=True))
    op.add_column(
        "schools",
        sa.Column("primary_color", sa.String(length=20), nullable=False, server_default=sa.text("'#2563EB'")),
    )
    op.add_column(
        "schools",
        sa.Column("secondary_color", sa.String(length=20), nullable=False, server_default=sa.text("'#1E40AF'")),
    )
    op.add_column(
        "schools",
        sa.Column("accent_color", sa.String(length=20), nullable=False, server_default=sa.text("'#FFFFFF'")),
    )


def downgrade() -> None:
    op.drop_column("schools", "accent_color")
    op.drop_column("schools", "secondary_color")
    op.drop_column("schools", "primary_color")
    op.drop_column("schools", "logo_url")
    op.drop_column("schools", "website_url")
