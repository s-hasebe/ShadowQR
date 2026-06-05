import { create } from 'zustand'

export type JobStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed'

interface ProgressStep {
  step: string
  progress: number
  message: string
}

interface JobStore {
  jobId: string | null
  status: JobStatus
  progress: ProgressStep | null
  qrVerified: boolean | null
  qrDecodedText: string | null
  error: string | null
  warning: string | null
  setJobId: (id: string) => void
  setStatus: (s: JobStatus) => void
  setProgress: (p: ProgressStep) => void
  setResult: (r: { qrVerified: boolean; qrDecodedText: string; warning?: string }) => void
  setError: (e: string) => void
  reset: () => void
}

export const useJobStore = create<JobStore>((set) => ({
  jobId: null,
  status: 'idle',
  progress: null,
  qrVerified: null,
  qrDecodedText: null,
  error: null,
  warning: null,

  setJobId: (id) => set({ jobId: id, status: 'pending', progress: null, error: null, warning: null, qrVerified: null }),
  setStatus: (s) => set({ status: s }),
  setProgress: (p) => set({ progress: p }),
  setResult: (r) => set({ qrVerified: r.qrVerified, qrDecodedText: r.qrDecodedText, warning: r.warning ?? null, status: 'completed' }),
  setError: (e) => set({ error: e, status: 'failed' }),
  reset: () => set({ jobId: null, status: 'idle', progress: null, qrVerified: null, qrDecodedText: null, error: null, warning: null }),
}))
