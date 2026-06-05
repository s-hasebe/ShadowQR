import React, { useState } from 'react'
import { UploadZone } from './components/UploadZone'
import { QRTextInput } from './components/QRTextInput'
import { ParamPanel } from './components/ParamPanel'
import { ProgressBar } from './components/ProgressBar'
import { VerifyResult } from './components/VerifyResult'
import { InputStlViewer } from './viewers/InputStlViewer'
import { OutputStlViewer } from './viewers/OutputStlViewer'
import { ShadowSimulator } from './viewers/ShadowSimulator'
import { useStlStore } from './store/stlStore'
import { useParamStore } from './store/paramStore'
import { useJobStore } from './store/jobStore'
import { startConvert, openProgressWebSocket, getResult } from './api/client'

export default function App() {
  const [qrText, setQrText] = useState('')
  const { inputStlFile, rotationMatrix, setOutputStlUrl } = useStlStore()
  const params = useParamStore()
  const { status, setJobId, setProgress, setResult, setError, reset } = useJobStore()

  const canStart = !!inputStlFile && qrText.trim().length > 0 && status !== 'running' && status !== 'pending'

  const handleStart = async () => {
    if (!inputStlFile) return
    reset()

    try {
      const jobId = await startConvert(inputStlFile, qrText, params, rotationMatrix)
      setJobId(jobId)

      const ws = openProgressWebSocket(
        jobId,
        (msg) => {
          if (msg.step === 'ping') return
          setProgress(msg)
          if (msg.step === 'completed' || msg.step === 'failed') {
            ws.close()
          }
        },
        async () => {
          // WebSocket closed — poll for final result
          try {
            const result = await getResult(jobId)
            if (result.status === 'completed') {
              setResult({
                qrVerified: result.qr_verified ?? false,
                qrDecodedText: result.qr_decoded_text ?? '',
                warning: result.warning ?? undefined,
              })
              if (result.qr_verified) {
                setOutputStlUrl(`/api/download/${jobId}`)
              }
            } else if (result.status === 'failed') {
              setError(result.error ?? '処理に失敗しました。')
            }
          } catch (e) {
            setError('結果の取得に失敗しました。')
          }
        },
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '変換開始に失敗しました。')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>ShadowQR</h1>
        <p>STLに光を当てると壁にQRコードの影が映る — 3Dオブジェクトを生成するツール</p>
      </header>

      <div className="top-row">
        <UploadZone />
        <QRTextInput value={qrText} onChange={setQrText} />
        <ParamPanel />
      </div>

      <button className="btn-primary" onClick={handleStart} disabled={!canStart}>
        {status === 'running' || status === 'pending' ? '処理中…' : '変換開始'}
      </button>

      <ProgressBar />

      <div className="viewer-row">
        <div className="panel">
          <h2>⑤ 入力STL ビューア</h2>
          <InputStlViewer />
        </div>
        <div className="panel">
          <h2>⑥ 出力STL ビューア</h2>
          <OutputStlViewer />
        </div>
      </div>

      <div className="bottom-row">
        <ShadowSimulator />
        <VerifyResult />
      </div>
    </div>
  )
}
