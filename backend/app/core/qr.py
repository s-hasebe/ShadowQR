"""F10: QRコード生成"""
from __future__ import annotations

import io

import numpy as np
import qrcode
from qrcode.constants import ERROR_CORRECT_H, ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q

_LEVEL_MAP = {"L": ERROR_CORRECT_L, "M": ERROR_CORRECT_M, "Q": ERROR_CORRECT_Q, "H": ERROR_CORRECT_H}


def generate_qr_bitmap(text: str, error_level: str = "H") -> np.ndarray:
    """
    Returns 2D uint8 numpy array: 0=white(transparent), 1=black(module).
    """
    level = _LEVEL_MAP.get(error_level.upper(), ERROR_CORRECT_H)
    qr = qrcode.QRCode(error_correction=level, box_size=1, border=0)
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    arr = np.array(img.convert("L"))
    # black module → 1, white → 0
    return (arr < 128).astype(np.uint8)
