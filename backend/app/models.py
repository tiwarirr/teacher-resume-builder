import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class User(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=_now)


class ResumeVersion(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    name: str
    template: str = "classic"  # classic | modern | compact | academic (M3)
    language: str = "en"  # en | hi
    mode: str = "experienced"  # fresher | experienced | senior-leadership
    # Serialized app.schemas.resume_content.ResumeContent - see that module
    # for why this is one JSON blob rather than several normalised tables.
    content: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class JobTailoringSession(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    resume_version_id: str = Field(foreign_key="resumeversion.id", index=True)
    job_description_text: str
    match_score: int = 0
    gaps: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    reorder_suggestions: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_now)


class CoverLetter(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    resume_version_id: str = Field(foreign_key="resumeversion.id", index=True)
    kind: str = "cover_letter"  # cover_letter | teaching_philosophy
    content: str = ""
    created_at: datetime = Field(default_factory=_now)
    updated_at: datetime = Field(default_factory=_now)


class AIUsageLog(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    feature: str  # bullet_rewrite | tailor | cover_letter
    tokens_in: int = 0
    tokens_out: int = 0
    est_cost_usd: float = 0.0
    created_at: datetime = Field(default_factory=_now)


class Subscription(SQLModel, table=True):
    id: str = Field(default_factory=_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id", unique=True, index=True)
    plan: str = "free"  # free | pro
    status: str = "active"
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None
    renews_at: datetime | None = None
