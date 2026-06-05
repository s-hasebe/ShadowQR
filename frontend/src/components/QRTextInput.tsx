import React from 'react'

const MAX_BYTES = 2953

interface Props {
  value: string
  onChange: (v: string) => void
}

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length
}

export function QRTextInput({ value, onChange }: Props) {
  const bytes = byteLength(value)
  const over = bytes > MAX_BYTES

  return (
    <div className="panel">
      <h2>② QRコードテキスト</h2>
      <div className="form-group">
        <label>URL・テキスト（最大2953バイト）</label>
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ borderColor: over ? '#f87171' : undefined }}
          placeholder="https://example.com"
        />
        <p style={{ fontSize: '0.75rem', color: over ? '#f87171' : '#666', marginTop: 4 }}>
          {bytes} / {MAX_BYTES} バイト
        </p>
      </div>
    </div>
  )
}
