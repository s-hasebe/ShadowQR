"""GET /api/result/{job_id}, GET /api/download/{job_id}, DELETE /api/job/{job_id}"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.jobs.store import get_job, _store
from app.models.schemas import JobStatus, ResultResponse

router = APIRouter()


@router.get("/result/{job_id}", response_model=ResultResponse)
async def get_result(job_id: str) -> ResultResponse:
    state = get_job(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="ジョブが見つかりません。")
    return ResultResponse(
        job_id=job_id,
        status=state.status,
        qr_verified=state.qr_verified,
        qr_decoded_text=state.qr_decoded_text,
        error=state.error,
        warning=state.warning,
    )


@router.get("/download/{job_id}")
async def download_stl(job_id: str) -> FileResponse:
    state = get_job(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="ジョブが見つかりません。")
    if state.status != JobStatus.completed:
        raise HTTPException(status_code=400, detail="処理が完了していません。")
    if not state.qr_verified:
        raise HTTPException(status_code=403, detail="QRコード検証が失敗しているためダウンロードできません。")
    path = state.output_stl_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="出力ファイルが見つかりません。")
    return FileResponse(
        path=str(path),
        media_type="application/octet-stream",
        filename="shadow_qr_output.stl",
    )


@router.delete("/job/{job_id}")
async def delete_job(job_id: str) -> dict:
    state = _store.pop(job_id, None)
    if not state:
        raise HTTPException(status_code=404, detail="ジョブが見つかりません。")
    state.cleanup()
    return {"message": "削除しました。"}
