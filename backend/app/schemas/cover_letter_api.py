from datetime import datetime

from pydantic import BaseModel


class CoverLetterDetail(BaseModel):
    id: str
    resume_version_id: str
    kind: str
    content: str
    created_at: datetime
    updated_at: datetime


class CoverLetterUpdateRequest(BaseModel):
    content: str
