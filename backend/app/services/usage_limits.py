"""Free-tier monthly caps on AI features, enforced server-side before any paid
API call goes out - the concrete implementation of the "AI cost per user" risk
called out in the project plan.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session, func, select

from app.models import AIUsageLog, Subscription, User

FREE_TIER_MONTHLY_LIMITS = {
    "bullet_rewrite": 5,
    "tailor": 3,
    "cover_letter": 3,
}

FEATURE_LABELS = {
    "bullet_rewrite": "AI rewrites",
    "tailor": "job-tailoring analyses",
    "cover_letter": "cover letter generations",
}


def _month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def check_usage_allowed(user: User, feature: str, session: Session) -> None:
    subscription = session.exec(select(Subscription).where(Subscription.user_id == user.id)).first()
    plan = subscription.plan if subscription else "free"
    if plan != "free":
        return

    limit = FREE_TIER_MONTHLY_LIMITS[feature]
    count = session.exec(
        select(func.count()).where(
            AIUsageLog.user_id == user.id,
            AIUsageLog.feature == feature,
            AIUsageLog.created_at >= _month_start(),
        )
    ).one()
    if count >= limit:
        label = FEATURE_LABELS[feature]
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            f"You've used your {limit} free {label} this month. Upgrade to Pro for unlimited AI.",
        )


def log_usage(user: User, feature: str, tokens_in: int, tokens_out: int, est_cost_usd: float, session: Session) -> None:
    session.add(
        AIUsageLog(
            user_id=user.id,
            feature=feature,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            est_cost_usd=est_cost_usd,
        )
    )
    session.commit()
