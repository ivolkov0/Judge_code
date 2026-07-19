"""Code repository checker.

Stage 1 (always): GitHub API — README, LICENSE, dependency file, run instructions,
                   .gitignore, secret-looking file names.
Stage 2 (if git available): clone repo, count LOC, run flake8 (Python), detect
                             hardcoded secrets via regex.
"""
import os
import re
import shutil
import subprocess
import tempfile
import zipfile

import httpx


DEPENDENCY_FILES = [
    "requirements.txt", "package.json", "pom.xml", "Cargo.toml",
    "go.mod", "build.gradle", "pyproject.toml", "composer.json",
    "Gemfile", "setup.py",
]

RUN_INSTRUCTION_FILES = [
    "Makefile", "makefile", "docker-compose.yml", "docker-compose.yaml",
    "Dockerfile", "run.sh", "start.sh", "bootstrap.sh", "entrypoint.sh",
]

GITIGNORE_FILE = ".gitignore"

SECRET_FILENAME_PATTERNS = [
    r"\.env$", r"credentials\.", r"secrets\.", r"id_rsa", r"\.pem$",
    r"api[_\-]?key", r"private[_\-]?key",
]

SECRET_CODE_PATTERNS = [
    r'(?i)(password|passwd|secret|api_key|apikey|token|auth_token)\s*=\s*["\'][^"\']{8,}["\']',
    r'AKIA[0-9A-Z]{16}',                        # AWS access key
    r'(?i)bearer\s+[a-z0-9\-._~+/]{20,}',       # Bearer token in code
]


def check_code(repo_url: str) -> dict:
    match = re.match(r"https?://github\.com/([^/]+)/([^/\s]+?)(?:\.git)?/?$", repo_url.strip())
    if not match:
        return {
            "passed": False, "score": 0.0,
            "details": {"error": "Not a valid GitHub URL", "checks": {"valid_url": False}},
        }

    owner, repo = match.groups()
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    checks: dict = {"valid_url": True}
    score = 0.0
    warnings: list = []

    try:
        with httpx.Client(timeout=20, headers=headers) as client:
            # README
            r = client.get(f"https://api.github.com/repos/{owner}/{repo}/readme")
            checks["has_readme"] = r.status_code == 200
            if checks["has_readme"]:
                score += 5

            # LICENSE
            r = client.get(f"https://api.github.com/repos/{owner}/{repo}/license")
            checks["has_license"] = r.status_code == 200
            if checks["has_license"]:
                score += 3

            # Root contents
            r = client.get(f"https://api.github.com/repos/{owner}/{repo}/contents")
            if r.status_code == 200:
                raw = r.json()
                file_names = [f["name"] for f in raw] if isinstance(raw, list) else []

                # Dependency file
                found_dep = [f for f in DEPENDENCY_FILES if f in file_names]
                checks["dependency_file"] = found_dep[0] if found_dep else None
                checks["has_dependency_file"] = bool(found_dep)
                if found_dep:
                    score += 7

                # Run instructions
                found_run = [f for f in RUN_INSTRUCTION_FILES if f in file_names]
                checks["run_instruction_file"] = found_run[0] if found_run else None
                checks["has_run_instructions"] = bool(found_run)
                if found_run:
                    score += 5

                # .gitignore
                checks["has_gitignore"] = GITIGNORE_FILE in file_names
                if checks["has_gitignore"]:
                    score += 2

                # Suspicious filenames (secret files committed)
                for fname in file_names:
                    for pat in SECRET_FILENAME_PATTERNS:
                        if re.search(pat, fname, re.IGNORECASE):
                            warnings.append(f"Suspicious file committed: {fname}")
                            score = max(0.0, score - 3)
                            break
            else:
                checks["has_dependency_file"] = False
                checks["has_run_instructions"] = False
                checks["has_gitignore"] = False

            # Commit count (basic activity indicator)
            r = client.get(
                f"https://api.github.com/repos/{owner}/{repo}/commits",
                params={"per_page": 1},
            )
            if r.status_code == 200:
                link = r.headers.get("link", "")
                m = re.search(r'page=(\d+)>; rel="last"', link)
                commit_count = int(m.group(1)) if m else (1 if r.json() else 0)
                checks["commit_count"] = commit_count
                if commit_count >= 5:
                    score += 3

    except Exception as exc:
        return {
            "passed": False, "score": 0.0,
            "details": {"error": str(exc), "checks": checks},
        }

    # Stage 2: local clone + static analysis
    static = _run_static_analysis(repo_url)
    checks.update(static.get("checks", {}))
    score += static.get("score_delta", 0.0)
    warnings.extend(static.get("warnings", []))

    passed = checks.get("has_readme", False) and checks.get("has_dependency_file", False)
    return {
        "passed": passed,
        "score": round(min(score, 30.0), 1),
        "details": {"checks": checks, "warnings": warnings},
    }


