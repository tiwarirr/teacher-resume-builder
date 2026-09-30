from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, select

from app.config import settings
from app.db import get_session
from app.deps import SESSION_COOKIE_NAME, get_current_user
from app.models import Subscription, User
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

COOKIE_MAX_AGE_SECONDS = settings.jwt_expire_minutes * 60


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    created_at: datetime


def _set_session_cookie(response: Response, user_id: str) -> None:
    token = create_access_token(user_id)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        # In production the frontend and backend are on different sites, so the
        # cookie needs SameSite=None (which browsers only honour alongside
        # Secure) to be sent on cross-site fetches at all. Locally, Lax +
        # non-Secure is what lets this work over plain http://localhost.
        samesite="none" if settings.is_production else "lax",
        secure=settings.is_production,
        max_age=COOKIE_MAX_AGE_SECONDS,
        path="/",
    )


@router.post("/signup", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, response: Response, session: Session = Depends(get_session)) -> User:
    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    user = User(email=body.email, password_hash=hash_password(body.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    session.add(Subscription(user_id=user.id, plan="free"))
    session.commit()

    _set_session_cookie(response, user.id)
    return user


@router.post("/login", response_model=UserPublic)
def login(body: LoginRequest, response: Response, session: Session = Depends(get_session)) -> User:
    user = session.exec(select(User).where(User.email == body.email)).first()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    _set_session_cookie(response, user.id)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(
        SESSION_COOKIE_NAME,
        path="/",
        samesite="none" if settings.is_production else "lax",
        secure=settings.is_production,
    )


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
