import { useParamStore, computeAngle } from '../store/paramStore'

export function ParamPanel() {
  const params = useParamStore()
  const set = useParamStore((s) => s.set)
  const angle = computeAngle(params.light, params.wall_normal)
  const angleWarn = angle < 20 || angle > 85

  return (
    <div className="panel">
      <h2>③ 投影パラメータ</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {(['x', 'y', 'z'] as const).map((axis, i) => (
          <div className="form-group" key={axis}>
            <label>光源 {axis.toUpperCase()} (mm)</label>
            <input
              type="number"
              value={params.light[i]}
              onChange={(e) => {
                const v = [...params.light] as [number, number, number]
                v[i] = parseFloat(e.target.value) || 0
                set({ light: v })
              }}
            />
          </div>
        ))}
      </div>

      <div className="form-group">
        <label>
          照射角度（読み取り専用）:
          <strong style={{ color: angleWarn ? '#fbbf24' : '#4ade80', marginLeft: 8 }}>
            {angle.toFixed(1)}°
          </strong>
          {angleWarn && <span className="warning-msg" style={{ marginLeft: 8 }}>推奨範囲外（70〜80°推奨）</span>}
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {(['x', 'y', 'z'] as const).map((axis, i) => (
          <div className="form-group" key={axis}>
            <label>壁面法線 {axis.toUpperCase()}</label>
            <input
              type="number"
              step="0.1"
              value={params.wall_normal[i]}
              onChange={(e) => {
                const v = [...params.wall_normal] as [number, number, number]
                v[i] = parseFloat(e.target.value) || 0
                set({ wall_normal: v })
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div className="form-group">
          <label>壁面オフセット (mm)</label>
          <input type="number" value={params.wall_offset} onChange={(e) => set({ wall_offset: parseFloat(e.target.value) || 500 })} />
        </div>
        <div className="form-group">
          <label>投影QRサイズ (mm)</label>
          <input type="number" value={params.qr_size} onChange={(e) => set({ qr_size: parseFloat(e.target.value) || 100 })} />
        </div>
        <div className="form-group">
          <label>ボクセル解像度 (mm)</label>
          <input type="number" step="0.1" min="0.1" max="5" value={params.voxel_pitch} onChange={(e) => set({ voxel_pitch: parseFloat(e.target.value) || 0.5 })} />
        </div>
        <div className="form-group">
          <label>エラー訂正レベル（H推奨）</label>
          <select value={params.qr_error_level} onChange={(e) => set({ qr_error_level: e.target.value as 'L' | 'M' | 'Q' | 'H' })}>
            <option value="H">H（高・推奨）</option>
            <option value="Q">Q</option>
            <option value="M">M</option>
            <option value="L">L（低）</option>
          </select>
        </div>
      </div>
    </div>
  )
}
