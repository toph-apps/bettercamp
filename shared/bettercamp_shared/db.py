import os
from collections.abc import Iterator
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

# db.py lives at <repo>/shared/bettercamp_shared/db.py → parents[2] is repo root.
_DEFAULT_DB = Path(__file__).resolve().parents[2] / "data" / "catalog.db"


def db_path() -> Path:
    return Path(os.environ.get("BETTERCAMP_DB", _DEFAULT_DB))


def get_engine(*, echo: bool = False):
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    url = f"sqlite:///{path}"
    return create_engine(url, echo=echo, connect_args={"check_same_thread": False})


_PENDING_COLUMNS: list[tuple[str, str, str]] = [
    # (table, column, sql_type) — added with ALTER TABLE ... ADD COLUMN if missing.
    ("establishment", "map_image_url", "VARCHAR"),
    ("establishment", "sector_dots_json", "VARCHAR NOT NULL DEFAULT '[]'"),
    ("sector", "site_dots_json", "VARCHAR NOT NULL DEFAULT '[]'"),
]


def _migrate(engine) -> None:
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    with engine.begin() as conn:
        for table, col, sqltype in _PENDING_COLUMNS:
            if not insp.has_table(table):
                continue
            cols = {c["name"] for c in insp.get_columns(table)}
            if col not in cols:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {sqltype}"))


def init_db() -> None:
    engine = get_engine()
    SQLModel.metadata.create_all(engine)
    _migrate(engine)


def get_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session
