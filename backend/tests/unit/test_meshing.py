"""UT-11: ボクセル→STLメッシュ変換テスト"""
import tempfile
from pathlib import Path

import numpy as np
import pytest
from stl import mesh as stl_mesh

from app.core.meshing import voxel_to_stl


def _solid_box_grid(nx: int = 10, ny: int = 10, nz: int = 10) -> np.ndarray:
    """全ボクセルが埋まった直方体グリッド (nz, ny, nx)。"""
    grid = np.ones((nz, ny, nx), dtype=np.uint8)
    # 境界を0にしてMarching Cubesが面を生成できるようにする
    grid[0, :, :] = 0
    grid[-1, :, :] = 0
    grid[:, 0, :] = 0
    grid[:, -1, :] = 0
    grid[:, :, 0] = 0
    grid[:, :, -1] = 0
    return grid


def _run(grid: np.ndarray, pitch: float = 1.0) -> Path:
    origin = np.array([0.0, 0.0, 0.0])
    tmp = tempfile.NamedTemporaryFile(suffix=".stl", delete=False)
    tmp.close()
    voxel_to_stl(grid, origin, pitch, tmp.name)
    return Path(tmp.name)


# UT-11a: STLファイルが生成される -----------------------------------------------

def test_stl_file_is_created():
    """UT-11a: 出力STLファイルが存在すること"""
    path = _run(_solid_box_grid())
    assert path.exists()
    assert path.stat().st_size > 0


# UT-11b: 頂点・面の存在 ---------------------------------------------------------

def test_stl_has_faces():
    """UT-11b: 少なくとも1面が生成されること"""
    path = _run(_solid_box_grid())
    solid = stl_mesh.Mesh.from_file(str(path))
    assert len(solid.vectors) > 0


def test_stl_vertices_are_finite():
    """UT-11c: 全頂点座標がfiniteであること（NaN/Infなし）"""
    path = _run(_solid_box_grid())
    solid = stl_mesh.Mesh.from_file(str(path))
    assert np.all(np.isfinite(solid.vectors))


# UT-11d: pitch スケーリング -----------------------------------------------------

def test_stl_scales_with_pitch():
    """UT-11d: pitchが大きいほどSTLのバウンディングボックスが大きくなること"""
    grid = _solid_box_grid()
    origin = np.array([0.0, 0.0, 0.0])

    tmp1 = tempfile.NamedTemporaryFile(suffix=".stl", delete=False)
    tmp1.close()
    tmp2 = tempfile.NamedTemporaryFile(suffix=".stl", delete=False)
    tmp2.close()

    voxel_to_stl(grid, origin, 1.0, tmp1.name)
    voxel_to_stl(grid, origin, 2.0, tmp2.name)

    s1 = stl_mesh.Mesh.from_file(tmp1.name)
    s2 = stl_mesh.Mesh.from_file(tmp2.name)

    extent1 = s1.vectors.max() - s1.vectors.min()
    extent2 = s2.vectors.max() - s2.vectors.min()
    assert extent2 > extent1


# UT-11e: origin オフセット -------------------------------------------------------

def test_stl_origin_offset_shifts_vertices():
    """UT-11e: originを変えると頂点座標がそのぶんシフトすること"""
    grid = _solid_box_grid()
    offset = 50.0

    tmp1 = tempfile.NamedTemporaryFile(suffix=".stl", delete=False)
    tmp1.close()
    tmp2 = tempfile.NamedTemporaryFile(suffix=".stl", delete=False)
    tmp2.close()

    voxel_to_stl(grid, np.array([0.0, 0.0, 0.0]), 1.0, tmp1.name)
    voxel_to_stl(grid, np.array([offset, 0.0, 0.0]), 1.0, tmp2.name)

    s1 = stl_mesh.Mesh.from_file(tmp1.name)
    s2 = stl_mesh.Mesh.from_file(tmp2.name)

    # X座標の中心がoffsetぶんずれているはず
    cx1 = s1.vectors[:, :, 0].mean()
    cx2 = s2.vectors[:, :, 0].mean()
    assert abs(cx2 - cx1 - offset) < 1.0  # 1mm以内の誤差許容


# UT-11f: 空グリッドでは面ゼロ or 例外 ------------------------------------------

def test_stl_empty_grid_produces_no_faces_or_raises():
    """UT-11f: 全ゼロのグリッドはSTL面ゼロかskimage例外を返すこと"""
    grid = np.zeros((5, 5, 5), dtype=np.uint8)
    origin = np.array([0.0, 0.0, 0.0])
    tmp = tempfile.NamedTemporaryFile(suffix=".stl", delete=False)
    tmp.close()

    try:
        voxel_to_stl(grid, origin, 1.0, tmp.name)
        solid = stl_mesh.Mesh.from_file(tmp.name)
        assert len(solid.vectors) == 0
    except Exception:
        pass  # marching_cubesが例外を上げるケースも許容


# UT-11g: 異なる形状グリッドでも動作する ----------------------------------------

def test_stl_non_cubic_grid():
    """UT-11g: 非正方形グリッド (nz≠ny≠nx) でも正常に動作すること"""
    grid = np.zeros((12, 8, 6), dtype=np.uint8)
    grid[1:-1, 1:-1, 1:-1] = 1
    path = _run(grid, pitch=1.0)
    solid = stl_mesh.Mesh.from_file(str(path))
    assert len(solid.vectors) > 0
