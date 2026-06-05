"""UT-05, UT-06: 壁面UV座標系テスト"""
import numpy as np
import pytest
from app.core.wall_uv import build_wall_uv


def test_wall_uv_default_normal():
    """UT-05: 壁面法線(0,0,-1)でu/vが法線と直交すること"""
    n_hat, u_hat, v_hat, _ = build_wall_uv([0, 0, -1], 500)
    assert abs(np.dot(u_hat, n_hat)) < 1e-9
    assert abs(np.dot(v_hat, n_hat)) < 1e-9
    assert abs(np.dot(u_hat, v_hat)) < 1e-9


@pytest.mark.parametrize("normal", [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1],
    [0.5, -0.3, 0.8],
])
def test_wall_uv_arbitrary_normal(normal):
    """UT-06: 任意の法線でグラムシュミット正規直交化が正しく行われること"""
    n_hat, u_hat, v_hat, _ = build_wall_uv(normal, 100)
    assert abs(np.linalg.norm(u_hat) - 1.0) < 1e-9
    assert abs(np.linalg.norm(v_hat) - 1.0) < 1e-9
    assert abs(np.dot(u_hat, n_hat)) < 1e-9
    assert abs(np.dot(v_hat, n_hat)) < 1e-9
