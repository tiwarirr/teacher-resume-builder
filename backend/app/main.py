from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import settings
from app.db import init_db
from app.routers import ai, auth, cover_letters, resumes
from app.sample_data import SAMPLE_RESUME_CONTEXT
from app.services.render_service import render_resume_pdf


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Teacher Resume Builder API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(ai.router)
app.include_router(cover_letters.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/sample-pdf")
def sample_pdf() -> Response:
    """M0 smoke test: proves Jinja2 -> Typst -> PDF works end to end."""
    pdf_bytes = render_resume_pdf("classic", SAMPLE_RESUME_CONTEXT)
    return Response(content=pdf_bytes, media_type="application/pdf")
