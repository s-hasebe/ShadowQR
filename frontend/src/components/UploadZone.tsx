import React, { useCallback, useRef, useState } from 'react'
import { useStlStore } from '../store/stlStore'

const MAX_SIZE = 100 * 1024 * 1024

export function UploadZone() {
  const setInputStl = useStlStore((s) => s.setInputStl)
  const file = useStlStore((s) => s.inputStlFile)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setError(null)
    if (f.size > MAX_SIZE) {
      setError('ファイルが100MBを超えています。')
      return
    }
    if (!f.name.toLowerCase().endsWith('.stl')) {
      setError('STLファイルを選択してください。')
      return
    }
    setInputStl(f)
  }, [setInputStl])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  return (
    <div className="panel">
      <h2>① STLアップロード</h2>
      <div
        style={{
          border: `2px dashed ${dragging ? '#3b82f6' : '#444'}`,
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".stl"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {file ? (
          <p style={{ color: '#4ade80' }}>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
        ) : (
          <p style={{ color: '#888' }}>STLファイルをドラッグ＆ドロップ、またはクリックして選択</p>
        )}
      </div>
      {error && <p className="error-msg">{error}</p>}
    </div>
  )
}
