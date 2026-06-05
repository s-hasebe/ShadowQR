import { describe, it, expect, beforeEach } from 'vitest'
import { useJobStore } from '../../src/store/jobStore'

beforeEach(() => {
  useJobStore.getState().reset()
})

describe('useJobStore', () => {
  it('initial status is idle', () => {
    expect(useJobStore.getState().status).toBe('idle')
  })

  it('initial jobId is null', () => {
    expect(useJobStore.getState().jobId).toBeNull()
  })

  it('setJobId changes status to pending and stores id', () => {
    useJobStore.getState().setJobId('job-abc')
    const state = useJobStore.getState()
    expect(state.status).toBe('pending')
    expect(state.jobId).toBe('job-abc')
  })

  it('setJobId clears previous progress and error', () => {
    useJobStore.getState().setError('old error')
    useJobStore.getState().setJobId('job-new')
    const state = useJobStore.getState()
    expect(state.error).toBeNull()
    expect(state.progress).toBeNull()
  })

  it('setProgress updates progress field', () => {
    useJobStore.getState().setJobId('job-abc')
    useJobStore.getState().setProgress({ step: 'raycast', progress: 0.5, message: '処理中' })
    const p = useJobStore.getState().progress
    expect(p?.step).toBe('raycast')
    expect(p?.progress).toBe(0.5)
    expect(p?.message).toBe('処理中')
  })

  it('setResult changes status to completed with qrVerified', () => {
    useJobStore.getState().setResult({
      qrVerified: true,
      qrDecodedText: 'https://example.com',
    })
    const state = useJobStore.getState()
    expect(state.status).toBe('completed')
    expect(state.qrVerified).toBe(true)
    expect(state.qrDecodedText).toBe('https://example.com')
  })

  it('setResult stores warning when provided', () => {
    useJobStore.getState().setResult({
      qrVerified: false,
      qrDecodedText: '',
      warning: '照射角度が範囲外です',
    })
    expect(useJobStore.getState().warning).toBe('照射角度が範囲外です')
  })

  it('setError changes status to failed', () => {
    useJobStore.getState().setError('pipeline failed')
    const state = useJobStore.getState()
    expect(state.status).toBe('failed')
    expect(state.error).toBe('pipeline failed')
  })

  it('reset returns to idle state and clears all fields', () => {
    useJobStore.getState().setJobId('job-abc')
    useJobStore.getState().setProgress({ step: 'verify', progress: 0.9, message: '' })
    useJobStore.getState().reset()
    const state = useJobStore.getState()
    expect(state.status).toBe('idle')
    expect(state.jobId).toBeNull()
    expect(state.progress).toBeNull()
    expect(state.qrVerified).toBeNull()
    expect(state.error).toBeNull()
    expect(state.warning).toBeNull()
  })
})
