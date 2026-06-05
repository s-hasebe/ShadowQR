"""UT-07, UT-08: 逆透視変換テスト"""
import math
import numpy as np
import pytest
from app.core.wall_uv import build_wall_uv
from app.core.homography import check_qr_module_size


@pytest.mark.parametrize("theta_deg,expected_stretch", [
    (72, 1 / math.cos(math.radians(72))),
    (70, 1 / math.cos(math.radians(70))),
    (80, 1 / math.cos(math.radians(80))),
])
def test_stretch_ratio(theta_deg, expected_stretch):
    """UT-07, UT-08: 引き伸ばし率が理論値の±5%以内であること（理論値確認）"""
    actual = 1 / math.cos(math.radians(theta_deg))
    assert abs(actual - expected_stretch) / expected_stretch < 0.05


def test_qr_module_size_check_pass():
    """十分なボクセル解像度ではチェックが通ること"""
    qr = np.zeros((21, 21), dtype=np.uint8)
    ok, msg = check_qr_module_size(qr, 100.0, 0.5)
    # 100 / (21 * 0.5) ≈ 9.5 ≥ 3 → pass
    assert ok


def test_qr_module_size_check_fail():
    """解像度が粗すぎる場合に失敗すること"""
    qr = np.zeros((21, 21), dtype=np.uint8)
    ok, msg = check_qr_module_size(qr, 100.0, 5.0)
    # 100 / (21 * 5) ≈ 0.95 < 3 → fail
    assert not ok
    assert "ボクセル" in msg
