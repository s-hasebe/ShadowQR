import { describe, it, expect, beforeEach } from 'vitest'
import { useStlStore } from '../../src/store/stlStore'

const IDENTITY = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
]

beforeEach(() => {
  useStlStore.getState().reset()
})

describe('useStlStore', () => {
  it('initial rotationMatrix is identity', () => {
    expect(useStlStore.getState().rotationMatrix).toEqual(IDENTITY)
  })

  it('initial inputStlFile and urls are null', () => {
    const state = useStlStore.getState()
    expect(state.inputStlFile).toBeNull()
    expect(state.inputStlUrl).toBeNull()
    expect(state.outputStlUrl).toBeNull()
  })

  it('setInputStl stores file and creates object URL', () => {
    const file = new File(['stl data'], 'model.stl', { type: 'model/stl' })
    useStlStore.getState().setInputStl(file)
    const state = useStlStore.getState()
    expect(state.inputStlFile).toBe(file)
    expect(state.inputStlUrl).toBe('blob:mock-url')
  })

  it('setInputStl clears previous outputStlUrl', () => {
    useStlStore.getState().setOutputStlUrl('/api/download/job-123')
    const file = new File(['stl data'], 'model.stl', { type: 'model/stl' })
    useStlStore.getState().setInputStl(file)
    expect(useStlStore.getState().outputStlUrl).toBeNull()
  })

  it('setOutputStlUrl updates outputStlUrl', () => {
    useStlStore.getState().setOutputStlUrl('/api/download/job-abc')
    expect(useStlStore.getState().outputStlUrl).toBe('/api/download/job-abc')
  })

  it('setRotationMatrix replaces the matrix', () => {
    const mat = [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
    useStlStore.getState().setRotationMatrix(mat)
    expect(useStlStore.getState().rotationMatrix).toEqual(mat)
  })

  it('applyAxisRotation(x, 90) changes matrix from identity', () => {
    useStlStore.getState().applyAxisRotation('x', 90)
    const mat = useStlStore.getState().rotationMatrix
    expect(mat).not.toEqual(IDENTITY)
    // X-90° rotation: row1=[0,0,-1,0], row2=[0,1,0,0]
    expect(mat[1][2]).toBeCloseTo(-1, 5)
    expect(mat[2][1]).toBeCloseTo(1, 5)
  })

  it('applyAxisRotation(y, 90) changes matrix from identity', () => {
    useStlStore.getState().applyAxisRotation('y', 90)
    const mat = useStlStore.getState().rotationMatrix
    expect(mat).not.toEqual(IDENTITY)
  })

  it('applyAxisRotation(z, 90) changes matrix from identity', () => {
    useStlStore.getState().applyAxisRotation('z', 90)
    const mat = useStlStore.getState().rotationMatrix
    expect(mat).not.toEqual(IDENTITY)
  })

  it('applying two 180° rotations returns to identity', () => {
    useStlStore.getState().applyAxisRotation('x', 180)
    useStlStore.getState().applyAxisRotation('x', 180)
    const mat = useStlStore.getState().rotationMatrix
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        expect(mat[r][c]).toBeCloseTo(IDENTITY[r][c], 5)
      }
    }
  })

  it('reset clears file and restores identity matrix', () => {
    const file = new File(['stl data'], 'model.stl', { type: 'model/stl' })
    useStlStore.getState().setInputStl(file)
    useStlStore.getState().applyAxisRotation('z', 45)
    useStlStore.getState().reset()
    const state = useStlStore.getState()
    expect(state.inputStlFile).toBeNull()
    expect(state.rotationMatrix).toEqual(IDENTITY)
  })
})
