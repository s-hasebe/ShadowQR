import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { UploadZone } from '../../src/components/UploadZone'
import { useStlStore } from '../../src/store/stlStore'

beforeEach(() => {
  useStlStore.getState().reset()
})

function makeFile(name: string, sizeBytes?: number): File {
  const file = new File(['x'], name, { type: 'model/stl' })
  if (sizeBytes !== undefined) {
    Object.defineProperty(file, 'size', { value: sizeBytes, configurable: true })
  }
  return file
}

describe('UploadZone', () => {
  it('FE-01: renders drop zone and heading', () => {
    render(<UploadZone />)
    expect(screen.getByText(/STLアップロード/)).toBeInTheDocument()
    expect(screen.getByText(/ドラッグ＆ドロップ/)).toBeInTheDocument()
  })

  it('FE-01: shows file name after valid .stl upload', async () => {
    const { container } = render(<UploadZone />)
    const input = container.querySelector('input[type="file"]')!
    const file = makeFile('my_model.stl')
    await userEvent.upload(input, file)
    expect(screen.getByText(/my_model\.stl/)).toBeInTheDocument()
  })

  it('FE-02: shows error when file exceeds 100MB', async () => {
    const { container } = render(<UploadZone />)
    const input = container.querySelector('input[type="file"]')!
    const largeFile = makeFile('huge.stl', 101 * 1024 * 1024)
    await userEvent.upload(input, largeFile)
    expect(screen.getByText('ファイルが100MBを超えています。')).toBeInTheDocument()
  })

  it('FE-02: large file is not stored in the store', async () => {
    const { container } = render(<UploadZone />)
    const input = container.querySelector('input[type="file"]')!
    const largeFile = makeFile('huge.stl', 101 * 1024 * 1024)
    await userEvent.upload(input, largeFile)
    expect(useStlStore.getState().inputStlFile).toBeNull()
  })

  it('FE-03 (UploadZone): shows error for non-.stl file', () => {
    // userEvent respects accept=".stl", so bypass it with fireEvent to test
    // the JS-level validation in handleFile
    const { container } = render(<UploadZone />)
    const input = container.querySelector('input[type="file"]')!
    const objFile = new File(['data'], 'model.obj', { type: 'model/obj' })
    fireEvent.change(input, { target: { files: [objFile] } })
    expect(screen.getByText('STLファイルを選択してください。')).toBeInTheDocument()
  })

  it('valid upload stores file in stlStore', async () => {
    const { container } = render(<UploadZone />)
    const input = container.querySelector('input[type="file"]')!
    const file = makeFile('valid.stl')
    await userEvent.upload(input, file)
    expect(useStlStore.getState().inputStlFile).toBe(file)
  })

  it('no error message is shown initially', () => {
    render(<UploadZone />)
    expect(screen.queryByText(/ファイルが100MB/)).not.toBeInTheDocument()
    expect(screen.queryByText(/STLファイルを選択/)).not.toBeInTheDocument()
  })
})
