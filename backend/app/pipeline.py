"""変換パイプライン F10〜F18 の統合実行"""
from __future__ import annotations

import math

import numpy as np

from app.core.homography import check_qr_module_size, compute_inverse_homography
from app.core.meshing import voxel_to_stl
from app.core.qr import generate_qr_bitmap
from app.core.raycast import apply_shadow_carving
from app.core.verify import simulate_shadow_image, verify_qr
from app.core.voxelize import load_and_voxelize, validate_light_position
from app.core.wall_uv import build_wall_uv, compute_projection_angle
from app.jobs.store import get_job, send_progress
from app.models.schemas import ConvertParams, JobStatus


async def run_pipeline(job_id: str, params: ConvertParams) -> None:
    state = get_job(job_id)
    if not state:
        return

    state.status = JobStatus.running

    try:
        await _run(job_id, state, params)
        state.status = JobStatus.completed
        await send_progress(job_id, "completed", 1.0, "処理完了")
    except Exception as exc:
        state.status = JobStatus.failed
        state.error = str(exc)
        await send_progress(job_id, "failed", 0.0, f"エラー: {exc}")


async def _run(job_id: str, state, params: ConvertParams) -> None:
    # --- F10 QRコード生成 ---
    await send_progress(job_id, "qr_generate", 0.05, "QRコード生成中…")
    qr_bitmap = generate_qr_bitmap(state.qr_text, params.qr_error_level.value)

    # --- QRモジュールサイズ検証（T4） ---
    ok, warning_msg = check_qr_module_size(qr_bitmap, params.qr_size, params.voxel_pitch)
    if not ok:
        state.warning = warning_msg

    # --- 投影角度警告（T5） ---
    angle = compute_projection_angle(params.light, params.wall_normal)
    if angle < 20 or angle > 85:
        state.warning = (state.warning or "") + (
            f" 照射角度{angle:.1f}°は推奨範囲（70〜80°）外です。"
        )

    # --- F11 STLボクセル化 ---
    await send_progress(job_id, "voxelize", 0.1, "STLボクセル化中…")
    rotation = params.rotation_matrix
    grid, origin, pitch = load_and_voxelize(
        str(state.input_stl_path()),
        params.voxel_pitch,
        rotation_matrix=rotation,
    )

    # --- 光源位置バリデーション（T3） ---
    validate_light_position(params.light, origin, grid, pitch)

    # --- F12 壁面UV座標系 ---
    await send_progress(job_id, "homography", 0.2, "壁面座標系を構築中…")
    n_hat, u_hat, v_hat, wall_origin = build_wall_uv(params.wall_normal, params.wall_offset)

    # --- F13 逆透視変換 ---
    await send_progress(job_id, "homography", 0.35, "逆透視変換中…")
    projected_qr = compute_inverse_homography(
        qr_bitmap=qr_bitmap,
        light=params.light,
        wall_normal=params.wall_normal,
        wall_offset=params.wall_offset,
        qr_size=params.qr_size,
        u_hat=u_hat,
        v_hat=v_hat,
        wall_origin=wall_origin,
        voxel_pitch=pitch,
        grid_shape=grid.shape,
        grid_origin=origin,
    )

    # --- F14, F15 レイキャスト ---
    await send_progress(job_id, "raycast", 0.5, "レイキャスト処理中…")
    grid = apply_shadow_carving(
        grid=grid,
        projected_qr=projected_qr,
        light=params.light,
        wall_origin=wall_origin,
        u_hat=u_hat,
        v_hat=v_hat,
        qr_size=params.qr_size,
        grid_origin=origin,
        pitch=pitch,
    )

    # --- F16, F17 メッシュ変換 & エクスポート ---
    await send_progress(job_id, "meshing", 0.8, "メッシュ再構築中…")
    output_path = state.output_stl_path()
    voxel_to_stl(grid, origin, pitch, output_path)

    # --- F18 QR自動検証 ---
    await send_progress(job_id, "verify", 0.9, "QRコード検証中…")
    shadow_img = simulate_shadow_image(
        grid=grid,
        origin=origin,
        pitch=pitch,
        light=params.light,
        wall_normal=params.wall_normal,
        wall_offset=params.wall_offset,
        qr_size=params.qr_size,
    )
    verified, decoded = verify_qr(shadow_img, state.qr_text)
    state.qr_verified = verified
    state.qr_decoded_text = decoded

    if not verified:
        state.warning = (state.warning or "") + (
            " QRコードの読み取りに失敗しました。パラメータ（ボクセル解像度・QRサイズ・エラー訂正レベル）を調整してください。"
        )
