from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/api/teams", tags=["teams"])


def _team_status(team: models.Team) -> str:
    if not team.submission:
        return "Coding"
    sub = team.submission
    if sub.repo_url or sub.docs_path or sub.presentation_path or sub.screencast_path:
        checks = sub.checks
        if checks and all(c.status in ("passed", "failed") for c in checks):
            return "Submitted"
        return "Reviewing"
    return "Coding"


def _auto_score(team: models.Team) -> float:
    if not team.submission:
        return 0.0
    return sum(c.score for c in team.submission.checks if c.status in ("passed", "failed"))


def _jury_score(team: models.Team) -> float:
    if not team.evaluations:
        return 0.0
    return sum(e.score for e in team.evaluations) / len(team.evaluations)


@router.get("", response_model=List[schemas.TeamListItem])
def list_teams(
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer", "jury")),
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
    result = []
    for t in teams:
        result.append(schemas.TeamListItem(
            id=t.id,
            name=t.name,
            case=t.case,
            members_count=len(t.members),
            status=_team_status(t),
            auto_score=_auto_score(t),
            jury_score=_jury_score(t) if t.evaluations else None,
        ))
    return result


@router.get("/{team_id}/full", response_model=schemas.TeamFullOut)
def team_full(
    team_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer", "jury")),
):
    """Aggregated team view: artifacts, auto-checks, jury evaluations."""
    team = (
        db.query(models.Team)
        .options(
            joinedload(models.Team.case),
            joinedload(models.Team.members).joinedload(models.TeamMember.user),
            joinedload(models.Team.submission).joinedload(models.Submission.checks),
            joinedload(models.Team.evaluations).joinedload(models.Evaluation.jury),
            joinedload(models.Team.evaluations).joinedload(models.Evaluation.criterion_scores),
        )
        .filter(models.Team.id == team_id)
        .first()
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return schemas.TeamFullOut(
        team=team,
        submission=team.submission,
        checks=team.submission.checks if team.submission else [],
        evaluations=team.evaluations,
        auto_score=round(_auto_score(team), 1),
        jury_score=round(_jury_score(team), 1) if team.evaluations else None,
    )


@router.get("/my", response_model=schemas.TeamOut)
def my_team(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    membership = (
        db.query(models.TeamMember)
        .filter(models.TeamMember.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="You are not in a team")
    team = (
        db.query(models.Team)
        .options(
            joinedload(models.Team.case),
            joinedload(models.Team.members).joinedload(models.TeamMember.user),
        )
        .filter(models.Team.id == membership.team_id)
        .first()
    )
    return team


@router.post("", response_model=schemas.TeamOut, status_code=201)
def create_team(
    data: schemas.CreateTeamIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("participant")),
):
    if db.query(models.TeamMember).filter(models.TeamMember.user_id == user.id).first():
        raise HTTPException(status_code=400, detail="You are already in a team")
    if db.query(models.Team).filter(models.Team.name == data.name).first():
        raise HTTPException(status_code=400, detail="Team name already taken")

    case = None
    if data.case_slug:
        case = db.query(models.Case).filter(models.Case.slug == data.case_slug).first()

    team = models.Team(name=data.name, case_id=case.id if case else None)
    db.add(team)
    db.flush()

    member = models.TeamMember(team_id=team.id, user_id=user.id, is_leader=True)
    db.add(member)

    submission = models.Submission(team_id=team.id)
    db.add(submission)

    db.commit()
    db.refresh(team)

    team = (
        db.query(models.Team)
        .options(
            joinedload(models.Team.case),
            joinedload(models.Team.members).joinedload(models.TeamMember.user),
        )
        .filter(models.Team.id == team.id)
        .first()
    )
    return team


@router.post("/join", response_model=schemas.TeamOut)
def join_team(
    data: schemas.JoinTeamIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("participant")),
):
    if db.query(models.TeamMember).filter(models.TeamMember.user_id == user.id).first():
        raise HTTPException(status_code=400, detail="You are already in a team")

    team = db.query(models.Team).filter(models.Team.join_code == data.join_code.upper()).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if len(team.members) >= 5:
        raise HTTPException(status_code=400, detail="Team is full (max 5)")

    member = models.TeamMember(team_id=team.id, user_id=user.id, is_leader=False)
    db.add(member)
    db.commit()

    team = (
        db.query(models.Team)
        .options(
            joinedload(models.Team.case),
            joinedload(models.Team.members).joinedload(models.TeamMember.user),
        )
        .filter(models.Team.id == team.id)
        .first()
    )
    return team
