/**
 * E2Eテスト用ヘルパー: テスト内でSTLバイナリを生成する。
 * 外部ファイル依存なし・pytrim 不要。
 */

/** バイナリSTL用に vec3 を Buffer に書き込む */
function writeVec3(buf: Buffer, offset: number, x: number, y: number, z: number): number {
  buf.writeFloatLE(x, offset)
  buf.writeFloatLE(y, offset + 4)
  buf.writeFloatLE(z, offset + 8)
  return offset + 12
}

/**
 * 一辺 size mm の閉じた直方体メッシュ（12三角形）をバイナリSTLとして生成する。
 * trimesh.fill() で内部充填可能な watertight メッシュ。
 */
export function makeBoxStlBuffer(size = 10): Buffer {
  const S = size
  // [法線, 頂点1, 頂点2, 頂点3] の12三角形（右手系・外向き法線）
  const tris: Array<[readonly number[], readonly number[], readonly number[], readonly number[]]> = [
    // 底面 (z=0, normal 0,0,-1)
    [[0,0,-1], [0,0,0], [S,S,0], [S,0,0]],
    [[0,0,-1], [0,0,0], [0,S,0], [S,S,0]],
    // 上面 (z=S, normal 0,0,1)
    [[0,0,1],  [0,0,S], [S,0,S], [S,S,S]],
    [[0,0,1],  [0,0,S], [S,S,S], [0,S,S]],
    // 前面 (y=0, normal 0,-1,0)
    [[0,-1,0], [0,0,0], [S,0,0], [S,0,S]],
    [[0,-1,0], [0,0,0], [S,0,S], [0,0,S]],
    // 背面 (y=S, normal 0,1,0)
    [[0,1,0],  [0,S,0], [S,S,S], [S,S,0]],
    [[0,1,0],  [0,S,0], [0,S,S], [S,S,S]],
    // 左面 (x=0, normal -1,0,0)
    [[-1,0,0], [0,0,0], [0,0,S], [0,S,S]],
    [[-1,0,0], [0,0,0], [0,S,S], [0,S,0]],
    // 右面 (x=S, normal 1,0,0)
    [[1,0,0],  [S,0,0], [S,S,0], [S,S,S]],
    [[1,0,0],  [S,0,0], [S,S,S], [S,0,S]],
  ]

  const buf = Buffer.alloc(80 + 4 + tris.length * 50)
  buf.fill(0, 0, 80)                           // ヘッダ (80 byte)
  buf.writeUInt32LE(tris.length, 80)           // 三角形数

  let offset = 84
  for (const [n, v1, v2, v3] of tris) {
    offset = writeVec3(buf, offset, n[0],  n[1],  n[2])
    offset = writeVec3(buf, offset, v1[0], v1[1], v1[2])
    offset = writeVec3(buf, offset, v2[0], v2[1], v2[2])
    offset = writeVec3(buf, offset, v3[0], v3[1], v3[2])
    buf.writeUInt16LE(0, offset)               // attribute byte count
    offset += 2
  }

  return buf
}
