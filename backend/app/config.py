from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # "development" (default) or "production". In production the frontend and
    # backend are on genuinely different sites (e.g. vercel.app / onrender.com),
    # so the session cookie needs SameSite=None + Secure to survive cross-site
    # fetches - see _set_session_cookie in routers/auth.py.
    environment: str = "development"

    # Defaults to a local SQLite file so the app runs with zero external setup.
    # Point this at a Postgres connection string (e.g. from Neon or Supabase)
    # for anything beyond local development - no code changes needed.
    database_url: str = "sqlite:///./dev.db"

    jwt_secret: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 14  # 14 days

    # OpenRouter (https://openrouter.ai) - OpenAI-compatible API that can route
    # to Claude, GPT, and other models with one key, handy for testing model choice.
    openrouter_api_key: str | None = None
    openrouter_model_bullet_rewrite: str = "anthropic/claude-haiku-4.5"
    openrouter_model_tailoring: str = "anthropic/claude-sonnet-5"

    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_price_id_pro: str | None = None

    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
