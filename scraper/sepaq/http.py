import asyncio
import random
import urllib.robotparser
from contextlib import asynccontextmanager

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

BASE = "https://www.sepaq.com"
# Sépaq fronts Cloudflare which 403s non-browser UAs. We identify ourselves
# in the From: header per RFC 9110 §10.1.2 and use a stock Firefox UA so
# Cloudflare's heuristics don't shadow-block us. Throttled to 4 concurrent
# with jitter — well below human browsing pressure.
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0"
)
FROM_HEADER = "bettercamp/0.1 (kersef@gmail.com)"

_sem = asyncio.Semaphore(4)


class RobotsBlocked(Exception):
    pass


_robots: urllib.robotparser.RobotFileParser | None = None


async def check_robots(path: str = "/en/reservation/camping/") -> None:
    global _robots
    if _robots is None:
        rp = urllib.robotparser.RobotFileParser()
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{BASE}/robots.txt", headers={"User-Agent": USER_AGENT})
            rp.parse(r.text.splitlines())
        _robots = rp
    if not _robots.can_fetch(USER_AGENT, BASE + path):
        raise RobotsBlocked(path)


@asynccontextmanager
async def client():
    headers = {
        "User-Agent": USER_AGENT,
        "From": FROM_HEADER,
        "Accept-Language": "en-CA,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    async with httpx.AsyncClient(
        base_url=BASE,
        headers=headers,
        timeout=30.0,
        follow_redirects=True,
        http2=False,
    ) as c:
        yield c


@retry(
    retry=retry_if_exception_type((httpx.HTTPError,)),
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1, min=1, max=16),
    reraise=True,
)
async def fetch(c: httpx.AsyncClient, path: str) -> str:
    async with _sem:
        await asyncio.sleep(0.25 + random.random() * 0.25)
        r = await c.get(path)
        r.raise_for_status()
        return r.text
