import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { VerifyResult } from '../../src/components/VerifyResult'
import { useJobStore } from '../../src/store/jobStore'
import { useStlStore } from '../../src/store/stlStore'

beforeEach(() => {
  useJobStore.getState().reset()
  useStlStore.getState().reset()
})

describe('VerifyResult', () => {
  it('FE-11: returns null when status is idle', () => {
    const { container } = render(<VerifyResult />)
    expect(container.firstChild).toBeNull()
  })

  it('FE-11: renders panel when status is failed', () => {
    useJobStore.getState().setError('パイプライン失敗')
    render(<VerifyResult />)
    expect(screen.getByText(/QR検証結果/)).toBeInTheDocument()
  })

  it('shows error message when status is failed', () => {
    useJobStore.getState().setError('変換エラーが発生しました')
    render(<VerifyResult />)
    expect(screen.getByText('変換エラーが発生しました')).toBeInTheDocument()
  })

  it('FE-12: shows success message when qrVerified is true', () => {
    useJobStore.getState().setResult({ qrVerified: true, qrDecodedText: 'https://example.com' })
    render(<VerifyResult />)
    expect(screen.getByText(/QRコード読み取り成功/)).toBeInTheDocument()
  })

  it('FE-12: shows failure message when qrVerified is false', () => {
    useJobStore.getState().setResult({ qrVerified: false, qrDecodedText: '' })
    render(<VerifyResult />)
    expect(screen.getByText(/読み取り失敗/)).toBeInTheDocument()
  })

  it('FE-12: shows decoded text when qrVerified and text is present', () => {
    useJobStore.getState().setResult({
      qrVerified: true,
      qrDecodedText: 'https://decoded.example.com',
    })
    render(<VerifyResult />)
    expect(screen.getByText(/https:\/\/decoded\.example\.com/)).toBeInTheDocument()
  })

  it('FE-12: shows warning message when present', () => {
    useJobStore.getState().setResult({
      qrVerified: true,
      qrDecodedText: '',
      warning: 'ボクセル解像度が低すぎます',
    })
    render(<VerifyResult />)
    expect(screen.getByText(/ボクセル解像度が低すぎます/)).toBeInTheDocument()
  })

  it('FE-12: download button is disabled when qrVerified is false', () => {
    useJobStore.getState().setResult({ qrVerified: false, qrDecodedText: '' })
    render(<VerifyResult />)
    const btn = screen.getByRole('button', { name: /STLをダウンロード/ })
    expect(btn).toBeDisabled()
  })

  it('FE-12: download button is enabled when qrVerified is true', () => {
    useJobStore.getState().setResult({ qrVerified: true, qrDecodedText: 'test' })
    render(<VerifyResult />)
    const btn = screen.getByRole('button', { name: /STLをダウンロード/ })
    expect(btn).not.toBeDisabled()
  })
})
