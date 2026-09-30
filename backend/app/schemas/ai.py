from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class BulletRewriteRequest(BaseModel):
    raw_duty_text: str
    subject: str = ""
    board: str = ""
    classes_taught: list[str] = []


class BulletRewriteResponse(BaseModel):
    rewritten: str
    missing_info: list[str]
    has_unverified_numbers: bool


class TailorRequest(BaseModel):
    job_description_text: str


class TailorResponse(BaseModel):
    match_score: int
    gaps: list[str]
    reorder_suggestions: list[str]


class TailoringSessionSummary(TailorResponse):
    id: str
    job_description_text: str
    created_at: datetime


class CoverLetterRequest(BaseModel):
    kind: Literal["cover_letter", "teaching_philosophy"] = "cover_letter"
    job_description_text: str = ""
    tone: Literal["formal", "warm", "confident"] = "formal"


class CoverLetterResponse(BaseModel):
    content: str
