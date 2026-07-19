"""Algorithmic judge router.

Organizers manage problems and test cases.
Participants submit solutions; background tasks run them in sandbox.
All authenticated users can browse problems and see results.
"""
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, queue
from ..auth import get_current_user, require_role
from ..database import get_db

router = APIRouter(prefix="/api/algo", tags=["algo"])


# ── Problems ──────────────────────────────────────────────────────────────────

@router.get("/problems", response_model=List[schemas.AlgoProblemListItem])
def list_problems(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    problems = db.query(models.AlgoProblem).order_by(models.AlgoProblem.id).all()
    result = []
    for p in problems:
        best = (
            db.query(models.AlgoSubmission)
            .filter_by(problem_id=p.id, user_id=user.id)
            .order_by(models.AlgoSubmission.score.desc())
            .first()
        )
        result.append(
            schemas.AlgoProblemListItem(
                id=p.id,
                title=p.title,
                time_limit_ms=p.time_limit_ms,
                memory_limit_mb=p.memory_limit_mb,
                created_at=p.created_at,
                test_count=len(p.test_cases),
                my_best_verdict=best.verdict if best else None,
            )
        )
    return result


@router.post("/problems", response_model=schemas.AlgoProblemOut)
def create_problem(
    data: schemas.AlgoProblemIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("organizer")),
):
    prob = models.AlgoProblem(
        title=data.title,
        statement=data.statement,
        time_limit_ms=data.time_limit_ms,
        memory_limit_mb=data.memory_limit_mb,
        created_by_id=user.id,
    )
    db.add(prob)
    db.commit()
    db.refresh(prob)
    return prob


@router.get("/problems/{problem_id}", response_model=schemas.AlgoProblemOut)
def get_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    prob = db.query(models.AlgoProblem).filter_by(id=problem_id).first()
    if not prob:
        raise HTTPException(status_code=404, detail="Problem not found")
    # Hide non-sample test inputs/outputs from participants — they may only see
    # sample cases, otherwise they could hardcode answers to the hidden tests.
    # Build the response manually instead of mutating prob.test_cases, which is a
    # delete-orphan relationship (assigning to it would delete the hidden rows).
    tests = prob.test_cases
    if user.role not in ("organizer", "jury"):
        tests = [tc for tc in tests if tc.is_sample]
    return schemas.AlgoProblemOut(
        id=prob.id,
        title=prob.title,
        statement=prob.statement,
        time_limit_ms=prob.time_limit_ms,
        memory_limit_mb=prob.memory_limit_mb,
        created_at=prob.created_at,
        test_cases=[schemas.AlgoTestCaseOut.model_validate(tc) for tc in tests],
    )


@router.put("/problems/{problem_id}", response_model=schemas.AlgoProblemOut)
def update_problem(
    problem_id: int,
    data: schemas.AlgoProblemIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    prob = db.query(models.AlgoProblem).filter_by(id=problem_id).first()
    if not prob:
        raise HTTPException(status_code=404, detail="Problem not found")
    prob.title = data.title
    prob.statement = data.statement
    prob.time_limit_ms = data.time_limit_ms
    prob.memory_limit_mb = data.memory_limit_mb
    db.commit()
    db.refresh(prob)
    return prob


@router.delete("/problems/{problem_id}")
def delete_problem(
    problem_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    prob = db.query(models.AlgoProblem).filter_by(id=problem_id).first()
    if not prob:
        raise HTTPException(status_code=404, detail="Problem not found")
    db.delete(prob)
    db.commit()
    return {"ok": True}


# ── Test cases ────────────────────────────────────────────────────────────────

@router.post("/problems/{problem_id}/tests", response_model=schemas.AlgoTestCaseOut)
def add_test_case(
    problem_id: int,
    data: schemas.AlgoTestCaseIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    prob = db.query(models.AlgoProblem).filter_by(id=problem_id).first()
    if not prob:
        raise HTTPException(status_code=404, detail="Problem not found")
    tc = models.AlgoTestCase(
        problem_id=problem_id,
        input_data=data.input_data,
        expected_output=data.expected_output,
        is_sample=data.is_sample,
    )
    db.add(tc)
    db.commit()
    db.refresh(tc)
    return tc


@router.delete("/problems/{problem_id}/tests/{test_id}")
def delete_test_case(
    problem_id: int,
    test_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    tc = db.query(models.AlgoTestCase).filter_by(id=test_id, problem_id=problem_id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    db.delete(tc)
    db.commit()
    return {"ok": True}


# ── Submissions ───────────────────────────────────────────────────────────────

@router.post("/problems/{problem_id}/submit", response_model=schemas.AlgoSubmissionOut)
def submit_solution(
    problem_id: int,
    data: schemas.AlgoSubmitIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if data.language not in ("python", "cpp", "java"):
        raise HTTPException(status_code=400, detail="Language must be python, cpp, or java")
    prob = db.query(models.AlgoProblem).filter_by(id=problem_id).first()
    if not prob:
        raise HTTPException(status_code=404, detail="Problem not found")

    sub = models.AlgoSubmission(
        problem_id=problem_id,
        user_id=user.id,
        language=data.language,
        source_code=data.source_code,
        verdict="pending",
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    queue.dispatch_algo_judge(background_tasks, sub.id)
    return sub


@router.get("/submissions", response_model=List[schemas.AlgoSubmissionOut])
def my_submissions(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.AlgoSubmission)
        .filter_by(user_id=user.id)
        .order_by(models.AlgoSubmission.submitted_at.desc())
        .all()
    )


@router.get("/problems/{problem_id}/submissions", response_model=List[schemas.AlgoSubmissionOut])
def problem_submissions(
    problem_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """My submissions for a specific problem."""
    return (
        db.query(models.AlgoSubmission)
        .filter_by(problem_id=problem_id, user_id=user.id)
        .order_by(models.AlgoSubmission.submitted_at.desc())
        .all()
    )


@router.get("/problems/{problem_id}/all-submissions", response_model=List[schemas.AlgoSubmissionOut])
def all_problem_submissions(
    problem_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer", "jury")),
):
    """All submissions for a problem (organizer/jury only)."""
    return (
        db.query(models.AlgoSubmission)
        .filter_by(problem_id=problem_id)
        .order_by(models.AlgoSubmission.submitted_at.desc())
        .all()
    )


@router.get("/submissions/{submission_id}", response_model=schemas.AlgoSubmissionOut)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    sub = db.query(models.AlgoSubmission).filter_by(id=submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.user_id != user.id and user.role not in ("organizer", "jury"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return sub
