"""UT-03, UT-04: STLボクセル化テスト"""
import io
import tempfile
from pathlib import Path

import numpy as np
import pytest
import trimesh

from app.core.voxelize import load_and_voxelize, validate_light_position


def _write_box_stl(size: float = 10.0) -> str:
    """単純な直方体メッシュをSTLファイルとして一時書き出しし、パスを返す。"""
    mesh = trimesh.creation.box(extents=[size, size, size])
    tmp = tempfile.NamedTemporaryFile(suffix=".stl", delete=False)
    tmp.close()
    mesh.export(tmp.name)
    return tmp.name


# UT-03: ボクセル化の基本プロパティ検証 -----------------------------------------

def test_voxelize_returns_uint8_grid():
    """UT-03a: 返り値のgridがuint8であること"""
    path = _write_box_stl(10.0)
    grid, origin, pitch = load_and_voxelize(path, pitch=1.0)
    assert grid.dtype == np.uint8


def test_voxelize_grid_is_3d():
    """UT-03b: gridが3次元配列 (Z, Y, X) であること"""
    path = _write_box_stl(10.0)
    grid, origin, pitch = load_and_voxelize(path, pitch=1.0)
    assert grid.ndim == 3


def test_voxelize_grid_contains_only_0_and_1():
    """UT-03c: gridの値が0か1のみであること"""
    path = _write_box_stl(10.0)
    grid, origin, pitch = load_and_voxelize(path, pitch=1.0)
    assert set(np.unique(grid)).issubset({0, 1})


def test_voxelize_grid_has_filled_interior():
    """UT-03d: fill()により内部が充填されていること（1の割合がゼロでない）"""
    path = _write_box_stl(10.0)
    grid, origin, pitch = load_and_voxelize(path, pitch=1.0)
    assert grid.sum() > 0


def test_voxelize_pitch_matches_input():
    """UT-03e: 返り値のpitchが入力値と一致すること"""
    path = _write_box_stl(10.0)
    _, _, pitch = load_and_voxelize(path, pitch=0.5)
    assert pitch == pytest.approx(0.5)


def test_voxelize_origin_is_array_of_3():
    """UT-03f: originが3要素のnumpy配列であること"""
    path = _write_box_stl(10.0)
    _, origin, _ = load_and_voxelize(path, pitch=1.0)
    assert isinstance(origin, np.ndarray)
    assert origin.shape == (3,)


def test_voxelize_finer_pitch_gives_larger_grid():
    """UT-03g: pitchを細かくするとグリッドが大きくなること"""
    path = _write_box_stl(10.0)
    grid_coarse, _, _ = load_and_voxelize(path, pitch=2.0)
    grid_fine, _, _ = load_and_voxelize(path, pitch=0.5)
    assert grid_fine.size > grid_coarse.size


# UT-04: 回転行列適用の検証 -------------------------------------------------------

def test_voxelize_identity_rotation_matches_no_rotation():
    """UT-04a: 単位行列の回転は回転なしと同じ結果を返すこと"""
    path = _write_box_stl(10.0)
    identity = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
    grid_no_rot, _, _ = load_and_voxelize(path, pitch=1.0)
    grid_identity, _, _ = load_and_voxelize(path, pitch=1.0, rotation_matrix=identity)
    assert grid_no_rot.shape == grid_identity.shape
    np.testing.assert_array_equal(grid_no_rot, grid_identity)


def test_voxelize_rotation_changes_grid():
    """UT-04b: 90°回転を適用するとグリッドが変化すること（非対称メッシュ使用）"""
    # 非対称直方体（辺が異なる）
    mesh = trimesh.creation.box(extents=[4.0, 8.0, 4.0])
    tmp = tempfile.NamedTemporaryFile(suffix=".stl", delete=False)
    tmp.close()
    mesh.export(tmp.name)

    identity = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
    # X軸周り90°回転
    rot90_x = [[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1]]

    grid_orig, _, _ = load_and_voxelize(tmp.name, pitch=1.0, rotation_matrix=identity)
    grid_rot, _, _ = load_and_voxelize(tmp.name, pitch=1.0, rotation_matrix=rot90_x)

    # 形状（Z,Y,X）が変わっているはず
    assert grid_orig.shape != grid_rot.shape


# UT-04c: 光源バリデーション -------------------------------------------------------

def test_validate_light_outside_grid_does_not_raise():
    """UT-04c: グリッド外の光源はエラーにならないこと"""
    grid = np.ones((5, 5, 5), dtype=np.uint8)
    origin = np.array([0.0, 0.0, 0.0])
    pitch = 1.0
    # グリッド外（大きな座標）
    validate_light_position([100.0, 100.0, 100.0], origin, grid, pitch)


def test_validate_light_outside_bounds_does_not_raise():
    """UT-04d: グリッド範囲外（負方向）の光源もエラーにならないこと"""
    grid = np.ones((5, 5, 5), dtype=np.uint8)
    origin = np.array([0.0, 0.0, 0.0])
    pitch = 1.0
    validate_light_position([-10.0, -10.0, -10.0], origin, grid, pitch)


def test_validate_light_inside_solid_raises():
    """UT-04e: オブジェクト内部（grid=1）に光源があるとValueErrorが発生すること"""
    grid = np.ones((5, 5, 5), dtype=np.uint8)
    origin = np.array([0.0, 0.0, 0.0])
    pitch = 1.0
    # グリッド内部の座標（origin + 2*pitch = 2.0）
    with pytest.raises(ValueError, match="光源がオブジェクト内部"):
        validate_light_position([2.0, 2.0, 2.0], origin, grid, pitch)


def test_validate_light_at_empty_voxel_does_not_raise():
    """UT-04f: 空ボクセル（grid=0）上の光源はエラーにならないこと"""
    grid = np.zeros((5, 5, 5), dtype=np.uint8)
    origin = np.array([0.0, 0.0, 0.0])
    pitch = 1.0
    validate_light_position([2.0, 2.0, 2.0], origin, grid, pitch)
