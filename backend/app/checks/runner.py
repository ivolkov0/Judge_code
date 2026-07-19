"""Check runners — plain functions shared by BackgroundTasks and Celery.

Each function opens its own DB session, runs a check, and persists the result.
Kept free of FastAPI imports so it can run inside a Celery worker process.
"""
from datetime import datetime, timezone

from .. import models
from .code_checker import check_code, check_archive
from .doc_checker import check_doc
from .pptx_checker import check_presentation
from .video_checker import check_video


def _checklist(db, kind: str) -> list:
    """Return organizer-configured (keyword, label) pairs for a check kind,
    ordered by position. Empty list → checker uses its built-in defaults."""
    items = (
        db.query(models.ChecklistItem)
        .filter_by(kind=kind)
        .order_by(models.ChecklistItem.position, models.ChecklistItem.id)
        .all()
    )
    return [(it.keyword, it.label) for it in items]


def _save_check(db, check_id: int, result: dict):
    check = db.query(models.CheckResult).filter_by(id=check_id).first()
    if check:
        check.status = "passed" if result["passed"] else "failed"
        check.score = result["score"]
        check.details = result["details"]
        check.checked_at = datetime.now(timezone.utc)
        db.commit()


def run_code_check(check_id: int, repo_url: str):
    from .._bg_db import get_bg_db
    db = get_bg_db()
    try:
        _save_check(db, check_id, check_code(repo_url))
    finally:
        db.close()


def run_archive_check(check_id: int, archive_path: str):
    from .._bg_db import get_bg_db
    db = get_bg_db()
    try:
        _save_check(db, check_id, check_archive(archive_path))
    finally:
        db.close()


def run_doc_check(check_id: int, file_path: str):
    from .._bg_db import get_bg_db
    db = get_bg_db()
    try:
        _save_check(db, check_id, check_doc(file_path, _checklist(db, "docs")))
    finally:
        db.close()


def run_presentation_check(check_id: int, file_path: str):
    from .._bg_db import get_bg_db
    db = get_bg_db()
    try:
        _save_check(db, check_id, check_presentation(file_path, _checklist(db, "presentation")))
    finally:
        db.close()


def run_video_check(check_id: int, file_path: str, submission_id: int):
    from .._bg_db import get_bg_db
    db = get_bg_db()
    try:
        result = check_video(file_path)
        _save_check(db, check_id, result)
        transcript = result.get("transcript")
        if transcript and submission_id:
            sub = db.query(models.Submission).filter_by(id=submission_id).first()
            if sub:
                sub.transcript = transcript
                db.commit()
    finally:
        db.close()


def run_algo_judge(submission_id: int):
    """Compile/run an algorithmic submission against all test cases."""
    from .._bg_db import get_bg_db
    from .sandbox import run_in_sandbox
    db = get_bg_db()
    try:
        sub = db.query(models.AlgoSubmission).filter_by(id=submission_id).first()
        if not sub:
            return
        prob = db.query(models.AlgoProblem).filter_by(id=sub.problem_id).first()
        if not prob:
            return

        sub.verdict = "running"
        db.commit()

        test_cases = (
            db.query(models.AlgoTestCase)
            .filter_by(problem_id=prob.id)
            .order_by(models.AlgoTestCase.id)
            .all()
        )
        if not test_cases:
            sub.verdict = "OK"
            sub.score = 100.0
            db.commit()
            return

        results = []
        final_verdict = "OK"
        max_time_ms = 0

        for tc in test_cases:
            res = run_in_sandbox(
                sub.source_code, sub.language,
                tc.input_data, prob.time_limit_ms, prob.memory_limit_mb,
            )
            verdict = res["verdict"]
            if verdict == "OK":
                actual = res.get("output", "").strip()
                expected = tc.expected_output.strip()
                if actual != expected:
                    verdict = "WA"
                    res["expected"] = expected
                    res["got"] = actual[:200]
            entry = {"test_id": tc.id, "verdict": verdict, "time_ms": res.get("time_ms")}
            if verdict != "OK":
                # Carry the diagnostic so it can be surfaced as error_message.
                entry["error"] = res.get("error")
                entry["got"] = res.get("got")
            results.append(entry)
            if verdict != "OK" and final_verdict == "OK":
                final_verdict = verdict
            max_time_ms = max(max_time_ms, res.get("time_ms") or 0)

        passed = sum(1 for r in results if r["verdict"] == "OK")
        sub.verdict = final_verdict
        sub.score = round(passed / len(test_cases) * 100, 1)
        sub.time_ms = max_time_ms
        sub.test_results = results
        if final_verdict != "OK":
            # Report the FIRST failing test (matches final_verdict), not the last.
            first_fail = next((r for r in results if r["verdict"] != "OK"), None)
            if first_fail:
                sub.error_message = (first_fail.get("error") or first_fail.get("got") or "")[:500]
        db.commit()
    except Exception as exc:
        try:
            sub = db.query(models.AlgoSubmission).filter_by(id=submission_id).first()
            if sub:
                sub.verdict = "RE"
                sub.error_message = str(exc)[:500]
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
