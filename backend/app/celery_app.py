"""Celery application for asynchronous check processing.

Only instantiated when settings.use_celery is True. The worker is started with:
    celery -A app.celery_app.celery worker --loglevel=info
"""
from celery import Celery

from .config import settings

celery = Celery(
    "judge",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    task_track_started=True,
    task_time_limit=600,        # hard limit per task: 10 min
    task_soft_time_limit=540,
)

# Ensure task module is imported so tasks register with this app.
import app.tasks  # noqa: E402,F401
