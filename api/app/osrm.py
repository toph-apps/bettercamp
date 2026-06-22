import os

import httpx


class OSRMClient:
    """Thin OSRM HTTP client.

    Default base URL targets the local Docker container from
    docker-compose.yml. Override with OSRM_URL env.
    """

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or os.environ.get("OSRM_URL", "http://localhost:5000")).rstrip("/")

    async def table_from(
        self,
        origin_lat: float,
        origin_lon: float,
        destinations: dict[str, tuple[float, float]],
    ) -> dict[str, tuple[float, int]]:
        """One-to-many drive distance/duration.

        Returns {sector_id: (km, minutes)}.
        """
        if not destinations:
            return {}
        ids = list(destinations.keys())
        coords = [(origin_lon, origin_lat)] + [
            (destinations[i][1], destinations[i][0]) for i in ids
        ]
        coord_str = ";".join(f"{lon},{lat}" for lon, lat in coords)
        sources = "0"
        dests = ";".join(str(i + 1) for i in range(len(ids)))
        url = (
            f"{self.base_url}/table/v1/driving/{coord_str}"
            f"?sources={sources}&destinations={dests}"
            f"&annotations=duration,distance"
        )
        async with httpx.AsyncClient(timeout=30.0) as c:
            r = await c.get(url)
            r.raise_for_status()
            data = r.json()
        durations = data.get("durations", [[]])[0]  # seconds
        distances = data.get("distances", [[]])[0]  # meters
        out: dict[str, tuple[float, int]] = {}
        for idx, sid in enumerate(ids):
            d_m = distances[idx] if idx < len(distances) else None
            t_s = durations[idx] if idx < len(durations) else None
            if d_m is None or t_s is None:
                continue
            out[sid] = (round(d_m / 1000.0, 1), int(round(t_s / 60.0)))
        return out
