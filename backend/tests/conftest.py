"""Pytest fixtures — isolated SQLite DB so tests never touch real data.

Environment is configured *before* importing the app, so `Settings()` picks up
the throwaway database and upload dir.
"""
import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="judge_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP}/test.db"
os.environ["UPLOAD_DIR"] = os.path.join(_TMP, "uploads")
os.environ["USE_CELERY"] = "false"
os.environ["RUN_TEAM_TESTS"] = "false"
os.environ["SECRET_KEY"] = "test-secret-key"

import pytest                       # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app           # noqa: E402  (import triggers create_all on the test DB)
from app.database import SessionLocal  # noqa: E402
from app import models             # noqa: E402
from app.auth import hash_password  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def make_user():
    """Create a user with an arbitrary role directly in the DB (public
    registration only yields participants)."""
    def _make(email, role="participant", password="password", first="Тест", last="Юзер"):
        db = SessionLocal()
        try:
            existing = db.query(models.User).filter_by(email=email).first()
            if existing:
                return existing
            u = models.User(
                email=email, password_hash=hash_password(password),
                first_name=first, last_name=last, role=role,
            )
            db.add(u)
            db.commit()
            db.refresh(u)
            return u
        finally:
            db.close()
    return _make


@pytest.fixture
def auth_headers(client):
    def _headers(email, password="password"):
        r = client.post("/api/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['token']}"}
    return _headers
