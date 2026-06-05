import React, { useEffect, useRef } from 'react'
import { useParamStore, computeAngle } from '../store/paramStore'
import { useJobStore } from '../store/jobStore'

export function ShadowSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const params = useParamStore()
  const { jobId, status } = useJobStore()
  const angle = computeAngle(params.light, params.wall_normal)

  // QR影のシミュレーション表示（バックエンド検証成功後は実影画像を取得してもよいが、
  // ここでは角度に基づいた縦引き伸ばしのビジュアルガイドを表示する）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0f0f0f'
    ctx.fillRect(0, 0, W, H)

    const stretch = 1 / Math.cos((angle * Math.PI) / 180)
    const qrW = 120
    const qrH = qrW * Math.min(stretch, 8)
    const cx = W / 2
    const cy = H / 2

    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(cx - qrW / 2, cy - qrH / 2, qrW, qrH)

    // QRパターン模擬（格子）
    const modules = 7
    const mw = qrW / modules
    const mh = qrH / modules
    ctx.fillStyle = '#333'
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillRect(cx - qrW / 2 + c * mw, cy - qrH / 2 + r * mh, mw, mh)
        }
      }
    }

    ctx.font = '12px monospace'
    ctx.fillStyle = '#888'
    ctx.textAlign = 'center'
    ctx.fillText(`θ=${angle.toFixed(1)}° 縦倍率×${stretch.toFixed(1)}`, cx, H - 16)
  }, [angle, status])

  return (
    <div className="panel">
      <h2>⑦ 影シミュレーター</h2>
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        style={{ width: '100%', borderRadius: 8, background: '#0f0f0f' }}
      />
    </div>
  )
}
