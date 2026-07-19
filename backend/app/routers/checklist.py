"""Configurable checklist items for documentation and presentation checks.

Organizers define which sections/topics must be present; the doc and
presentation checkers read these at check time instead of a hardcoded list.
All authenticated users may read them (participants see what is required).
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, require_role
from ..database import get_db

router = APIRouter(prefix="/api/checklist", tags=["checklist"])

_KINDS = ("docs", "presentation")


@router.get("", response_model=List[schemas.ChecklistItemOut])
def list_items(
    kind: Optional[str] = None,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.ChecklistItem)
    if kind:
        q = q.filter(models.ChecklistItem.kind == kind)
    return q.order_by(models.ChecklistItem.kind, models.ChecklistItem.position, models.ChecklistItem.id).all()


@router.post("", response_model=schemas.ChecklistItemOut)
def create_item(
    data: schemas.ChecklistItemIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    if data.kind not in _KINDS:
        raise HTTPException(status_code=400, detail=f"kind must be one of {_KINDS}")
    if not data.keyword.strip() or not data.label.strip():
        raise HTTPException(status_code=400, detail="keyword and label are required")
    item = models.ChecklistItem(
        kind=data.kind,
        keyword=data.keyword.strip().lower(),
        label=data.label.strip(),
        position=data.position,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{item_id}", response_model=schemas.ChecklistItemOut)
def update_item(
    item_id: int,
    data: schemas.ChecklistItemIn,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    item = db.query(models.ChecklistItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    if data.kind not in _KINDS:
        raise HTTPException(status_code=400, detail=f"kind must be one of {_KINDS}")
    item.kind = data.kind
    item.keyword = data.keyword.strip().lower()
    item.label = data.label.strip()
    item.position = data.position
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_role("organizer")),
):
    item = db.query(models.ChecklistItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}
