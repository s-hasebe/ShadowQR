"""IT-01〜IT-08: API結合テスト"""
from __future__ import annotations

import io
import json
import time
import uuid

import pytest
import trimesh
from fastapi.testclient import TestClient

from app.jobs.store import JobState, _store
from app.main import app
from app.models.schemas import JobStatus


# ---------------------------------------------------------------------------
# フィクスチャ
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clear_store():
    """各テスト前後にジョブストアをクリアして状態漏れを防ぐ。"""
    _store.clear()
    yield
    for s in list(_store.values()):
        s.cleanup()
    _store.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# ヘルパー
# ---------------------------------------------------------------------------

def _stl_bytes(size: float = 30.0) -> bytes:
    mesh = trimesh.creation.box(extents=[size, size, size])
    buf = io.BytesIO()
    mesh.export(buf, file_type="stl")
    return buf.getvalue()


# 粗いpitchでパイプラインを高速化（pitch=3mm on 30mm box → ~10³ voxels）
_FAST_PARAMS = json.dumps({
    "light": [0.0, 60.0, 200.0],
    "wall_normal": [0.0, 0.0, -1.0],
    "wall_offset": 500.0,
    "qr_size": 80.0,
    "qr_error_level": "L",
    "voxel_pitch": 3.0,
    "rotation_matrix": [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]],
})


def _post_convert(
    client: TestClient,
    *,
    stl: bytes | None = None,
    qr_text: str = "https://example.com",
    params: str = _FAST_PARAMS,
) -> dict:
    resp = client.post(
        "/api/convert",
        data={"qr_text": qr_text, "params": params},
        files={"stl_file": ("test.stl", stl or _stl_bytes(), "model/stl")},
    )
    return resp


def _wait_done(client: TestClient, job_id: str, timeout: float = 120.0) -> dict:
    """ジョブが terminal 状態になるまでポーリングする。"""
    deadline = time.time() + timeout
    while time.time() < deadline:
        resp = client.get(f"/api/result/{job_id}")
        data = resp.json()
        if data["status"] in ("completed", "failed"):
            return data
        time.sleep(0.3)
    raise TimeoutError(f"Job {job_id} did not finish within {timeout}s")


def _inject_job(status: JobStatus, *, qr_verified: bool | None = None) -> JobState:
    """ジョブストアにダミーの JobState を直接注入するヘルパー。"""
    jid = str(uuid.uuid4())
    state = JobState(job_id=jid, status=status, qr_verified=qr_verified)
    state.work_dir.mkdir(parents=True, exist_ok=True)
    _store[jid] = state
    return state


# ---------------------------------------------------------------------------
# IT-01: ヘルスチェック
# ---------------------------------------------------------------------------

def test_health_returns_ok(client):
    """IT-01: GET /health → 200 {"status": "ok"}"""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# IT-02: POST /api/convert — 基本レスポンス
# ---------------------------------------------------------------------------

def test_convert_returns_job_id(client):
    """IT-02a: POST /api/convert が job_id を含む JSON を返すこと"""
    resp = _post_convert(client)
    assert resp.status_code == 200
    body = resp.json()
    assert "job_id" in body
    assert len(body["job_id"]) > 0


def test_convert_registers_job_in_store(client):
    """IT-02b: POST 後にジョブストアへ登録されること"""
    resp = _post_convert(client)
    job_id = resp.json()["job_id"]
    assert job_id in _store


# ---------------------------------------------------------------------------
# IT-03: パイプライン完了確認
# ---------------------------------------------------------------------------

def test_pipeline_reaches_terminal_status(client):
    """IT-03: パイプラインが completed または failed で終了すること"""
    resp = _post_convert(client)
    assert resp.status_code == 200
    job_id = resp.json()["job_id"]
    result = _wait_done(client, job_id)
    assert result["status"] in ("completed", "failed")


def test_pipeline_result_contains_required_fields(client):
    """IT-03b: result レスポンスに job_id / status が含まれること"""
    job_id = _post_convert(client).json()["job_id"]
    result = _wait_done(client, job_id)
    assert "job_id" in result
    assert "status" in result
    assert result["job_id"] == job_id


# ---------------------------------------------------------------------------
# IT-04: GET /api/result — ステータス確認
# ---------------------------------------------------------------------------

def test_result_unknown_job_returns_404(client):
    """IT-04a: 未知の job_id で GET /api/result → 404"""
    resp = client.get("/api/result/nonexistent-id")
    assert resp.status_code == 404


