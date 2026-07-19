"""Case (hackathon track) management for organizers."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, require_role
from ..database import get_db

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("", response_model=List[schemas.CaseOut])
def list_cases(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return db.query(models.Case).order_by(models.Case.id).all()


@router.post("", response_model=schemas.CaseOut)
def create_case(
    data: schemas.CaseIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    if db.query(models.Case).filter_by(slug=data.slug).first():
        raise HTTPException(status_code=400, detail="Slug already exists")
    case = models.Case(
        slug=data.slug,
        title=data.title,
        description=data.description,
        sponsor=data.sponsor,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


@router.put("/{case_id}", response_model=schemas.CaseOut)
def update_case(
    case_id: int,
    data: schemas.CaseIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    case = db.query(models.Case).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    # Check slug uniqueness if changed
    if data.slug != case.slug:
        existing = db.query(models.Case).filter_by(slug=data.slug).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already taken")
    case.slug = data.slug
    case.title = data.title
    case.description = data.description
    case.sponsor = data.sponsor
    db.commit()
    db.refresh(case)
    return case


@router.delete("/{case_id}")
def delete_case(
    case_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    case = db.query(models.Case).filter_by(id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.teams:
        raise HTTPException(status_code=400, detail="Cannot delete case with assigned teams")
    db.delete(case)
    db.commit()
    return {"ok": True}
