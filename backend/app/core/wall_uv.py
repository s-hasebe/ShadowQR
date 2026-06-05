"""F12: 壁面UV座標系の構築"""
from __future__ import annotations

import numpy as np


def build_wall_uv(
    wall_normal: list[float],
    wall_offset: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    壁面法線 n から正規直交基底 u, v を構築し、壁面上の原点も返す。

    Returns:
        n_hat: 正規化法線ベクトル (3,)
        u_hat: 壁面内U軸基底ベクトル (3,)
        v_hat: 壁面内V軸基底ベクトル (3,)
        wall_origin: 壁面原点 (3,) — 法線方向に wall_offset だけ進んだ点
    """
    n = np.array(wall_normal, dtype=np.float64)
    n_hat = n / np.linalg.norm(n)

    # グラムシュミット法でu軸を構築
    # n_hatに最も直交に近い標準基底ベクトルを選ぶ
    candidates = [np.array([1, 0, 0]), np.array([0, 1, 0]), np.array([0, 0, 1])]
    tmp = min(candidates, key=lambda c: abs(np.dot(n_hat, c)))
    u = tmp - np.dot(tmp, n_hat) * n_hat
    u_hat = u / np.linalg.norm(u)
    v_hat = np.cross(n_hat, u_hat)

    wall_origin = -n_hat * wall_offset  # 壁面は原点から法線逆方向にoffset

    return n_hat, u_hat, v_hat, wall_origin


def world_to_wall_uv(
    point: np.ndarray,
    wall_origin: np.ndarray,
    u_hat: np.ndarray,
    v_hat: np.ndarray,
) -> tuple[float, float]:
    """3D世界座標を壁面UV座標に変換する。"""
    diff = point - wall_origin
    return float(np.dot(diff, u_hat)), float(np.dot(diff, v_hat))


def compute_projection_angle(light: list[float], wall_normal: list[float]) -> float:
    """光源方向ベクトルと壁面法線のなす角（度）を返す。"""
    l_dir = np.array(light, dtype=np.float64)
    norm = np.linalg.norm(l_dir)
    if norm == 0:
        return 0.0
    l_hat = l_dir / norm
    n_hat = np.array(wall_normal, dtype=np.float64)
    n_hat = n_hat / np.linalg.norm(n_hat)
    cos_theta = np.clip(np.dot(l_hat, n_hat), -1.0, 1.0)
    return float(np.degrees(np.arccos(abs(cos_theta))))