def _run_static_analysis(repo_url: str) -> dict:
    """Clone repo and run flake8 + secret scanning. Returns partial result."""
    if not shutil.which("git"):
        return {}

    checks = {}
    score_delta = 0.0
    warnings = []

    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            subprocess.run(
                ["git", "clone", "--depth=1", "--quiet", repo_url, tmpdir],
                capture_output=True, timeout=60,
            )
        except Exception:
            return {}

        # LOC count
        try:
            loc = _count_loc(tmpdir)
            checks["loc"] = loc
            if loc > 0:
                score_delta += min(3.0, loc / 200)  # up to +3 for 600+ lines
        except Exception:
            pass

        # Flake8 on Python files
        if shutil.which("flake8"):
            try:
                py_files = [
                    os.path.join(r, f)
                    for r, _, files in os.walk(tmpdir)
                    for f in files
                    if f.endswith(".py")
                    and ".git" not in r
                ]
                if py_files:
                    res = subprocess.run(
                        ["flake8", "--max-line-length=120", "--statistics", "--count", *py_files[:50]],
                        capture_output=True, text=True, timeout=30,
                    )
                    lines = [ln for ln in res.stdout.splitlines() if ln.strip()]
                    error_count = 0
                    if lines and lines[-1].strip().isdigit():
                        error_count = int(lines[-1].strip())
                    checks["flake8_errors"] = error_count
                    checks["flake8_files"] = len(py_files)
                    if error_count == 0:
                        score_delta += 3.0
                    elif error_count < 20:
                        score_delta += 1.5
            except Exception:
                pass

        # Radon complexity (Python)
        if shutil.which("radon"):
            try:
                res = subprocess.run(
                    ["radon", "mi", "--min", "B", "-s", tmpdir],
                    capture_output=True, text=True, timeout=30,
                )
                complex_files = [ln for ln in res.stdout.splitlines() if " - " in ln and "B" not in ln.split(" - ")[-1]]
                checks["complex_files"] = len(complex_files)
            except Exception:
                pass

        # Secret scanning
        secrets_found = _scan_secrets(tmpdir)
        if secrets_found:
            warnings.extend(secrets_found[:5])
            score_delta -= len(secrets_found) * 2
        checks["secrets_found"] = len(secrets_found)

    return {"checks": checks, "score_delta": round(score_delta, 1), "warnings": warnings}


def _count_loc(repo_dir: str) -> int:
    code_exts = {".py", ".js", ".ts", ".tsx", ".java", ".cpp", ".c", ".go", ".rs"}
    total = 0
    for root, dirs, files in os.walk(repo_dir):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "__pycache__", "vendor")]
        for f in files:
            if os.path.splitext(f)[1] in code_exts:
                try:
                    with open(os.path.join(root, f), encoding="utf-8", errors="ignore") as fh:
                        total += sum(1 for line in fh if line.strip())
                except Exception:
                    pass
    return total


def _scan_secrets(repo_dir: str) -> list:
    found = []
    code_exts = {".py", ".js", ".ts", ".java", ".cpp", ".go", ".env", ".yaml", ".yml", ".json"}
    for root, dirs, files in os.walk(repo_dir):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "__pycache__")]
        for fname in files:
            # Suspicious filename
            for pat in SECRET_FILENAME_PATTERNS:
                if re.search(pat, fname, re.IGNORECASE):
                    found.append(f"Suspicious file: {fname}")
                    break
            # Scan file content
            if os.path.splitext(fname)[1] in code_exts:
                fpath = os.path.join(root, fname)
                try:
                    with open(fpath, encoding="utf-8", errors="ignore") as fh:
                        content = fh.read(50_000)
                    for pat in SECRET_CODE_PATTERNS:
                        m = re.search(pat, content)
                        if m:
                            rel = os.path.relpath(fpath, repo_dir)
                            found.append(f"Possible secret in {rel}: {m.group(0)[:60]}")
                            break
                except Exception:
                    pass
        if len(found) >= 10:
            break
    return found


# ── Local directory / archive checks ─────────────────────────────────────────

DEP_FILE_NAMES = set(DEPENDENCY_FILES)
RUN_FILE_NAMES = set(RUN_INSTRUCTION_FILES)


