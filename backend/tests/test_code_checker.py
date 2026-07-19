"""Code checker — local-directory structure & secret scanning (no network)."""
from app.checks.code_checker import check_local_dir


def test_structure_detected(tmp_path):
    (tmp_path / "README.md").write_text("# Project\nrun: docker compose up", encoding="utf-8")
    (tmp_path / "requirements.txt").write_text("fastapi\n", encoding="utf-8")
    (tmp_path / ".gitignore").write_text("__pycache__/\n", encoding="utf-8")
    (tmp_path / "docker-compose.yml").write_text("services: {}\n", encoding="utf-8")
    (tmp_path / "main.py").write_text("print('hello world')\n" * 30, encoding="utf-8")

    r = check_local_dir(str(tmp_path))
    c = r["details"]["checks"]
    assert c["has_readme"] is True
    assert c["has_dependency_file"] is True
    assert c["dependency_file"] == "requirements.txt"
    assert c["has_run_instructions"] is True
    assert c["has_gitignore"] is True
    assert c["loc"] > 0
    assert r["passed"] is True  # readme + dependency file
    assert r["score"] > 0


def test_secret_detected(tmp_path):
    (tmp_path / "README.md").write_text("# x", encoding="utf-8")
    (tmp_path / "requirements.txt").write_text("fastapi\n", encoding="utf-8")
    (tmp_path / "settings.py").write_text('API_KEY = "abcdef1234567890secret"\n', encoding="utf-8")
    r = check_local_dir(str(tmp_path))
    assert r["details"]["checks"]["secrets_found"] >= 1


def test_empty_repo_not_passed(tmp_path):
    r = check_local_dir(str(tmp_path))
    assert r["passed"] is False
