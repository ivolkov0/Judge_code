import os
import uuid
import zipfile
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_role
from ..config import settings
from .. import queue

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

ALLOWED_DOC_EXTS   = {".pdf", ".docx", ".md"}
ALLOWED_PPTX_EXTS  = {".pptx", ".pdf"}
ALLOWED_VIDEO_EXTS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
ALLOWED_ZIP_EXTS   = {".zip"}


def _get_team_submission(user: models.User, db: Session) -> models.Submission:
    membership = db.query(models.TeamMember).filter(models.TeamMember.user_id == user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="You are not in a team")
    submission = db.query(models.Submission).filter(models.Submission.team_id == membership.team_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="No submission found")
    return submission


def _upsert_check(db: Session, submission_id: int, check_type: str) -> models.CheckResult:
    check = (
        db.query(models.CheckResult)
        .filter_by(submission_id=submission_id, check_type=check_type)
        .first()
    )
    if not check:
        check = models.CheckResult(submission_id=submission_id, check_type=check_type, status="running")
        db.add(check)
        db.commit()
        db.refresh(check)
    else:
        check.status = "running"
        db.commit()
    return check


MAX_UPLOAD_MB = 200


def _save_upload(file: UploadFile, allowed_exts: set, max_mb: int = MAX_UPLOAD_MB) -> tuple[str, str]:
    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Use: {allowed_exts}")
    content = file.file.read()
    if len(content) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large (max {max_mb} MB)")
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(settings.upload_dir, filename)
    with open(path, "wb") as f:
        f.write(content)
    return path, file.filename or filename


# ── Read ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=schemas.SubmissionOut)
def get_submission(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _get_team_submission(user, db)


@router.get("/checks", response_model=List[schemas.CheckResultOut])
def get_checks(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    submission = _get_team_submission(user, db)
    return submission.checks


# ── Code — git URL ────────────────────────────────────────────────────────────

@router.put("/code", response_model=schemas.SubmissionOut)
def set_repo(
    data: schemas.SetRepoIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("participant")),
):
    submission = _get_team_submission(user, db)
    submission.repo_url = data.repo_url
    db.commit()
    db.refresh(submission)
    check = _upsert_check(db, submission.id, "code")
    queue.dispatch_code_check(background_tasks, check.id, data.repo_url)
    return submission


# ── Code — zip archive ────────────────────────────────────────────────────────

@router.post("/code/archive", response_model=schemas.SubmissionOut)
def upload_archive(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("participant")),
):
    submission = _get_team_submission(user, db)

    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in ALLOWED_ZIP_EXTS:
        raise HTTPException(status_code=400, detail="Only .zip archives are allowed")

    content = file.file.read()
    if len(content) > 100 * 1024 * 1024:  # 100 MB
        raise HTTPException(status_code=400, detail="Archive too large (max 100 MB)")

    # Save archive
    filename = f"{uuid.uuid4()}.zip"
    archive_path = os.path.join(settings.upload_dir, filename)
    with open(archive_path, "wb") as f:
        f.write(content)

    # Validate it's a real zip
    if not zipfile.is_zipfile(archive_path):
        os.remove(archive_path)
        raise HTTPException(status_code=400, detail="Invalid ZIP file")

    submission.archive_path = archive_path
    submission.archive_filename = file.filename or filename
    submission.repo_url = None  # archive takes precedence
    db.commit()
    db.refresh(submission)

    check = _upsert_check(db, submission.id, "code")
    queue.dispatch_archive_check(background_tasks, check.id, archive_path)
    return submission


# ── Docs ──────────────────────────────────────────────────────────────────────

@router.post("/docs", response_model=schemas.SubmissionOut)
def upload_docs(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("participant")),
):
    submission = _get_team_submission(user, db)
    path, orig_name = _save_upload(file, ALLOWED_DOC_EXTS)
    submission.docs_path = path
    submission.docs_filename = orig_name
    db.commit()
    db.refresh(submission)
    check = _upsert_check(db, submission.id, "docs")
    queue.dispatch_doc_check(background_tasks, check.id, path)
    return submission


# ── Presentation ──────────────────────────────────────────────────────────────

@router.post("/presentation", response_model=schemas.SubmissionOut)
def upload_presentation(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("participant")),
):
    submission = _get_team_submission(user, db)
    path, orig_name = _save_upload(file, ALLOWED_PPTX_EXTS)
    submission.presentation_path = path
    submission.presentation_filename = orig_name
    db.commit()
    db.refresh(submission)
    check = _upsert_check(db, submission.id, "presentation")
    queue.dispatch_presentation_check(background_tasks, check.id, path)
    return submission


# ── Screencast — file ─────────────────────────────────────────────────────────

@router.post("/screencast", response_model=schemas.SubmissionOut)
def upload_screencast(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("participant")),
):
    submission = _get_team_submission(user, db)
    path, orig_name = _save_upload(file, ALLOWED_VIDEO_EXTS)
    submission.screencast_path = path
    submission.screencast_filename = orig_name
    submission.screencast_url = None
    db.commit()
    db.refresh(submission)
    check = _upsert_check(db, submission.id, "screencast")
    queue.dispatch_video_check(background_tasks, check.id, path, submission.id)
    return submission


# ── Screencast — URL (YouTube / Vimeo / direct link) ─────────────────────────

class ScreencastUrlIn(BaseModel):
    url: str


@router.put("/screencast/url", response_model=schemas.SubmissionOut)
def set_screencast_url(
    data: ScreencastUrlIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("participant")),
):
    import re
    if not re.match(r"https?://", data.url):
        raise HTTPException(status_code=400, detail="Must be a valid http/https URL")
    submission = _get_team_submission(user, db)
    submission.screencast_url = data.url
    submission.screencast_path = None
    submission.screencast_filename = None
    # Mark screencast check as passed with note (can't auto-check external URL)
    check = _upsert_check(db, submission.id, "screencast")
    check.status = "passed"
    check.score = 5.0
    check.details = {"note": "External URL provided — manual review required", "url": data.url}
    check.checked_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(submission)
    return submission


# ── File downloads (for jury / organizer) ────────────────────────────────────

@router.get("/team/{team_id}/download/{file_type}")
def download_artifact(
    team_id: int,
    file_type: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("jury", "organizer")),
):
    submission = db.query(models.Submission).filter_by(team_id=team_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    mapping = {
        "docs": (submission.docs_path, submission.docs_filename),
        "presentation": (submission.presentation_path, submission.presentation_filename),
        "screencast": (submission.screencast_path, submission.screencast_filename),
        "archive": (submission.archive_path, submission.archive_filename),
    }
    if file_type not in mapping:
        raise HTTPException(status_code=400, detail="Unknown file type")

    path, filename = mapping[file_type]
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path, filename=filename or os.path.basename(path))
