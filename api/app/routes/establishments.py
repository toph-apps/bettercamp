from bettercamp_shared import Establishment, Sector, Site, get_session
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

router = APIRouter(tags=["establishments"])


@router.get("/establishments")
def list_establishments(session: Session = Depends(get_session)):
    rows = session.exec(select(Establishment)).all()
    out = []
    for e in rows:
        sector_count = session.exec(
            select(func.count(Sector.id)).where(Sector.establishment_id == e.id)
        ).one()
        site_count = session.exec(
            select(func.coalesce(func.sum(Sector.site_count), 0)).where(
                Sector.establishment_id == e.id
            )
        ).one()
        out.append(
            {
                "id": e.id,
                "name": e.name,
                "region": e.region,
                "lat": e.lat,
                "lon": e.lon,
                "sector_count": sector_count,
                "site_count": int(site_count or 0),
            }
        )
    return out


@router.get("/establishments/{est_id}")
def get_establishment(est_id: str, session: Session = Depends(get_session)):
    est = session.get(Establishment, est_id)
    if not est:
        raise HTTPException(404, "Establishment not found")
    sectors = session.exec(
        select(Sector).where(Sector.establishment_id == est_id)
    ).all()
    return {**est.model_dump(), "sectors": [s.model_dump() for s in sectors]}
