# Teacher Resume Builder

An AI resume builder built specifically for school teachers — subjects/boards/classes taught,
B.Ed/CTET/TET/NET, exam/administrative duties, co-curricular work — rather than generic
office-job resume fields.

**Live:** https://teacher-resume-builder.vercel.app (backend on Render free tier - the first
request after a while may take ~30-60s to wake up)

## Status

- [x] M0 - Backend scaffold + Typst render pipeline proven with a hardcoded sample
- [x] M1 - Auth + resume CRUD
- [x] M2 - Guided builder UI + first template, end to end
- [x] M3 - Remaining templates + Hindi/Devanagari support
- [x] M4 - AI bullet rewriting (via OpenRouter)
- [x] M5 - Job-description tailoring
- [x] M6 - Cover letter / teaching philosophy generator
- [x] M7 - Multi-version management (duplicate/rename/delete/compare)
- [x] M9 - Landing page + polish
- [x] M10 - Deployment (Vercel + Render + Neon, all free tier - see [DEPLOYMENT.md](DEPLOYMENT.md))
- [ ] M8 - Billing (Stripe test mode) - not started; app is fully usable without it, free-tier limits apply

## Repository layout

```
backend/    FastAPI app: auth, database, AI orchestration, PDF rendering (Typst)
  app/
    models.py               Database tables (SQLModel)
    schemas/                Pydantic request/response + the resume content schema
    routers/                auth, resumes, ai, cover_letters
    services/
      render_service.py     Jinja2 -> Typst -> PDF, template context, section-label translation
      ai_service.py          OpenRouter calls: bullet rewrite, job tailoring, cover letters
      usage_limits.py        Free-tier monthly AI usage caps
    templates/
      typst/                 4 templates: classic, modern, compact, academic (.typ.j2)
      fonts/                 Bundled Noto Sans / Noto Sans Devanagari / Noto Serif (see NOTICE.md)
frontend/   Next.js app
  src/app/                   Routes: landing page, signup/login, dashboard, resume editor,
                              tailor, cover-letter, compare
  src/components/            ResumeEditor, TailorPanel, CoverLetterPanel, Dialog, RequireAuth
  src/lib/                   API client, TypeScript types, auth context
```

## Running the backend

Requires Python 3.11+.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env
```

`DATABASE_URL` defaults to a local SQLite file, so no database setup is needed to get started.
Point it at a Postgres connection string (e.g. from [Neon](https://neon.tech)'s free tier)
whenever you're ready to move off SQLite - no code changes required.

For the AI features (bullet rewriting, job tailoring, cover letters), edit `.env` and set
`OPENROUTER_API_KEY` to a key from [openrouter.ai/keys](https://openrouter.ai/keys). Without it,
everything else still works - the AI features will show a clear "not configured" error instead of
crashing. If your OpenRouter account has no credit balance, you can point
`OPENROUTER_MODEL_BULLET_REWRITE` / `OPENROUTER_MODEL_TAILORING` at a free model instead (see the
comments in `.env.example`) - free models are noticeably less reliable at the "ask for a missing
number instead of guessing" guardrail than Claude, so switch back to the defaults before judging
real output quality.

Run the API:

```bash
uvicorn app.main:app --reload
# then visit http://localhost:8000/docs for interactive API docs
```

There's also a standalone smoke test of the render pipeline that doesn't need the server running:

```bash
python scripts/render_sample.py
# -> writes backend/output/sample.pdf
```

> **Note:** always use `localhost` (not `127.0.0.1`) for both the frontend and backend during
> local dev. Browsers treat them as different sites, which silently breaks the login cookie under
> `SameSite=Lax`.

## Running the frontend

Requires Node.js 20.9+.

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
# then visit http://localhost:3000
```

## Trying it out

With both servers running:

1. Sign up, then create a resume from the dashboard.
2. Fill in the guided form (Personal details through References) and click **Save & preview PDF**
   to see the rendered PDF update live. Switch the template/language/mode dropdowns to try Modern,
   Compact, Academic, and Hindi.
3. In Teaching Experience, type a plain duty and click **Rewrite with AI** - it turns it into an
   impact bullet, or asks a follow-up question if a metric is missing (free tier: 5 rewrites/month).
4. Click **Tailor to a job**, paste a job advertisement, and click **Analyze match** for a score,
   gaps, and reorder suggestions (free tier: 3/month).
5. Click **Cover letter**, generate a cover letter or teaching philosophy statement, edit it
   in-place, and copy it out (free tier: 3/month).
6. From the dashboard, tick two resumes and click **Compare selected** to see a side-by-side diff.

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full guide (Vercel + Render + Neon, all free tier).

## Environment variables

See `backend/.env.example` and `frontend/.env.local.example` for the full list with comments.
Nothing needs to be paid for to run the app locally - AI features degrade gracefully to a clear
error message if `OPENROUTER_API_KEY` isn't set.

## Licensing

MIT - see [LICENSE](LICENSE). This project's PDF-rendering approach was inspired by
[rendercv/rendercv](https://github.com/rendercv/rendercv) (MIT); see [NOTICE.md](NOTICE.md) for
attribution details, including the bundled Noto fonts (SIL Open Font License).
