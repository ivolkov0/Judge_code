"""Auth & profile: registration, login, /me, profile patch, password, RBAC."""
import uuid


def _email():
    return f"u_{uuid.uuid4().hex[:8]}@test.ru"


def test_register_creates_participant(client):
    email = _email()
    r = client.post("/api/auth/register", json={
        "email": email, "password": "pass123", "first_name": "Иван", "last_name": "Петров",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "participant"  # never self-elevate
    assert body["token"]


def test_login_wrong_password_rejected(client):
    email = _email()
    client.post("/api/auth/register", json={
        "email": email, "password": "pass123", "first_name": "A", "last_name": "B"})
    r = client.post("/api/auth/login", json={"email": email, "password": "WRONG"})
    assert r.status_code == 401


def test_profile_patch_persists(client):
    email = _email()
    tok = client.post("/api/auth/register", json={
        "email": email, "password": "pass123", "first_name": "A", "last_name": "B"}).json()["token"]
    H = {"Authorization": f"Bearer {tok}"}
    r = client.patch("/api/auth/me", headers=H, json={
        "city": "Самара", "age": 21, "skills": ["Python", "React"], "github": "octocat"})
    assert r.status_code == 200, r.text
    me = client.get("/api/auth/me", headers=H).json()
    assert me["city"] == "Самара"
    assert me["age"] == 21
    assert me["skills"] == ["Python", "React"]
    assert me["github"] == "octocat"


def test_password_change_flow(client):
    email = _email()
    tok = client.post("/api/auth/register", json={
        "email": email, "password": "pass123", "first_name": "A", "last_name": "B"}).json()["token"]
    H = {"Authorization": f"Bearer {tok}"}
    # wrong current password
    assert client.post("/api/auth/password", headers=H,
                       json={"current_password": "WRONG", "new_password": "newpass1"}).status_code == 400
    # too short
    assert client.post("/api/auth/password", headers=H,
                       json={"current_password": "pass123", "new_password": "123"}).status_code == 400
    # correct
    assert client.post("/api/auth/password", headers=H,
                       json={"current_password": "pass123", "new_password": "newpass1"}).status_code == 204
    # old password no longer works, new one does
    assert client.post("/api/auth/login", json={"email": email, "password": "pass123"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": "newpass1"}).status_code == 200


def test_rbac_participant_blocked_from_analytics(client, make_user, auth_headers):
    make_user("rbac_part@test.ru", role="participant")
    H = auth_headers("rbac_part@test.ru")
    # analytics/overview requires organizer|jury → participant must be forbidden
    assert client.get("/api/analytics/overview", headers=H).status_code == 403


def test_rbac_organizer_allowed_analytics(client, make_user, auth_headers):
    make_user("rbac_org@test.ru", role="organizer")
    H = auth_headers("rbac_org@test.ru")
    assert client.get("/api/analytics/overview", headers=H).status_code == 200
