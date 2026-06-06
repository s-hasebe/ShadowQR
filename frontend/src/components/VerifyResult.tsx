import { useJobStore } from '../store/jobStore'
import { getDownloadUrl } from '../api/client'

export function VerifyResult() {
  const { status, qrVerified, qrDecodedText, error, warning, jobId } = useJobStore()

  if (status === 'idle') return null

  const handleDownload = () => {
    if (!jobId) return
    const url = getDownloadUrl(jobId)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shadow_qr_output.stl'
    a.click()
  }

  return (
    <div className="panel">
      <h2>⑧ QR検証結果</h2>

      {error && <p className="error-msg">{error}</p>}
      {warning && <p className="warning-msg">{warning}</p>}

      {status === 'completed' && qrVerified !== null && (
        <>
          <div className={`verify-result ${qrVerified ? 'verify-success' : 'verify-fail'}`}>
            {qrVerified
              ? '✓ QRコード読み取り成功'
              : '✗ 読み取り失敗：パラメータを調整してください'}
          </div>
          {qrDecodedText && (
            <p style={{ marginTop: 8, fontSize: '0.8rem', color: '#888' }}>
              デコード結果: {qrDecodedText}
            </p>
          )}
          <div style={{ marginTop: 16 }}>
            <button className="btn-success" onClick={handleDownload} disabled={!qrVerified}>
              STLをダウンロード
            </button>
          </div>
        </>
      )}
    </div>
  )
}
