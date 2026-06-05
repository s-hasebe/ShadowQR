"""テスト用STLフィクスチャ生成スクリプト"""
import numpy as np
from pathlib import Path
from stl import mesh as stl_mesh


def create_box_stl(size: float = 50.0, output_path: str = "box.stl") -> None:
    """単純な直方体STLを生成する"""
    h = size / 2
    vertices = np.array([
        [-h, -h, -h], [ h, -h, -h], [ h,  h, -h], [-h,  h, -h],
        [-h, -h,  h], [ h, -h,  h], [ h,  h,  h], [-h,  h,  h],
    ])
    faces = np.array([
        [0, 3, 1], [1, 3, 2],  # bottom
        [4, 5, 7], [5, 6, 7],  # top
        [0, 1, 4], [1, 5, 4],  # front
        [2, 3, 6], [3, 7, 6],  # back
        [0, 4, 3], [3, 4, 7],  # left
        [1, 2, 5], [2, 6, 5],  # right
    ])
    solid = stl_mesh.Mesh(np.zeros(len(faces), dtype=stl_mesh.Mesh.dtype))
    for i, face in enumerate(faces):
        for j in range(3):
            solid.vectors[i][j] = vertices[face[j]]
    solid.save(output_path)
    print(f"Created: {output_path}")


if __name__ == "__main__":
    out = Path(__file__).parent
    create_box_stl(50.0, str(out / "box_50mm.stl"))
    print("Done.")
