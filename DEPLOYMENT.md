# Deployment guide

This gets the app live on the internet, all on free tiers: **Vercel** (frontend), **Render**
(backend, via the `render.yaml` Blueprint + `backend/Dockerfile` already in this repo), and
**Neon** (Postgres). You'll need to create accounts on these three services yourself - that's not
something that can be done on your behalf - but everything else is either already prepared in
this repo or can be done together.

## 1. Push this repo to GitHub

Needed because Render and Vercel both deploy by connecting to a GitHub repository.

## 2. Database: Neon (Postgres)

1. Sign up at [neon.tech](https://neon.tech) (free tier, no card required) and create a project.
2. Copy the connection string it gives you (starts with `postgresql://...`). Keep it handy for
   step 3.

No schema setup needed - the backend calls `SQLModel.metadata.create_all()` on startup, which
creates all tables automatically against a fresh database, same as it does with the local SQLite
file.

## 3. Backend: Render

1. Sign up at [render.com](https://render.com) (free tier).
2. New → **Blueprint**, connect this GitHub repo. Render reads `render.yaml` at the repo root
   and proposes a `teacher-resume-backend` web service built from `backend/Dockerfile`.
3. Before the first deploy, set these environment variables in the Render dashboard (the
   Blueprint marks them `sync: false`, meaning "you set this manually"):
   - `DATABASE_URL` - the Neon connection string from step 2
   - `OPENROUTER_API_KEY` - your OpenRouter key (optional - AI features degrade to a clear error
     without it)
   - `CORS_ORIGINS` - leave as `http://localhost:3000` for now; you'll update this in step 5
     once you have your Vercel URL
4. Deploy. Render builds the Docker image (Typst and the bundled fonts are baked in, so no
   further font setup is needed) and gives you a URL like `https://teacher-resume-backend.onrender.com`.
   Visit `<that-url>/health` to confirm it's up.

> **Free tier note:** Render's free web services spin down after 15 minutes of inactivity and
> take ~30-60 seconds to wake up on the next request. That's expected, not a bug - fine for an
> MVP/demo, worth upgrading to a paid instance before relying on it for real applications.

## 4. Frontend: Vercel

1. Sign up at [vercel.com](https://vercel.com) (free tier).
2. New Project → import this GitHub repo. Set **Root Directory** to `frontend` (important - the
   repo has both `backend/` and `frontend/` at the top level).
3. Add an environment variable: `NEXT_PUBLIC_API_URL` = your Render backend URL from step 3
   (e.g. `https://teacher-resume-backend.onrender.com`, no trailing slash).
4. Deploy. Vercel gives you a URL like `https://your-app.vercel.app`.

## 5. Close the loop: update CORS

Go back to the Render dashboard and set `CORS_ORIGINS` to your Vercel URL from step 4 (e.g.
`https://your-app.vercel.app`). Render redeploys automatically when you save an env var change.

## 6. Verify

Visit your Vercel URL, sign up, create a resume, and click "Save & preview PDF". If login
succeeds but every subsequent request comes back 401, the most likely cause is `CORS_ORIGINS` or
`NEXT_PUBLIC_API_URL` not matching exactly (protocol + host, no trailing slash) - the session
cookie is `SameSite=None; Secure` in production (see `ENVIRONMENT=production`, set automatically
by `render.yaml`), which needs both ends configured correctly to work at all.

## Optional: custom domain, Stripe, moving off free tiers

Not covered here - out of scope for the MVP. When you're ready: Render and Vercel both support
custom domains on paid plans; Stripe billing is milestone M8 (not yet built - see `README.md`).
