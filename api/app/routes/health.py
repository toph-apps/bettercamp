from datetime import datetime, timezone

from bettercamp_shared import ScraperRun, get_session
from fastapi import APIRouter, Depends
from sqlmodel import Session, desc, select

router = APIRouter(tags=["health"])


@router.get("/health/scrape")
def health(session: Session = Depends(get_session)):
    last = session.exec(select(ScraperRun).order_by(desc(ScraperRun.started_at))).first()
    if not last:
        return {"last_run": None, "status": "never", "stale_days": None}
    age_s = (datetime.now(timezone.utc) - last.started_at.replace(tzinfo=timezone.utc)).total_seconds()
    return {
        "last_run": last.started_at.isoformat(),
        "finished_at": last.finished_at.isoformat() if last.finished_at else None,
        "status": last.status,
        "stale_days": int(age_s // 86400),
        "missing_fields": last.missing_fields,
        "counts": last.counts_json,
    }
