from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.resume_content import ResumeContent


class ResumeCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    template: str = "classic"
    language: str = "en"
    mode: str = "experienced"
    content: ResumeContent = Field(default_factory=ResumeContent)


class ResumeUpdateRequest(BaseModel):
    name: str | None = None
    template: str | None = None
    language: str | None = None
    mode: str | None = None
    content: ResumeContent | None = None


class ResumeSummary(BaseModel):
    id: str
    name: str
    template: str
    language: str
    mode: str
    updated_at: datetime


class ResumeDetail(ResumeSummary):
    content: ResumeContent
    created_at: datetime
