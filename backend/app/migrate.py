"""Lightweight startup migration.

create_all() adds missing tables but never adds new columns to existing tables.
This helper inspects each mapped table and issues ADD COLUMN for any column that
exists in the model but not yet in the database. Works for SQLite and PostgreSQL.
Idempotent — safe to run on every startup.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from .database import Base


def _sql_type(column) -> str:
    """Best-effort SQL type string for ADD COLUMN."""
    try:
        return column.type.compile()
    except Exception:
        return "TEXT"


def run_migrations(engine: Engine) -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue  # create_all handles brand-new tables
            existing_cols = {c["name"] for c in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_cols:
                    continue
                col_type = _sql_type(column)
                default = ""
                if column.default is not None and getattr(column.default, "arg", None) is not None:
                    arg = column.default.arg
                    if isinstance(arg, (int, float)):
                        default = f" DEFAULT {arg}"
                    elif isinstance(arg, str):
                        default = f" DEFAULT '{arg}'"
                ddl = f'ALTER TABLE {table.name} ADD COLUMN {column.name} {col_type}{default}'
                try:
                    conn.execute(text(ddl))
                    print(f"[migrate] added column {table.name}.{column.name}")
                except Exception as exc:
                    # Column may already exist or type unsupported — ignore.
                    print(f"[migrate] skipped {table.name}.{column.name}: {exc}")
