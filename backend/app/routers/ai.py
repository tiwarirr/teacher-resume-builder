from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.db import get_session
from app.deps import get_current_user
from app.models import User
from app.schemas.ai import BulletRewriteRequest, BulletRewriteResponse
from app.services import ai_service, usage_limits

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/rewrite-bullet", response_model=BulletRewriteResponse)
def rewrite_bullet(
    body: BulletRewriteRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> BulletRewriteResponse:
    usage_limits.check_usage_allowed(current_user, "bullet_rewrite", session)

    try:
        result, tokens_in, tokens_out = ai_service.rewrite_bullet(
            body.raw_duty_text, body.subject, body.board, body.classes_taught
        )
    except RuntimeError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(e))

    usage_limits.log_usage(
        current_user,
        "bullet_rewrite",
        tokens_in,
        tokens_out,
        tokens_in * ai_service.BULLET_REWRITE_COST_PER_TOKEN_IN
        + tokens_out * ai_service.BULLET_REWRITE_COST_PER_TOKEN_OUT,
        session,
    )

    return result
