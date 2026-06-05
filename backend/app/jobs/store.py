from __future__ import annotations

import asyncio
import os
import shutil
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from app.models.schemas import JobStatus


@dataclass
class JobState:
    job_id: str
    status: JobStatus = JobStatus.pending
    qr_text: str = ""
    qr_verified: Optional[bool] = None
    qr_decoded_text: Optional[str] = None
    error: Optional[str] = None
    warning: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    progress_listeners: list[asyncio.Queue] = field(default_factory=list)

    @property
    def work_dir(self) -> Path:
        base = Path(os.environ.get("SHADOWQR_WORK_DIR", "/tmp/shadowqr"))
        return base / self.job_id

    def output_stl_path(self) -> Path:
        return self.work_dir / "output.stl"

    def input_stl_path(self) -> Path:
        return self.work_dir / "input.stl"

    def cleanup(self) -> None:
        if self.work_dir.exists():
            shutil.rmtree(self.work_dir, ignore_errors=True)


_store: dict[str, JobState] = {}
_MAX_CONCURRENT = int(os.environ.get("MAX_CONCURRENT_JOBS", "2"))
_TTL_SECONDS = int(os.environ.get("JOB_TTL_SECONDS", str(3600)))


def create_job(job_id: str, qr_text: str) -> JobState:
    state = JobState(job_id=job_id, qr_text=qr_text)
    state.work_dir.mkdir(parents=True, exist_ok=True)
    _store[job_id] = state
    return state


def get_job(job_id: str) -> Optional[JobState]:
    return _store.get(job_id)


def running_count() -> int:
    return sum(1 for s in _store.values() if s.status == JobStatus.running)


def is_at_capacity() -> bool:
    return running_count() >= _MAX_CONCURRENT


async def send_progress(job_id: str, step: str, progress: float, message: str) -> None:
    state = _store.get(job_id)
    if not state:
        return
    payload = {"step": step, "progress": progress, "message": message}
    for q in list(state.progress_listeners):
        await q.put(payload)


async def cleanup_expired_jobs() -> None:
    now = time.time()
    expired = [
        jid
        for jid, s in _store.items()
        if s.status in (JobStatus.completed, JobStatus.failed)
        and now - s.created_at > _TTL_SECONDS
    ]
    for jid in expired:
        state = _store.pop(jid)
        state.cleanup()
