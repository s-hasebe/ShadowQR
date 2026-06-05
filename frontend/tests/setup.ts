import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement URL.createObjectURL / revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
globalThis.URL.revokeObjectURL = vi.fn()
