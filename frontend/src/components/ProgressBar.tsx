import React from 'react'
import { useJobStore } from '../store/jobStore'

const STEP_LABELS: Record<string, string> = {
  qr_generate: 'QRコード生成',
  voxelize: 'ボクセル化',
  homography: '逆透視変換',
  raycast: 'レイキャスト',
  meshing: 'メッシュ再構築',
  verify: 'QR検証',
  completed: '完了',
  failed: 'エラー',
}

export function ProgressBar() {
  const { status, progress } = useJobStore()

  if (status === 'idle') return null

  const pct = progress ? Math.round(progress.progress * 100) : 0
  const label = progress ? (STEP_LABELS[progress.step] ?? progress.step) : '処理準備中…'

  return (
    <div className="panel">
      <h2>処理進捗</h2>
      <p style={{ marginBottom: 8, color: '#ccc' }}>{label}: {progress?.message}</p>
      <div style={{ background: '#333', borderRadius: 4, height: 12, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: status === 'failed' ? '#ef4444' : '#3b82f6',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <p style={{ marginTop: 4, fontSize: '0.8rem', color: '#888' }}>{pct}%</p>
    </div>
  )
}
