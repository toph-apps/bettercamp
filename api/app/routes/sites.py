from bettercamp_shared import Site, get_session
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

router = APIRouter(tags=["sites"])


@router.get("/sites/{site_id}")
def get_site(site_id: str, session: Session = Depends(get_session)):
    site = session.get(Site, site_id)
    if not site:
        raise HTTPException(404, "Site not found")
    return site.model_dump()
