"""F14, F15: レイキャスト（削り＆影保証）"""
from __future__ import annotations

import numpy as np


def _dda_ray_voxels(
    start: np.ndarray,
    end: np.ndarray,
    grid_origin: np.ndarray,
    pitch: float,
    grid_shape: tuple[int, int, int],
) -> list[tuple[int, int, int]]:
    """
    Amanatides-Woo 3D DDA アルゴリズムで光線上のボクセルインデックスを返す。

    Returns:
        list of (zi, yi, xi) tuples
    """
    nz, ny, nx = grid_shape
    ox, oy, oz = grid_origin

    # スタート・エンドをボクセル座標に変換
    def to_vox(pt: np.ndarray) -> np.ndarray:
        return (pt - np.array([ox, oy, oz])) / pitch

    s = to_vox(start)
    e = to_vox(end)
    d = e - s
    length = np.linalg.norm(d)
    if length < 1e-9:
        return []

    d_norm = d / length
    voxels = []

    # 現在のボクセル
    ix, iy, iz = int(np.floor(s[0])), int(np.floor(s[1])), int(np.floor(s[2]))

    step_x = 1 if d_norm[0] >= 0 else -1
    step_y = 1 if d_norm[1] >= 0 else -1
    step_z = 1 if d_norm[2] >= 0 else -1

    def t_max(pos, step, d_):
        if abs(d_) < 1e-12:
            return 1e30
        boundary = np.floor(pos) + (1 if step > 0 else 0)
        return (boundary - pos) / d_

    tx = t_max(s[0], step_x, d_norm[0])
    ty = t_max(s[1], step_y, d_norm[1])
    tz = t_max(s[2], step_z, d_norm[2])

    delta_x = abs(1.0 / d_norm[0]) if abs(d_norm[0]) > 1e-12 else 1e30
    delta_y = abs(1.0 / d_norm[1]) if abs(d_norm[1]) > 1e-12 else 1e30
    delta_z = abs(1.0 / d_norm[2]) if abs(d_norm[2]) > 1e-12 else 1e30

    t_current = 0.0
    max_steps = int(length * 3) + 10

    for _ in range(max_steps):
        if 0 <= iz < nz and 0 <= iy < ny and 0 <= ix < nx:
            voxels.append((iz, iy, ix))

        if tx <= ty and tx <= tz:
            ix += step_x
            t_current = tx
            tx += delta_x
        elif ty <= tz:
            iy += step_y
            t_current = ty
            ty += delta_y
        else:
            iz += step_z
            t_current = tz
            tz += delta_z

        if t_current > length + 1e-6:
            break

    return voxels


def apply_shadow_carving(
    grid: np.ndarray,
    projected_qr: np.ndarray,
    light: list[float],
    wall_origin: np.ndarray,
    u_hat: np.ndarray,
    v_hat: np.ndarray,
    qr_size: float,
    grid_origin: np.ndarray,
    pitch: float,
) -> np.ndarray:
    """
    F14: 白画素 → 光線上のボクセルを0に削る。
    F15: 黒画素 → 光線上に最低1ボクセルを残す。

    projected_qr: (ny, nx) uint8 — 1=黒モジュール
    """
    L = np.array(light, dtype=np.float64)
    grid_shape = grid.shape  # (nz, ny, nx)
    ox, oy, oz = grid_origin

    ny_qr, nx_qr = projected_qr.shape

    for yi in range(ny_qr):
        for xi in range(nx_qr):
            # ボクセル座標 → 世界座標
            wx = ox + xi * pitch
            wy = oy + yi * pitch
            wz = oz  # 底面Z固定（投影面）

            wall_target = np.array([wx, wy, wz])

            ray_voxels = _dda_ray_voxels(L, wall_target, grid_origin, pitch, grid_shape)

            if projected_qr[yi, xi] == 0:
                # 白画素: 光線上を削る
                for (iz, iy, ix) in ray_voxels:
                    grid[iz, iy, ix] = 0
            else:
                # 黒画素: 少なくとも1ボクセル残す
                has_solid = any(grid[iz, iy, ix] == 1 for (iz, iy, ix) in ray_voxels)
                if not has_solid and ray_voxels:
                    iz, iy, ix = ray_voxels[0]  # 光源に最も近い側
                    grid[iz, iy, ix] = 1

    return grid
