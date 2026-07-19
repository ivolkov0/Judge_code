"""Evaluation criteria management.

Organizers define criteria with relative weights. Jury scores each criterion
per team; the weighted total becomes the team's jury score.
All authenticated users can read criteria (jury needs them to render the form).
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, require_role
from ..database import get_db

router = APIRouter(prefix="/api/criteria", tags=["criteria"])


@router.get("", response_model=List[schemas.CriterionOut])
def list_criteria(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Criterion)
        .order_by(models.Criterion.position, models.Criterion.id)
        .all()
    )


@router.post("", response_model=schemas.CriterionOut)
def create_criterion(
    data: schemas.CriterionIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    if data.weight <= 0:
        raise HTTPException(status_code=400, detail="Weight must be positive")
    if data.max_score <= 0:
        raise HTTPException(status_code=400, detail="Max score must be positive")
    crit = models.Criterion(
        name=data.name,
        description=data.description,
        weight=data.weight,
        max_score=data.max_score,
        position=data.position,
    )
    db.add(crit)
    db.commit()
    db.refresh(crit)
    return crit


@router.put("/{criterion_id}", response_model=schemas.CriterionOut)
def update_criterion(
    criterion_id: int,
    data: schemas.CriterionIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    crit = db.query(models.Criterion).filter_by(id=criterion_id).first()
    if not crit:
        raise HTTPException(status_code=404, detail="Criterion not found")
    crit.name = data.name
    crit.description = data.description
    crit.weight = data.weight
    crit.max_score = data.max_score
    crit.position = data.position
    db.commit()
    db.refresh(crit)
    return crit


@router.delete("/{criterion_id}")
def delete_criterion(
    criterion_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    crit = db.query(models.Criterion).filter_by(id=criterion_id).first()
    if not crit:
        raise HTTPException(status_code=404, detail="Criterion not found")
    db.delete(crit)
    db.commit()
    return {"ok": True}
