"""Celery task wrappers around the shared check runners."""
from .celery_app import celery
from .checks import runner


@celery.task(name="checks.code")
def code_check_task(check_id: int, repo_url: str):
    runner.run_code_check(check_id, repo_url)


@celery.task(name="checks.archive")
def archive_check_task(check_id: int, archive_path: str):
    runner.run_archive_check(check_id, archive_path)


@celery.task(name="checks.doc")
def doc_check_task(check_id: int, file_path: str):
    runner.run_doc_check(check_id, file_path)


@celery.task(name="checks.presentation")
def presentation_check_task(check_id: int, file_path: str):
    runner.run_presentation_check(check_id, file_path)


@celery.task(name="checks.video")
def video_check_task(check_id: int, file_path: str, submission_id: int):
    runner.run_video_check(check_id, file_path, submission_id)


@celery.task(name="checks.algo_judge")
def algo_judge_task(submission_id: int):
    runner.run_algo_judge(submission_id)