def test_result_pending_job_returns_pending(client):
    """IT-04b: pending 状態のジョブが pending を返すこと"""
    state = _inject_job(JobStatus.pending)
    resp = client.get(f"/api/result/{state.job_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"


def test_result_failed_job_has_error(client):
    """IT-04c: failed 状態のジョブは error フィールドを持てること"""
    state = _inject_job(JobStatus.failed)
    state.error = "テストエラー"
    resp = client.get(f"/api/result/{state.job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert data["error"] == "テストエラー"


# ---------------------------------------------------------------------------
# IT-05: GET /api/download — ダウンロード制御
# ---------------------------------------------------------------------------

def test_download_unknown_job_returns_404(client):
    """IT-05a: 未知の job_id でダウンロード → 404"""
    resp = client.get("/api/download/nonexistent-id")
    assert resp.status_code == 404


def test_download_pending_job_returns_400(client):
    """IT-05b: pending 状態のジョブはダウンロード不可 → 400"""
    state = _inject_job(JobStatus.pending)
    resp = client.get(f"/api/download/{state.job_id}")
    assert resp.status_code == 400


def test_download_running_job_returns_400(client):
    """IT-05c: running 状態のジョブはダウンロード不可 → 400"""
    state = _inject_job(JobStatus.running)
    resp = client.get(f"/api/download/{state.job_id}")
    assert resp.status_code == 400


def test_download_completed_unverified_returns_403(client):
    """IT-05d: completed だが qr_verified=False → 403"""
    state = _inject_job(JobStatus.completed, qr_verified=False)
    resp = client.get(f"/api/download/{state.job_id}")
    assert resp.status_code == 403


def test_download_completed_verified_returns_stl(client):
    """IT-05e: completed + qr_verified=True → 200 + STL バイナリ"""
    state = _inject_job(JobStatus.completed, qr_verified=True)
    # 出力STLファイルを用意
    state.output_stl_path().write_bytes(_stl_bytes())
    resp = client.get(f"/api/download/{state.job_id}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/octet-stream"
    assert len(resp.content) > 0


# ---------------------------------------------------------------------------
# IT-06: バリデーション
# ---------------------------------------------------------------------------

def test_convert_empty_qr_text_returns_422(client):
    """IT-06a: qr_text が空白 → 422"""
    resp = _post_convert(client, qr_text="   ")
    assert resp.status_code == 422


def test_convert_invalid_json_params_returns_422(client):
    """IT-06b: params が不正 JSON → 422"""
    resp = _post_convert(client, params="{invalid json}")
    assert resp.status_code == 422


def test_convert_negative_voxel_pitch_returns_422(client):
    """IT-06c: voxel_pitch が負値 → 422"""
    bad_params = json.dumps({"voxel_pitch": -1.0})
    resp = _post_convert(client, params=bad_params)
    assert resp.status_code == 422


def test_convert_invalid_rotation_matrix_returns_422(client):
    """IT-06d: rotation_matrix が 4×4 でない → 422"""
    bad_params = json.dumps({"rotation_matrix": [[1, 0, 0], [0, 1, 0], [0, 0, 1]]})
    resp = _post_convert(client, params=bad_params)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# IT-07: DELETE /api/job — ジョブ削除
# ---------------------------------------------------------------------------

def test_delete_job_removes_from_store(client):
    """IT-07a: DELETE 後にストアから削除され GET /api/result → 404"""
    job_id = _post_convert(client).json()["job_id"]
    _wait_done(client, job_id)

    del_resp = client.delete(f"/api/job/{job_id}")
    assert del_resp.status_code == 200

    get_resp = client.get(f"/api/result/{job_id}")
    assert get_resp.status_code == 404


def test_delete_unknown_job_returns_404(client):
    """IT-07b: 未知の job_id を削除 → 404"""
    resp = client.delete("/api/job/nonexistent-id")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# IT-08: 同時実行上限（503）
# ---------------------------------------------------------------------------

def test_capacity_limit_returns_503(client):
    """IT-08: 同時実行上限（デフォルト 2）超過で POST /api/convert → 503"""
    # runningジョブを2つ注入して上限を埋める
    running = [_inject_job(JobStatus.running) for _ in range(2)]
    resp = _post_convert(client)
    assert resp.status_code == 503
    # クリーンアップ
    for s in running:
        s.cleanup()
        _store.pop(s.job_id, None)
