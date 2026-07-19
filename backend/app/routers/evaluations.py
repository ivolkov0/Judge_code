from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


@router.get("", response_model=List[schemas.TeamListItem])
def list_teams_for_jury(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("jury")),
):
    """Returns all teams with their auto/jury scores for jury to review."""
    teams = (
        db.query(models.Team)
        .options(
            joinedload(models.Team.case),
            joinedload(models.Team.members),
            joinedload(models.Team.submission).joinedload(models.Submission.checks),
            joinedload(models.Team.evaluations),
        )
        .all()
    )
    result = []
    for t in teams:
        checks = t.submission.checks if t.submission else []
        auto_score = sum(c.score for c in checks if c.status in ("passed", "failed"))
        jury_score = (sum(e.score for e in t.evaluations) / len(t.evaluations)) if t.evaluations else None
        status = "Submitted" if t.submission and (t.submission.repo_url or t.submission.docs_path) else "Coding"
        result.append(schemas.TeamListItem(
            id=t.id,
            name=t.name,
            case=t.case,
            members_count=len(t.members),
            status=status,
            auto_score=auto_score,
            jury_score=jury_score,
            my_evaluated=any(e.jury_id == user.id for e in t.evaluations),
        ))
    return result


@router.get("/my", response_model=List[schemas.EvaluationOut])
def my_evaluations(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Returns jury evaluations for the current user's team."""
    membership = db.query(models.TeamMember).filter(models.TeamMember.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="You are not in a team")
    evals = (
        db.query(models.Evaluation)
        .options(joinedload(models.Evaluation.jury))
        .filter(models.Evaluation.team_id == membership.team_id)
        .all()
    )
    return evals


def _compute_weighted_score(db: Session, criterion_scores: list) -> float:
    """Convert per-criterion scores into a 0–50 weighted total.

    weighted_fraction = Σ(score_i / max_i × weight_i) / Σ(weight_i)  → scaled ×50
    """
    if not criterion_scores:
        return 0.0
    total_weight = 0.0
    weighted_sum = 0.0
    for cs in criterion_scores:
        crit = db.query(models.Criterion).filter_by(id=cs.criterion_id).first()
        if not crit:
            continue
        max_score = crit.max_score or 10
        normalized = max(0.0, min(cs.score / max_score, 1.0))
        weighted_sum += normalized * crit.weight
        total_weight += crit.weight
    if total_weight == 0:
        return 0.0
    return round(weighted_sum / total_weight * 50, 1)


@router.post("/{team_id}", response_model=schemas.EvaluationOut, status_code=201)
def submit_evaluation(
    team_id: int,
    data: schemas.EvaluationIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("jury")),
):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Determine total score: weighted from criteria if provided, else raw score.
    if data.criterion_scores:
        total = _compute_weighted_score(db, data.criterion_scores)
    elif data.score is not None:
        if data.score < 0 or data.score > 50:
            raise HTTPException(status_code=400, detail="Score must be between 0 and 50")
        total = data.score
    else:
        raise HTTPException(status_code=400, detail="Provide criterion_scores or score")

    existing = (
        db.query(models.Evaluation)
        .filter_by(team_id=team_id, jury_id=user.id)
        .first()
    )
    if existing:
        existing.score = total
        existing.comment = data.comment
        # Replace criterion scores
        db.query(models.CriterionScore).filter_by(evaluation_id=existing.id).delete()
        if data.criterion_scores:
            for cs in data.criterion_scores:
                db.add(models.CriterionScore(
                    evaluation_id=existing.id,
                    criterion_id=cs.criterion_id,
                    score=cs.score,
                ))
        db.commit()
        return db.query(models.Evaluation).options(joinedload(models.Evaluation.jury)).filter_by(id=existing.id).first()

    evaluation = models.Evaluation(
        team_id=team_id,
        jury_id=user.id,
        score=total,
        comment=data.comment,
    )
    db.add(evaluation)
    db.flush()
    if data.criterion_scores:
        for cs in data.criterion_scores:
            db.add(models.CriterionScore(
                evaluation_id=evaluation.id,
                criterion_id=cs.criterion_id,
                score=cs.score,
            ))
    db.commit()
    return db.query(models.Evaluation).options(joinedload(models.Evaluation.jury)).filter_by(id=evaluation.id).first()
