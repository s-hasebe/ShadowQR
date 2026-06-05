import { create } from 'zustand'

export interface ConvertParams {
  light: [number, number, number]
  wall_normal: [number, number, number]
  wall_offset: number
  qr_size: number
  qr_error_level: 'L' | 'M' | 'Q' | 'H'
  voxel_pitch: number
}

interface ParamStore extends ConvertParams {
  set: (partial: Partial<ConvertParams>) => void
}

export const useParamStore = create<ParamStore>((set) => ({
  light: [0, 50, 150],
  wall_normal: [0, 0, -1],
  wall_offset: 500,
  qr_size: 100,
  qr_error_level: 'H',
  voxel_pitch: 0.5,
  set: (partial) => set(partial),
}))

export function computeAngle(light: [number, number, number], wallNormal: [number, number, number]): number {
  const lLen = Math.sqrt(light[0] ** 2 + light[1] ** 2 + light[2] ** 2)
  const nLen = Math.sqrt(wallNormal[0] ** 2 + wallNormal[1] ** 2 + wallNormal[2] ** 2)
  if (lLen === 0 || nLen === 0) return 0
  const dot = light.reduce((s, v, i) => s + v * wallNormal[i], 0)
  const cosTheta = Math.abs(dot / (lLen * nLen))
  return (Math.acos(Math.min(1, cosTheta)) * 180) / Math.PI
}
