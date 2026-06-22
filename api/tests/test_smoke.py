import os
import tempfile
from datetime import datetime

import pytest
from bettercamp_shared import Amenities, Establishment, Sector, init_db
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    db = tmp_path / "test.db"
    monkeypatch.setenv("BETTERCAMP_DB", str(db))
    # Re-import to pick up env
    import importlib

    from bettercamp_shared import db as db_mod

    importlib.reload(db_mod)
    from app import main

    importlib.reload(main)
    init_db()

    with TestClient(main.app) as c:
        yield c


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["name"] == "bettercamp"


def test_empty_establishments(client):
    r = client.get("/api/establishments")
    assert r.status_code == 200
    assert r.json() == []


def test_health_no_runs(client):
    r = client.get("/api/health/scrape")
    assert r.status_code == 200
    assert r.json()["status"] == "never"


def test_amenities_match():
    a = Amenities(drinking_water=True, fire_pit=True)
    assert a.matches({"drinking_water": True})
    assert a.matches({"drinking_water": True, "fire_pit": True})
    assert not a.matches({"electricity": True})
    assert not a.matches({"toilets": "flush"})
