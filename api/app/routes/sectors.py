from bettercamp_shared import Sector, Site, get_session
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

router = APIRouter(tags=["sectors"])


@router.get("/sectors/{sector_id}")
def get_sector(sector_id: str, session: Session = Depends(get_session)):
    sec = session.get(Sector, sector_id)
    if not sec:
        raise HTTPException(404, "Sector not found")
    sites = session.exec(select(Site).where(Site.sector_id == sector_id)).all()
    return {**sec.model_dump(), "sites": [s.model_dump() for s in sites]}
