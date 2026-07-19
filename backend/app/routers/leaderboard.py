from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("", response_model=List[schemas.LeaderboardEntry])
def get_leaderboard(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
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

    entries = []
    for t in teams:
        auto_score = sum(
            c.score for c in (t.submission.checks if t.submission else [])
            if c.status in ("passed", "failed")
        )
        jury_score = (
            sum(e.score for e in t.evaluations) / len(t.evaluations)
            if t.evaluations else 0.0
        )
        entries.append({
            "team_id": t.id,
            "team_name": t.name,
            "case_title": t.case.title if t.case else None,
            "members_count": len(t.members),
            "auto_score": round(auto_score, 1),
            "jury_score": round(jury_score, 1),
            "total": round(auto_score + jury_score, 1),
        })

    entries.sort(key=lambda e: e["total"], reverse=True)
    for i, e in enumerate(entries):
        e["rank"] = i + 1

    return entries
