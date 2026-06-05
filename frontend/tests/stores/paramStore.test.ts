import { describe, it, expect, beforeEach } from 'vitest'
import { computeAngle, useParamStore } from '../../src/store/paramStore'

const INITIAL: Parameters<typeof useParamStore.setState>[0] = {
  light: [0, 50, 150],
  wall_normal: [0, 0, -1],
  wall_offset: 500,
  qr_size: 100,
  qr_error_level: 'H',
  voxel_pitch: 0.5,
}

beforeEach(() => {
  useParamStore.setState(INITIAL)
})

// --- computeAngle -----------------------------------------------------------

describe('computeAngle', () => {
  it('returns 0 when light vector is zero', () => {
    expect(computeAngle([0, 0, 0], [0, 0, -1])).toBe(0)
  })

  it('returns 0 when wall normal is zero', () => {
    expect(computeAngle([1, 0, 0], [0, 0, 0])).toBe(0)
  })

  it('returns 90 when vectors are perpendicular', () => {
    expect(computeAngle([1, 0, 0], [0, 1, 0])).toBeCloseTo(90, 1)
  })

  it('returns 0 when vectors are parallel', () => {
    expect(computeAngle([0, 0, 1], [0, 0, 1])).toBeCloseTo(0, 1)
  })

  it('returns correct angle for ~73° configuration', () => {
    // light = [0, 100, 30], wall_normal = [0, 0, -1]
    // |dot| = 30, |light| ≈ 104.4, angle = acos(30/104.4) ≈ 73.3°
    const angle = computeAngle([0, 100, 30], [0, 0, -1])
    expect(angle).toBeGreaterThan(70)
    expect(angle).toBeLessThan(80)
  })
})

// --- store state ------------------------------------------------------------

describe('useParamStore', () => {
  it('has correct default light position', () => {
    expect(useParamStore.getState().light).toEqual([0, 50, 150])
  })

  it('has default qr_error_level H', () => {
    expect(useParamStore.getState().qr_error_level).toBe('H')
  })

  it('has default voxel_pitch 0.5', () => {
    expect(useParamStore.getState().voxel_pitch).toBe(0.5)
  })

  it('set() updates partial state', () => {
    useParamStore.getState().set({ qr_size: 200 })
    expect(useParamStore.getState().qr_size).toBe(200)
  })

  it('set() does not overwrite unrelated fields', () => {
    useParamStore.getState().set({ wall_offset: 300 })
    expect(useParamStore.getState().voxel_pitch).toBe(0.5)
  })
})
