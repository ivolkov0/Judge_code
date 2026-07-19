"""Task dispatch abstraction.

If settings.use_celery is True, checks are enqueued to the Celery worker;
otherwise they run via FastAPI BackgroundTasks in the web process.
This keeps local development zero-dependency while supporting a real queue
in production (docker-compose adds Redis + a worker service).
"""
from fastapi import BackgroundTasks

from .config import settings
from .checks import runner


def _dispatch(background_tasks: BackgroundTasks, task_name: str, py_func, *args):
    if settings.use_celery:
        from . import tasks
        getattr(tasks, task_name).delay(*args)
    else:
        background_tasks.add_task(py_func, *args)


def dispatch_code_check(bt: BackgroundTasks, check_id: int, repo_url: str):
    _dispatch(bt, "code_check_task", runner.run_code_check, check_id, repo_url)


def dispatch_archive_check(bt: BackgroundTasks, check_id: int, archive_path: str):
    _dispatch(bt, "archive_check_task", runner.run_archive_check, check_id, archive_path)


def dispatch_doc_check(bt: BackgroundTasks, check_id: int, file_path: str):
    _dispatch(bt, "doc_check_task", runner.run_doc_check, check_id, file_path)


def dispatch_presentation_check(bt: BackgroundTasks, check_id: int, file_path: str):
    _dispatch(bt, "presentation_check_task", runner.run_presentation_check, check_id, file_path)


def dispatch_video_check(bt: BackgroundTasks, check_id: int, file_path: str, submission_id: int):
    _dispatch(bt, "video_check_task", runner.run_video_check, check_id, file_path, submission_id)


def dispatch_algo_judge(bt: BackgroundTasks, submission_id: int):
    _dispatch(bt, "algo_judge_task", runner.run_algo_judge, submission_id)
