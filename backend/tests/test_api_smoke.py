"""Broad endpoint smoke across all roles — nothing should return a 5xx."""
import pytest

ROLE_ENDPOINTS = {
    "participant": [
        "/api/auth/me", "/api/submissions", "/api/submissions/checks",
        "/api/leaderboard", "/api/cases", "/api/criteria", "/api/algo/problems",
    ],
    "jury": [
        "/api/auth/me", "/api/evaluations", "/api/analytics/overview",
        "/api/analytics/notifications", "/api/leaderboard", "/api/algo/problems",
    ],
    "organizer": [
        "/api/auth/me", "/api/teams", "/api/analytics/overview",
        "/api/analytics/notifications", "/api/leaderboard", "/api/cases",
        "/api/criteria", "/api/checklist", "/api/algo/problems",
    ],
}


@pytest.mark.parametrize("role", list(ROLE_ENDPOINTS))
def test_no_5xx_for_role(role, client, make_user, auth_headers):
    make_user(f"smoke_{role}@test.ru", role=role)
    H = auth_headers(f"smoke_{role}@test.ru")
    for ep in ROLE_ENDPOINTS[role]:
        r = client.get(ep, headers=H)
        assert r.status_code < 500, f"{role} {ep} -> {r.status_code}: {r.text[:120]}"


def test_unauthenticated_me_rejected(client):
    assert client.get("/api/auth/me").status_code == 401
