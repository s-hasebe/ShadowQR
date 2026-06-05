"""F11: STLボクセル化"""
from __future__ import annotations

import numpy as np
import trimesh


def load_and_voxelize(
    stl_path: str,
    pitch: float,
    rotation_matrix: list[list[float]] | None = None,
) -> tuple[np.ndarray, np.ndarray, float]:
    """
    STLをロードし、オプションの回転行列を適用してボクセル化する。

    Returns:
        grid: uint8 numpy array (Z, Y, X) — 1=素材あり, 0=空洞
        origin: ボクセルグリッド原点（世界座標, mm）
        pitch: 実際に使用したボクセルサイズ
    """
    mesh = trimesh.load(stl_path, force="mesh")

    if rotation_matrix is not None:
        mat = np.array(rotation_matrix, dtype=np.float64)
        mesh.apply_transform(mat)

    voxels = mesh.voxelized(pitch=pitch)
    voxels = voxels.fill()  # 内部も充填

    grid = voxels.matrix.astype(np.uint8)  # shape (X, Y, Z) in trimesh
    # trimeshのmatrixは(nx, ny, nz)。ZYX順に転置して扱いやすくする。
    grid = grid.transpose(2, 1, 0)  # → (Z, Y, X)
    origin = np.array(voxels.transform[:3, 3], dtype=np.float64)

    return grid, origin, float(pitch)


def validate_light_position(
    light: list[float],
    origin: np.ndarray,
    grid: np.ndarray,
    pitch: float,
) -> None:
    """光源がボクセルグリッド（STL内部）に位置していないか検証する（T3対応）。"""
    lx, ly, lz = light
    ox, oy, oz = origin
    nz, ny, nx = grid.shape

    xi = int((lx - ox) / pitch)
    yi = int((ly - oy) / pitch)
    zi = int((lz - oz) / pitch)

    if 0 <= zi < nz and 0 <= yi < ny and 0 <= xi < nx:
        if grid[zi, yi, xi] == 1:
            raise ValueError(
                "光源がオブジェクト内部に位置しています。光源位置を変更してください。"
            )
