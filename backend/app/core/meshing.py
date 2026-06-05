"""F16, F17: ボクセル→STLメッシュ変換 & エクスポート"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from skimage.measure import marching_cubes
from stl import mesh as stl_mesh


def voxel_to_stl(
    grid: np.ndarray,
    origin: np.ndarray,
    pitch: float,
    output_path: str | Path,
) -> None:
    """
    ボクセルグリッドをMarchingCubesでSTLメッシュに変換してバイナリSTLとして保存する。

    grid: (nz, ny, nx) uint8
    origin: ボクセルグリッド原点（世界座標）
    pitch: ボクセルサイズ（mm）
    """
    verts, faces, normals, _ = marching_cubes(
        grid.astype(np.float32),
        level=0.5,
        spacing=(pitch, pitch, pitch),
    )

    # ボクセルインデックス座標を世界座標に変換
    # marching_cubesはZ,Y,X順に返すのでorigin[2,1,0]を足す
    ox, oy, oz = origin
    verts[:, 0] += oz  # Z
    verts[:, 1] += oy  # Y
    verts[:, 2] += ox  # X
    # XYZ順に戻す (marching_cubesはZYX順)
    verts = verts[:, [2, 1, 0]]

    n_faces = len(faces)
    solid = stl_mesh.Mesh(np.zeros(n_faces, dtype=stl_mesh.Mesh.dtype))
    for i, face in enumerate(faces):
        for j in range(3):
            solid.vectors[i][j] = verts[face[j]]

    solid.save(str(output_path))
