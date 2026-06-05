"""UT-09, UT-10: レイキャストテスト"""
import numpy as np
import pytest
from app.core.raycast import _dda_ray_voxels, apply_shadow_carving


def test_dda_ray_traverses_voxels():
    """UT-09: DDAレイが光線軌跡上のボクセルを列挙すること"""
    origin = np.array([0.0, 0.0, 0.0])
    pitch = 1.0
    shape = (10, 10, 10)
    start = np.array([5.5, 5.5, -1.0])
    end = np.array([5.5, 5.5, 8.0])
    voxels = _dda_ray_voxels(start, end, origin, pitch, shape)
    assert len(voxels) > 0
    for zi, yi, xi in voxels:
        assert 0 <= zi < 10
        assert 0 <= yi < 10
        assert 0 <= xi < 10


def test_white_pixel_carves_voxels():
    """UT-09: 白画素(0)の光線上ボクセルが0になること"""
    grid = np.ones((10, 10, 10), dtype=np.uint8)
    origin = np.array([0.0, 0.0, 0.0])
    # 単純な白画素1点
    projected_qr = np.zeros((10, 10), dtype=np.uint8)  # 全部白
    n_hat = np.array([0, 0, -1], dtype=np.float64)
    u_hat = np.array([1, 0, 0], dtype=np.float64)
    v_hat = np.array([0, 1, 0], dtype=np.float64)
    wall_origin = np.array([5.0, 5.0, -50.0])

    result = apply_shadow_carving(
        grid=grid.copy(),
        projected_qr=projected_qr,
        light=[5.0, 5.0, 100.0],
        wall_origin=wall_origin,
        u_hat=u_hat,
        v_hat=v_hat,
        qr_size=10.0,
        grid_origin=origin,
        pitch=1.0,
    )
    # 削りが発生していること（全ての1が残ったままではない）
    assert result.sum() < grid.sum()


def test_black_pixel_preserves_at_least_one_voxel():
    """UT-10: 黒画素(1)の光線上に最低1ボクセル残ること"""
    # 空のグリッド（全部0）に黒画素を当てる
    grid = np.zeros((10, 10, 10), dtype=np.uint8)
    origin = np.array([0.0, 0.0, 0.0])
    projected_qr = np.ones((10, 10), dtype=np.uint8)  # 全部黒
    u_hat = np.array([1, 0, 0], dtype=np.float64)
    v_hat = np.array([0, 1, 0], dtype=np.float64)
    wall_origin = np.array([5.0, 5.0, -50.0])

    result = apply_shadow_carving(
        grid=grid.copy(),
        projected_qr=projected_qr,
        light=[5.0, 5.0, 100.0],
        wall_origin=wall_origin,
        u_hat=u_hat,
        v_hat=v_hat,
        qr_size=10.0,
        grid_origin=origin,
        pitch=1.0,
    )
    # 黒画素保証で少なくとも1つボクセルが生えること
    assert result.sum() > 0
