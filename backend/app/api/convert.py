"""POST /api/convert — ジョブ投入エンドポイント"""
from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from app.jobs.store import create_job, get_job, is_at_capacity
from app.models.schemas import ConvertParams, ConvertResponse
from app.pipeline import run_pipeline

router = APIRouter()

MAX_STL_SIZE = 100 * 1024 * 1024  # 100MB


@router.post("/convert", response_model=ConvertResponse)
async def start_convert(
    background_tasks: BackgroundTasks,
    stl_file: UploadFile = File(...),
    qr_text: str = Form(..., max_length=2953),
    params: str = Form(default="{}"),
) -> ConvertResponse:
    if is_at_capacity():
        raise HTTPException(status_code=503, detail="サーバーが混雑しています。しばらく後に再試行してください。")

    # ファイルサイズチェック
    content = await stl_file.read()
    if len(content) > MAX_STL_SIZE:
        raise HTTPException(status_code=413, detail="STLファイルが100MBを超えています。")

    if not qr_text.strip():
        raise HTTPException(status_code=422, detail="QRコードのテキストを入力してください。")

    try:
        params_dict = json.loads(params)
        convert_params = ConvertParams(**params_dict)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"パラメータが不正です: {e}")

    job_id = str(uuid.uuid4())
    state = create_job(job_id, qr_text)

    # 入力STLを一時保存
    state.input_stl_path().write_bytes(content)

    background_tasks.add_task(run_pipeline, job_id, convert_params)

    return ConvertResponse(job_id=job_id)
