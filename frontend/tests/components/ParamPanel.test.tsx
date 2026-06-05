import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { ParamPanel } from '../../src/components/ParamPanel'
import { useParamStore } from '../../src/store/paramStore'

beforeEach(() => {
  useParamStore.setState({
    light: [0, 50, 150],
    wall_normal: [0, 0, -1],
    wall_offset: 500,
    qr_size: 100,
    qr_error_level: 'H',
    voxel_pitch: 0.5,
  })
})

describe('ParamPanel', () => {
  it('FE-07: renders the panel heading', () => {
    render(<ParamPanel />)
    expect(screen.getByText(/投影パラメータ/)).toBeInTheDocument()
  })

  it('FE-07: renders light source inputs with labels', () => {
    render(<ParamPanel />)
    expect(screen.getByText('光源 X (mm)')).toBeInTheDocument()
    expect(screen.getByText('光源 Y (mm)')).toBeInTheDocument()
    expect(screen.getByText('光源 Z (mm)')).toBeInTheDocument()
  })

  it('FE-07: renders wall normal inputs', () => {
    render(<ParamPanel />)
    expect(screen.getByText('壁面法線 X')).toBeInTheDocument()
    expect(screen.getByText('壁面法線 Y')).toBeInTheDocument()
    expect(screen.getByText('壁面法線 Z')).toBeInTheDocument()
  })

  it('FE-07: renders error correction select with H selected by default', () => {
    render(<ParamPanel />)
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('H')
  })

  it('FE-08: shows default light Z value as 150', () => {
    render(<ParamPanel />)
    // light inputs are the first 3 spinbuttons (X=0, Y=50, Z=150)
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[2]).toHaveValue(150)
  })

  it('FE-13: shows angle display label', () => {
    render(<ParamPanel />)
    expect(screen.getByText(/照射角度/)).toBeInTheDocument()
  })

  it('FE-14: shows warning when default angle is out of recommended range', () => {
    // default light=[0,50,150], wall_normal=[0,0,-1]
    // angle ≈ 18.4° < 20° → out of range
    render(<ParamPanel />)
    expect(screen.getByText(/推奨範囲外/)).toBeInTheDocument()
  })

  it('FE-14: no warning when angle is in recommended range', () => {
    // light=[0,100,30], wall_normal=[0,0,-1] → angle ≈ 73° (in range)
    useParamStore.getState().set({ light: [0, 100, 30] })
    render(<ParamPanel />)
    expect(screen.queryByText(/推奨範囲外/)).not.toBeInTheDocument()
  })

  it('FE-08: updating light X input changes store value', async () => {
    render(<ParamPanel />)
    const inputs = screen.getAllByRole('spinbutton')
    const lightXInput = inputs[0]
    await userEvent.clear(lightXInput)
    await userEvent.type(lightXInput, '99')
    expect(useParamStore.getState().light[0]).toBe(99)
  })
})