def check_archive(archive_path: str) -> dict:
    """Extract a .zip and run structure + static analysis on its contents."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            with zipfile.ZipFile(archive_path, "r") as zf:
                zf.extractall(tmpdir)
            # If the zip contains a single top-level folder, descend into it.
            entries = [os.path.join(tmpdir, e) for e in os.listdir(tmpdir)]
            root = entries[0] if len(entries) == 1 and os.path.isdir(entries[0]) else tmpdir
            result = check_local_dir(root)
            result["details"]["source"] = "archive"
            return result
    except zipfile.BadZipFile:
        return {"passed": False, "score": 0.0, "details": {"error": "Invalid ZIP archive"}}
    except Exception as exc:
        return {"passed": False, "score": 0.0, "details": {"error": str(exc)}}


def check_local_dir(directory: str) -> dict:
    """Structure + static analysis on a local directory (shared by archive check)."""
    checks: dict = {}
    score = 0.0
    warnings: list = []

    all_files: set = set()
    for _root, _dirs, files in os.walk(directory):
        for f in files:
            all_files.add(f)

    checks["has_readme"]           = any(f.lower().startswith("readme") for f in all_files)
    checks["has_license"]          = any(f.lower().startswith("license") for f in all_files)
    found_dep                      = [f for f in DEP_FILE_NAMES if f in all_files]
    checks["has_dependency_file"]  = bool(found_dep)
    checks["dependency_file"]      = found_dep[0] if found_dep else None
    found_run                      = [f for f in RUN_FILE_NAMES if f in all_files]
    checks["has_run_instructions"] = bool(found_run)
    checks["run_instruction_file"] = found_run[0] if found_run else None
    checks["has_gitignore"]        = ".gitignore" in all_files

    if checks["has_readme"]:
        score += 5
    if checks["has_license"]:
        score += 3
    if checks["has_dependency_file"]:
        score += 7
    if checks["has_run_instructions"]:
        score += 5
    if checks["has_gitignore"]:
        score += 2

    # LOC
    checks["loc"] = _count_loc(directory)
    if checks["loc"] > 0:
        score += min(3.0, checks["loc"] / 200)

    # flake8
    if shutil.which("flake8"):
        py_files = [
            os.path.join(r, f)
            for r, _, fls in os.walk(directory)
            for f in fls if f.endswith(".py") and ".git" not in r
        ]
        if py_files:
            try:
                res = subprocess.run(
                    ["flake8", "--max-line-length=120", "--count", *py_files[:50]],
                    capture_output=True, text=True, timeout=30,
                )
                lines = [ln for ln in res.stdout.splitlines() if ln.strip()]
                error_count = int(lines[-1]) if lines and lines[-1].strip().isdigit() else 0
                checks["flake8_errors"] = error_count
                if error_count == 0:
                    score += 3
                elif error_count < 20:
                    score += 1.5
            except Exception:
                pass

    # Secrets
    secrets = _scan_secrets(directory)
    checks["secrets_found"] = len(secrets)
    warnings.extend(secrets[:5])
    score -= len(secrets) * 2

    # Optional: run the team's own test suite (sandboxed subprocess)
    from ..config import settings
    if settings.run_team_tests:
        test_result = run_team_tests(directory)
        if test_result:
            checks.update(test_result)
            if test_result.get("tests_failed", 0) == 0 and test_result.get("tests_passed", 0) > 0:
                score += 4
            elif test_result.get("tests_passed", 0) > 0:
                score += 2

    passed = checks.get("has_readme", False) and checks.get("has_dependency_file", False)
    return {
        "passed": passed,
        "score": round(min(max(score, 0), 30.0), 1),
        "details": {"checks": checks, "warnings": warnings},
    }


def run_team_tests(directory: str) -> dict | None:
    """Run the team's test suite in a time-limited subprocess (Docker sandbox).

    Supports pytest (Python). Returns {tests_passed, tests_failed, test_runner}
    or None if no recognized test setup is found / pytest unavailable.
    """
    import importlib.util
    import sys

    has_pytests = any(
        f.startswith("test_") or f.endswith("_test.py")
        for r, _, files in os.walk(directory)
        for f in files
        if ".git" not in r and "node_modules" not in r
    ) or os.path.isdir(os.path.join(directory, "tests"))

    if not has_pytests or importlib.util.find_spec("pytest") is None:
        return None

    try:
        res = subprocess.run(
            [sys.executable, "-m", "pytest", "--tb=no", "-q", "--no-header",
             "-p", "no:cacheprovider"],
            cwd=directory, capture_output=True, text=True, timeout=60,
        )
        out = res.stdout + res.stderr
        passed = _parse_pytest_count(out, r"(\d+) passed")
        failed = _parse_pytest_count(out, r"(\d+) failed")
        errors = _parse_pytest_count(out, r"(\d+) error")
        return {
            "test_runner": "pytest",
            "tests_passed": passed,
            "tests_failed": failed + errors,
        }
    except subprocess.TimeoutExpired:
        return {"test_runner": "pytest", "tests_timeout": True, "tests_passed": 0, "tests_failed": 0}
    except Exception:
        return None


def _parse_pytest_count(output: str, pattern: str) -> int:
    m = re.search(pattern, output)
    return int(m.group(1)) if m else 0
