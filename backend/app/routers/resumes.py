from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlmodel import Session, select

from app.db import get_session
from app.deps import get_current_user, get_owned_resume
from app.models import JobTailoringSession, ResumeVersion, User
from app.schemas.ai import TailorRequest, TailorResponse, TailoringSessionSummary
from app.schemas.resume_api import (
    ResumeCreateRequest,
    ResumeDetail,
    ResumeSummary,
    ResumeUpdateRequest,
)
from app.schemas.resume_content import ResumeContent
from app.services import ai_service, usage_limits
from app.services.render_service import VALID_TEMPLATES, render_resume_content

router = APIRouter(prefix="/resumes", tags=["resumes"])
_get_owned_resume = get_owned_resume  # local alias, keeps call sites below unchanged


@router.get("", response_model=list[ResumeSummary])
def list_resumes(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
) -> list[ResumeVersion]:
    statement = (
        select(ResumeVersion)
        .where(ResumeVersion.user_id == current_user.id)
        .order_by(ResumeVersion.updated_at.desc())
    )
    return list(session.exec(statement))


@router.post("", response_model=ResumeDetail, status_code=status.HTTP_201_CREATED)
def create_resume(
    body: ResumeCreateRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ResumeVersion:
    resume = ResumeVersion(
        user_id=current_user.id,
        name=body.name,
        template=body.template,
        language=body.language,
        mode=body.mode,
        content=body.content.model_dump(),
    )
    session.add(resume)
    session.commit()
    session.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=ResumeDetail)
def get_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ResumeVersion:
    return _get_owned_resume(resume_id, current_user, session)


@router.put("/{resume_id}", response_model=ResumeDetail)
def update_resume(
    resume_id: str,
    body: ResumeUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ResumeVersion:
    resume = _get_owned_resume(resume_id, current_user, session)

    updates = body.model_dump(exclude_unset=True, exclude={"content"})
    for field, value in updates.items():
        setattr(resume, field, value)
    if body.content is not None:
        resume.content = body.content.model_dump()
    resume.updated_at = datetime.now(timezone.utc)

    session.add(resume)
    session.commit()
    session.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    resume = _get_owned_resume(resume_id, current_user, session)
    session.delete(resume)
    session.commit()


@router.get("/{resume_id}/pdf")
def get_resume_pdf(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Response:
    resume = _get_owned_resume(resume_id, current_user, session)
    if resume.template not in VALID_TEMPLATES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Template '{resume.template}' isn't available yet. Available: {sorted(VALID_TEMPLATES)}",
        )

    content = ResumeContent.model_validate(resume.content)
    pdf_bytes = render_resume_content(resume.template, content, resume.language)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{resume.name}.pdf"'},
    )


@router.post("/{resume_id}/tailor", response_model=TailorResponse)
def tailor_resume(
    resume_id: str,
    body: TailorRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> TailorResponse:
    resume = _get_owned_resume(resume_id, current_user, session)
    usage_limits.check_usage_allowed(current_user, "tailor", session)

    content = ResumeContent.model_validate(resume.content)
    try:
        result, tokens_in, tokens_out = ai_service.tailor_resume(content, body.job_description_text)
    except RuntimeError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e))

    usage_limits.log_usage(
        current_user,
        "tailor",
        tokens_in,
        tokens_out,
        tokens_in * ai_service.TAILOR_COST_PER_TOKEN_IN + tokens_out * ai_service.TAILOR_COST_PER_TOKEN_OUT,
        session,
    )

    session.add(
        JobTailoringSession(
            resume_version_id=resume.id,
            job_description_text=body.job_description_text,
            match_score=result.match_score,
            gaps=result.gaps,
            reorder_suggestions=result.reorder_suggestions,
        )
    )
    session.commit()

    return result


@router.get("/{resume_id}/tailoring-sessions", response_model=list[TailoringSessionSummary])
def list_tailoring_sessions(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[JobTailoringSession]:
    _get_owned_resume(resume_id, current_user, session)
    statement = (
        select(JobTailoringSession)
        .where(JobTailoringSession.resume_version_id == resume_id)
        .order_by(JobTailoringSession.created_at.desc())
    )
    return list(session.exec(statement))


@router.post("/{resume_id}/duplicate", response_model=ResumeDetail, status_code=status.HTTP_201_CREATED)
def duplicate_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ResumeVersion:
    original = _get_owned_resume(resume_id, current_user, session)
    copy = ResumeVersion(
        user_id=current_user.id,
        name=f"{original.name} (Copy)",
        template=original.template,
        language=original.language,
        mode=original.mode,
        content=original.content,
    )
    session.add(copy)
    session.commit()
    session.refresh(copy)
    return copy
