"""F18: QRコード読み取り自動検証"""
from __future__ import annotations

import cv2
import numpy as np

from app.core.wall_uv import build_wall_uv, compute_projection_angle


def simulate_shadow_image(
    grid: np.ndarray,
    origin: np.ndarray,
    pitch: float,
    light: list[float],
    wall_normal: list[float],
    wall_offset: float,
    qr_size: float,
    image_size: int = 512,
) -> np.ndarray:
    """
    ボクセルグリッドから影シミュレーション画像（グレースケール）を生成する。
    光源から各壁面ピクセルへのレイキャストで遮蔽判定を行う。

    Returns:
        shadow_img: uint8 numpy array (image_size, image_size) — 0=影(黒), 255=明(白)
    """
    L = np.array(light, dtype=np.float64)
    n_hat, u_hat, v_hat, wall_origin = build_wall_uv(wall_normal, wall_offset)
    half = qr_size * 1.5  # 余裕を持たせてQR全体が映るように
    ox, oy, oz = origin
    nz, ny, nx = grid.shape

    shadow_img = np.full((image_size, image_size), 255, dtype=np.uint8)

    for row in range(image_size):
        for col in range(image_size):
            u = (col / image_size - 0.5) * half * 2
            v = (row / image_size - 0.5) * half * 2
            wall_pt = wall_origin + u * u_hat + v * v_hat

            # レイ: L → wall_pt
            d = wall_pt - L
            d_len = np.linalg.norm(d)
            if d_len < 1e-9:
                continue
            d_unit = d / d_len

            # ボクセルグリッドとの交差確認（簡易ステップ法）
            t_max = d_len
            t = 0.0
            step = pitch * 0.7
            blocked = False
            while t < t_max:
                pt = L + t * d_unit
                xi = int((pt[0] - ox) / pitch)
                yi = int((pt[1] - oy) / pitch)
                zi = int((pt[2] - oz) / pitch)
                if 0 <= zi < nz and 0 <= yi < ny and 0 <= xi < nx:
                    if grid[zi, yi, xi] == 1:
                        blocked = True
                        break
                t += step

            if blocked:
                shadow_img[row, col] = 0

    return shadow_img


def verify_qr(
    shadow_img: np.ndarray,
    expected_text: str,
) -> tuple[bool, str]:
    """
    影画像からQRコードをデコードして元文字列と照合する。

    Returns:
        (success, decoded_text)
    """
    detector = cv2.QRCodeDetector()
    decoded, _, _ = detector.detectAndDecode(shadow_img)
    if decoded and decoded == expected_text:
        return True, decoded
    return False, decoded or ""
