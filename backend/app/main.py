from __future__ import annotations

import asyncio
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.convert import router as convert_router
from app.api.progress import router as progress_router
from app.api.result import router as result_router
from app.jobs.store import cleanup_expired_jobs

app = FastAPI(title="ShadowQR API", version="0.1.0")

_cors_raw = os.environ.get("CORS_ORIGINS", "*")
_cors_origins: list[str] = ["*"] if _cors_raw == "*" else [o.strip() for o in _cors_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert_router, prefix="/api")
app.include_router(progress_router, prefix="/api")
app.include_router(result_router, prefix="/api")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.on_event("startup")
async def startup_event() -> None:
    asyncio.create_task(_cleanup_loop())


async def _cleanup_loop() -> None:
    while True:
        await asyncio.sleep(300)
        await cleanup_expired_jobs()
