import type { ConvertParams } from '../store/paramStore'

// VITE_API_URL を設定すると Railway 等の外部バックエンドを指す。
// 未設定時は Vite dev proxy 経由の相対パスを使用。
const API_ORIGIN = import.meta.env.VITE_API_URL ?? ''
const BASE = API_ORIGIN ? `${API_ORIGIN}/api` : '/api'

function wsBase(): string {
  if (API_ORIGIN) {
    return API_ORIGIN.replace(/^https/, 'wss').replace(/^http/, 'ws')
  }
  return window.location.origin.replace(/^https/, 'wss').replace(/^http/, 'ws')
}

export async function startConvert(
  stlFile: File,
  qrText: string,
  params: ConvertParams,
  rotationMatrix: number[][],
): Promise<string> {
  const form = new FormData()
  form.append('stl_file', stlFile)
  form.append('qr_text', qrText)
  form.append('params', JSON.stringify({ ...params, rotation_matrix: rotationMatrix }))

  const res = await fetch(`${BASE}/convert`, { method: 'POST', body: form })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail ?? `HTTPエラー: ${res.status}`)
  }
  const data = await res.json()
  return data.job_id as string
}

export async function getResult(jobId: string): Promise<{
  status: string
  qr_verified: boolean | null
  qr_decoded_text: string | null
  error: string | null
  warning: string | null
}> {
  const res = await fetch(`${BASE}/result/${jobId}`)
  if (!res.ok) throw new Error(`結果取得エラー: ${res.status}`)
  return res.json()
}

export function getDownloadUrl(jobId: string): string {
  return `${BASE}/download/${jobId}`
}

export function openProgressWebSocket(
  jobId: string,
  onMessage: (msg: { step: string; progress: number; message: string }) => void,
  onClose: () => void,
): WebSocket {
  const ws = new WebSocket(`${wsBase()}/api/progress/${jobId}`)
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data))
    } catch {
      // ignore parse errors
    }
  }
  ws.onclose = onClose
  ws.onerror = () => ws.close()
  return ws
}
