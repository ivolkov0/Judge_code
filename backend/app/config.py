from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    database_url: str = "sqlite:///./judge.db"
    secret_key: str = "change-this-secret-key-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week
    upload_dir: str = "./uploads"
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"

    use_celery: bool = False
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    run_team_tests: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

os.makedirs(settings.upload_dir, exist_ok=True)
