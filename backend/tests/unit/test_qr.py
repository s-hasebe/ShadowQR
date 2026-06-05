"""UT-01, UT-02: QRコード生成テスト"""
import numpy as np
import pytest
from app.core.qr import generate_qr_bitmap


def test_qr_bitmap_is_2d_binary_square():
    """UT-01: 出力が白黒2値の正方形画像であること"""
    arr = generate_qr_bitmap("https://example.com", "H")
    assert arr.ndim == 2
    assert arr.shape[0] == arr.shape[1]
    assert set(np.unique(arr)).issubset({0, 1})


@pytest.mark.parametrize("level", ["L", "M", "Q", "H"])
def test_qr_all_error_levels(level):
    """UT-02: 各エラー訂正レベルで例外が発生しないこと"""
    arr = generate_qr_bitmap("test", level)
    assert arr.ndim == 2
    assert arr.shape[0] > 0
