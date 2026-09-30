"""The nested shape of a resume's actual content.

This is NOT a set of database tables - a whole resume version's content is
validated against this schema and then stored as one JSON blob on
ResumeVersion.content (see app/models.py). That keeps repeatable, freely
reorderable lists (several experience entries, each with several bullets)
simple to store and version, without a deep web of foreign-keyed tables for
an MVP. If the product needs to query inside this data at scale later, the
richest sub-entities (e.g. TeachingExperience) can be promoted to real tables.
"""

from typing import Literal

from pydantic import BaseModel, Field

Board = Literal["CBSE", "ICSE", "IB", "Cambridge", "State", "Other"]
Post = Literal["PGT", "TGT", "PRT", "Other"]
QualificationType = Literal["B.Ed", "M.Ed", "CTET", "TET", "NET", "D.El.Ed", "Other"]
Proficiency = Literal["basic", "intermediate", "advanced"]


class TeacherProfile(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    photo_url: str | None = None
    dob: str | None = None
    address: str | None = None
    languages: list[Literal["en", "hi"]] = Field(default_factory=lambda: ["en"])


class EducationEntry(BaseModel):
    degree: str
    institution: str
    board_or_university: str
    year: int
    score: str | None = None


class TeachingQualification(BaseModel):
    type: QualificationType
    issuing_body: str
    year: int
    score_or_paper: str | None = None


class ImpactBullet(BaseModel):
    raw_duty_text: str
    ai_rewritten_text: str | None = None
    has_verified_metric: bool = False

    @property
    def display_text(self) -> str:
        return self.ai_rewritten_text or self.raw_duty_text


class TeachingExperience(BaseModel):
    school: str
    board: Board
    post: Post
    subjects: list[str] = Field(default_factory=list)
    classes_taught: list[str] = Field(default_factory=list)
    dates: str = ""
    bullets: list[ImpactBullet] = Field(default_factory=list)


class AdministrativeRole(BaseModel):
    title: str
    duration: str = ""
    description: str = ""


class EdTechSkill(BaseModel):
    name: str
    proficiency: Proficiency = "intermediate"


class TrainingWorkshop(BaseModel):
    title: str
    organizer: str = ""
    date: str = ""
    hours: int | None = None


class Reference(BaseModel):
    name: str
    designation: str = ""
    school: str = ""
    contact: str | None = None


class ResumeContent(BaseModel):
    """The full nested content of one resume version."""

    profile: TeacherProfile = Field(default_factory=TeacherProfile)
    summary: str = ""
    education: list[EducationEntry] = Field(default_factory=list)
    qualifications: list[TeachingQualification] = Field(default_factory=list)
    experience: list[TeachingExperience] = Field(default_factory=list)
    admin_roles: list[AdministrativeRole] = Field(default_factory=list)
    edtech_skills: list[EdTechSkill] = Field(default_factory=list)
    trainings: list[TrainingWorkshop] = Field(default_factory=list)
    references: list[Reference] = Field(default_factory=list)
