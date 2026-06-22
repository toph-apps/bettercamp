import os
from collections.abc import Iterator
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

_DEFAULT_DB = Path(__file__).resolve().parents[3] / "data" / "catalog.db"


def db_path() -> Path:
    return Path(os.environ.get("BETTERCAMP_DB", _DEFAULT_DB))


def get_engine(*, echo: bool = False):
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    url = f"sqlite:///{path}"
    return create_engine(url, echo=echo, connect_args={"check_same_thread": False})


def init_db() -> None:
    SQLModel.metadata.create_all(get_engine())


def get_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session
