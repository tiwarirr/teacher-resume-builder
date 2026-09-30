from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_user, get_owned_resume
from app.models import CoverLetter, User
from app.schemas.ai import CoverLetterRequest
from app.schemas.cover_letter_api import CoverLetterDetail, CoverLetterUpdateRequest
from app.schemas.resume_content import ResumeContent
from app.services import ai_service, usage_limits

router = APIRouter(tags=["cover-letters"])


def _get_owned_cover_letter(cover_letter_id: str, user: User, session: Session) -> CoverLetter:
    letter = session.get(CoverLetter, cover_letter_id)
    if letter is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cover letter not found")
    get_owned_resume(letter.resume_version_id, user, session)  # raises 404 if not owned
    return letter


@router.post("/resumes/{resume_id}/cover-letters", response_model=CoverLetterDetail, status_code=status.HTTP_201_CREATED)
def generate_cover_letter(
    resume_id: str,
    body: CoverLetterRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> CoverLetter:
    resume = get_owned_resume(resume_id, current_user, session)
    usage_limits.check_usage_allowed(current_user, "cover_letter", session)

    content = ResumeContent.model_validate(resume.content)
    try:
        result, tokens_in, tokens_out = ai_service.generate_cover_letter(
            content, body.kind, body.job_description_text, body.tone
        )
    except RuntimeError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e))

    usage_limits.log_usage(
        current_user,
        "cover_letter",
        tokens_in,
        tokens_out,
        tokens_in * ai_service.TAILOR_COST_PER_TOKEN_IN + tokens_out * ai_service.TAILOR_COST_PER_TOKEN_OUT,
        session,
    )

    letter = CoverLetter(resume_version_id=resume.id, kind=body.kind, content=result.content)
    session.add(letter)
    session.commit()
    session.refresh(letter)
    return letter


@router.get("/resumes/{resume_id}/cover-letters", response_model=list[CoverLetterDetail])
def list_cover_letters(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[CoverLetter]:
    get_owned_resume(resume_id, current_user, session)
    statement = (
        select(CoverLetter).where(CoverLetter.resume_version_id == resume_id).order_by(CoverLetter.created_at.desc())
    )
    return list(session.exec(statement))


@router.put("/cover-letters/{cover_letter_id}", response_model=CoverLetterDetail)
def update_cover_letter(
    cover_letter_id: str,
    body: CoverLetterUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> CoverLetter:
    letter = _get_owned_cover_letter(cover_letter_id, current_user, session)
    letter.content = body.content
    letter.updated_at = datetime.now(timezone.utc)
    session.add(letter)
    session.commit()
    session.refresh(letter)
    return letter


@router.delete("/cover-letters/{cover_letter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cover_letter(
    cover_letter_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    letter = _get_owned_cover_letter(cover_letter_id, current_user, session)
    session.delete(letter)
    session.commit()
