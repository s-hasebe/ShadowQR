"""F13: 逆透視変換（高歪み対応Homography）"""
from __future__ import annotations

import math

import cv2
import numpy as np


def compute_inverse_homography(
    qr_bitmap: np.ndarray,
    light: list[float],
    wall_normal: list[float],
    wall_offset: float,
    qr_size: float,
    u_hat: np.ndarray,
    v_hat: np.ndarray,
    wall_origin: np.ndarray,
    voxel_pitch: float,
    grid_shape: tuple[int, int, int],
    grid_origin: np.ndarray,
) -> np.ndarray:
    """
    QRビットマップを逆透視変換してボクセル空間のXY断面に投影したビットマップを返す。

    高歪み（70〜80°）に対応するため INTER_LANCZOS4 で補間する。

    Returns:
        projected: uint8 numpy array (grid_Y, grid_X) — 1=黒モジュール, 0=白
    """
    h, w = qr_bitmap.shape
    nz, ny, nx = grid_shape

    L = np.array(light, dtype=np.float64)
    n_hat = np.array(wall_normal, dtype=np.float64)
    n_hat = n_hat / np.linalg.norm(n_hat)

    # 壁面上のQR4隅（UV座標）
    half = qr_size / 2.0
    corners_uv = np.array([
        [-half, -half],
        [ half, -half],
        [ half,  half],
        [-half,  half],
    ], dtype=np.float64)

    # 壁面UV → 世界3D座標
    corners_world = wall_origin + corners_uv[:, 0:1] * u_hat + corners_uv[:, 1:2] * v_hat

    # 各隅点を光源から逆投影してボクセルグリッド面（Z=0面付近）に当てる
    # R(t) = L + t*(P - L); tを決めてXY面に投影
    # ボクセルグリッドのXY投影面 (Z=grid_origin[2]) に交差点を求める
    proj_z = grid_origin[2]  # ボクセルグリッド底面Z

    def back_project_to_z(world_pt: np.ndarray, z_plane: float) -> np.ndarray:
        d = world_pt - L
        if abs(d[2]) < 1e-9:
            return world_pt[:2]
        t = (z_plane - L[2]) / d[2]
        return (L + t * d)[:2]

    src_pts = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32)

    # dst_pts: ボクセルグリッドのピクセル座標に変換
    dst_list = []
    for cw in corners_world:
        xy = back_project_to_z(cw, proj_z)
        px = (xy[0] - grid_origin[0]) / voxel_pitch
        py = (xy[1] - grid_origin[1]) / voxel_pitch
        dst_list.append([px, py])
    dst_pts = np.array(dst_list, dtype=np.float32)

    H, _ = cv2.findHomography(src_pts, dst_pts)
    if H is None:
        raise ValueError("Homography行列を計算できませんでした。パラメータを確認してください。")

    output_size = (nx, ny)
    src_img = (qr_bitmap * 255).astype(np.uint8)
    warped = cv2.warpPerspective(
        src_img,
        H,
        output_size,
        flags=cv2.INTER_LANCZOS4,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=0,
    )
    return (warped > 127).astype(np.uint8)


def check_qr_module_size(
    qr_bitmap: np.ndarray,
    qr_size: float,
    voxel_pitch: float,
) -> tuple[bool, str]:
    """QRモジュールが最低3ボクセル以上になるか確認する（T4対応）。"""
    n_modules = qr_bitmap.shape[0]
    voxels_per_module = qr_size / (n_modules * voxel_pitch)
    if voxels_per_module < 3:
        required_pitch = qr_size / (n_modules * 3)
        return False, (
            f"1モジュールが{voxels_per_module:.1f}ボクセルしかありません（最低3必要）。"
            f"ボクセル解像度を{required_pitch:.2f}mm以下に設定してください。"
        )
    return True, ""
