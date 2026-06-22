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
    sector_ids = [s.id for s in sectors]
    wf_counts: dict[str, int] = (
        dict(
            session.exec(
                select(Site.sector_id, func.count(Site.id))
                .where(Site.waterfront == True, Site.sector_id.in_(sector_ids))  # noqa: E712
                .group_by(Site.sector_id)
            ).all()
        )
        if sector_ids
        else {}
    )
    return {
        **est.model_dump(),
        "sectors": [
            {**s.model_dump(), "waterfront_count": int(wf_counts.get(s.id, 0))}
            for s in sectors
        ],
    }
