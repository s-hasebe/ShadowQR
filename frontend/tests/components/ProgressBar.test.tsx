import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { ProgressBar } from '../../src/components/ProgressBar'
import { useJobStore } from '../../src/store/jobStore'

beforeEach(() => {
  useJobStore.getState().reset()
})

describe('ProgressBar', () => {
  it('FE-09: returns null (nothing rendered) when status is idle', () => {
    const { container } = render(<ProgressBar />)
    expect(container.firstChild).toBeNull()
  })

  it('FE-10: renders when status is pending', () => {
    useJobStore.getState().setJobId('job-123')
    render(<ProgressBar />)
    expect(screen.getByText('処理進捗')).toBeInTheDocument()
  })

  it('FE-10: shows "処理準備中" message when no progress step yet', () => {
    useJobStore.getState().setJobId('job-123')
    render(<ProgressBar />)
    expect(screen.getByText(/処理準備中/)).toBeInTheDocument()
  })

  it('FE-10: shows localized step label for voxelize', () => {
    useJobStore.getState().setJobId('job-123')
    useJobStore.getState().setProgress({ step: 'voxelize', progress: 0.1, message: 'STL変換中' })
    render(<ProgressBar />)
    expect(screen.getByText(/ボクセル化/)).toBeInTheDocument()
  })

  it('FE-10: shows localized step label for raycast', () => {
    useJobStore.getState().setJobId('job-123')
    useJobStore.getState().setProgress({ step: 'raycast', progress: 0.5, message: '処理中' })
    render(<ProgressBar />)
    expect(screen.getByText(/レイキャスト/)).toBeInTheDocument()
  })

  it('FE-10: shows percentage correctly', () => {
    useJobStore.getState().setJobId('job-123')
    useJobStore.getState().setProgress({ step: 'meshing', progress: 0.8, message: '' })
    render(<ProgressBar />)
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('FE-10: shows 100% when completed', () => {
    useJobStore.getState().setResult({ qrVerified: true, qrDecodedText: 'test' })
    useJobStore.getState().setProgress({ step: 'completed', progress: 1.0, message: '処理完了' })
    render(<ProgressBar />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('renders when status is failed', () => {
    useJobStore.getState().setError('エラーが発生しました')
    render(<ProgressBar />)
    expect(screen.getByText('処理進捗')).toBeInTheDocument()
  })
})
