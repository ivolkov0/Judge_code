from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import auth, teams, submissions, evaluations, leaderboard, algo, cases, criteria, analytics, checklist
from .config import settings
from .migrate import run_migrations
import os

Base.metadata.create_all(bind=engine)
run_migrations(engine)

app = FastAPI(title="Judge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(teams.router)
app.include_router(submissions.router)
app.include_router(evaluations.router)
app.include_router(leaderboard.router)
app.include_router(algo.router)
app.include_router(cases.router)
app.include_router(criteria.router)
app.include_router(analytics.router)
app.include_router(checklist.router)

os.makedirs(settings.upload_dir, exist_ok=True)

if os.path.exists(settings.upload_dir):
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/api/health")
def health():
    return {"status": "ok"}
