from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..auth import hash_password, verify_password, create_token, get_current_user
from ..config import settings
import os
import uuid

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenOut)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    # Public registration always creates a participant. Jury/organizer accounts
    # are provisioned via seed.py (or a future organizer-only endpoint) so that
    # nobody can self-elevate to a privileged role.
    user = models.User(
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        role="participant",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id), "user": user}


@router.post("/login", response_model=schemas.TokenOut)
def login(data: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(user.id), "user": user}


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=schemas.UserOut)
def update_me(
    data: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Update the current user's editable profile fields (partial update)."""
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/password", status_code=204)
def change_password(
    data: schemas.PasswordChange,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Change the current user's password after verifying the old one."""
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен быть не короче 6 символов")
    user.password_hash = hash_password(data.new_password)
    db.commit()


_MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/avif": "avif",
    # NB: image/svg+xml is intentionally excluded — SVGs can carry inline
    # scripts and would execute as stored XSS when served from our origin.
}


@router.post("/avatar", response_model=schemas.UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    # Derive the extension only from the validated MIME type. Never trust the
    # client filename — an attacker could otherwise store e.g. an .svg/.html
    # file that is later served from /uploads on our own origin (stored XSS).
    ext = _MIME_TO_EXT.get(file.content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    # Remove old avatar if exists
    if user.avatar_path:
        old_file = os.path.join(settings.upload_dir, user.avatar_path[len("/uploads/"):])
        try:
            os.remove(old_file)
        except OSError:
            pass

    os.makedirs(os.path.join(settings.upload_dir, "avatars"), exist_ok=True)
    filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(settings.upload_dir, "avatars", filename)

    with open(filepath, "wb") as f:
        f.write(content)

    user.avatar_path = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(user)
    return user
