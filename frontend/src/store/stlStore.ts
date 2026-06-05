import { create } from 'zustand'
import * as THREE from 'three'

interface StlStore {
  inputStlFile: File | null
  inputStlUrl: string | null
  outputStlUrl: string | null
  rotationMatrix: number[][]
  setInputStl: (file: File) => void
  setOutputStlUrl: (url: string) => void
  setRotationMatrix: (mat: number[][]) => void
  applyAxisRotation: (axis: 'x' | 'y' | 'z', deg: number) => void
  reset: () => void
}

const IDENTITY: number[][] = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
]

export const useStlStore = create<StlStore>((set, get) => ({
  inputStlFile: null,
  inputStlUrl: null,
  outputStlUrl: null,
  rotationMatrix: IDENTITY,

  setInputStl: (file) => {
    const prev = get().inputStlUrl
    if (prev) URL.revokeObjectURL(prev)
    set({
      inputStlFile: file,
      inputStlUrl: URL.createObjectURL(file),
      outputStlUrl: null,
    })
  },

  setOutputStlUrl: (url) => set({ outputStlUrl: url }),

  setRotationMatrix: (mat) => set({ rotationMatrix: mat }),

  applyAxisRotation: (axis, deg) => {
    const current = get().rotationMatrix
    const rad = (deg * Math.PI) / 180
    const rot = new THREE.Matrix4()
    if (axis === 'x') rot.makeRotationX(rad)
    else if (axis === 'y') rot.makeRotationY(rad)
    else rot.makeRotationZ(rad)

    const cur4 = new THREE.Matrix4()
    cur4.set(
      current[0][0], current[0][1], current[0][2], current[0][3],
      current[1][0], current[1][1], current[1][2], current[1][3],
      current[2][0], current[2][1], current[2][2], current[2][3],
      current[3][0], current[3][1], current[3][2], current[3][3],
    )
    rot.premultiply(cur4)
    const e = rot.elements
    // THREE stores column-major; convert to row-major 4x4
    set({
      rotationMatrix: [
        [e[0], e[4], e[8],  e[12]],
        [e[1], e[5], e[9],  e[13]],
        [e[2], e[6], e[10], e[14]],
        [e[3], e[7], e[11], e[15]],
      ],
    })
  },

  reset: () => set({ inputStlFile: null, inputStlUrl: null, outputStlUrl: null, rotationMatrix: IDENTITY }),
}))
