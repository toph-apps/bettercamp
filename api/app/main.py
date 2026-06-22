from contextlib import asynccontextmanager

from bettercamp_shared import init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import establishments, health, search, sectors, sites


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="bettercamp", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(establishments.router, prefix="/api")
app.include_router(sectors.router, prefix="/api")
app.include_router(sites.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(health.router, prefix="/api")


@app.get("/")
def root():
    return {"name": "bettercamp", "version": "0.1.0", "docs": "/docs"}
