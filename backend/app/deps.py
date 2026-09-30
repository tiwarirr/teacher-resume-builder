from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel import Session

from app.db import get_session
from app.models import ResumeVersion, User
from app.security import decode_access_token

SESSION_COOKIE_NAME = "session"


def get_current_user(
    session: Session = Depends(get_session),
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
) -> User:
    if session_token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    user_id = decode_access_token(session_token)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")

    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")

    return user


def get_owned_resume(resume_id: str, user: User, session: Session) -> ResumeVersion:
    resume = session.get(ResumeVersion, resume_id)
    if resume is None or resume.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Resume not found")
    return resume
