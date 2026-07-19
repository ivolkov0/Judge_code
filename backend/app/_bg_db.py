from .database import SessionLocal


def get_bg_db():
    return SessionLocal()
