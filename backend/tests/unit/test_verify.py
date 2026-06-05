"""UT-12, UT-13: QR自動検証テスト"""
import numpy as np
import pytest
import qrcode
from app.core.verify import verify_qr


def make_qr_image(text: str) -> np.ndarray:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    import numpy as np
    return np.array(img.convert("L"))


def test_verify_correct_qr():
    """UT-12: 正しいQR画像は検証成功すること"""
    text = "https://example.com"
    img = make_qr_image(text)
    success, decoded = verify_qr(img, text)
    assert success
    assert decoded == text


def test_verify_wrong_qr():
    """UT-13: 壊れた画像は不一致として検出されること"""
    img = np.full((100, 100), 128, dtype=np.uint8)  # グレー（QRコードなし）
    success, decoded = verify_qr(img, "https://example.com")
    assert not success
