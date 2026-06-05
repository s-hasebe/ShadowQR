"""WebSocket /api/progress/{job_id} — 進捗ストリーミング"""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.jobs.store import get_job

router = APIRouter()


@router.websocket("/progress/{job_id}")
async def progress_ws(websocket: WebSocket, job_id: str) -> None:
    await websocket.accept()
    state = get_job(job_id)
    if not state:
        await websocket.send_text(json.dumps({"error": "ジョブが見つかりません。"}))
        await websocket.close()
        return

    queue: asyncio.Queue = asyncio.Queue()
    state.progress_listeners.append(queue)

    try:
        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=30.0)
                await websocket.send_text(json.dumps(msg))
                # 完了・失敗時はループ終了
                if msg.get("step") in ("completed", "failed"):
                    break
            except asyncio.TimeoutError:
                # Keep-alive ping
                await websocket.send_text(json.dumps({"step": "ping", "progress": 0.0, "message": ""}))
    except WebSocketDisconnect:
        pass
    finally:
        state.progress_listeners.remove(queue)
