import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QRTextInput } from '../../src/components/QRTextInput'

describe('QRTextInput', () => {
  it('FE-04: renders textarea with placeholder', () => {
    render(<QRTextInput value="" onChange={() => {}} />)
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument()
  })

  it('FE-05: shows 0 / 2953 bytes when value is empty', () => {
    render(<QRTextInput value="" onChange={() => {}} />)
    expect(screen.getByText('0 / 2953 バイト')).toBeInTheDocument()
  })

  it('FE-05: shows correct byte count for ASCII string', () => {
    render(<QRTextInput value="hello" onChange={() => {}} />)
    expect(screen.getByText('5 / 2953 バイト')).toBeInTheDocument()
  })

  it('FE-05: counts multi-byte characters (UTF-8)', () => {
    // "あ" is 3 bytes in UTF-8
    render(<QRTextInput value="あ" onChange={() => {}} />)
    expect(screen.getByText('3 / 2953 バイト')).toBeInTheDocument()
  })

  it('FE-06: textarea has warning border color when over limit', () => {
    const overText = 'a'.repeat(2954)
    render(<QRTextInput value={overText} onChange={() => {}} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveStyle({ borderColor: '#f87171' })
  })

  it('FE-06: byte counter shows warning color when over limit', () => {
    const overText = 'a'.repeat(2954)
    render(<QRTextInput value={overText} onChange={() => {}} />)
    expect(screen.getByText('2954 / 2953 バイト')).toHaveStyle({ color: '#f87171' })
  })

  it('FE-06: no warning border within limit', () => {
    render(<QRTextInput value="ok" onChange={() => {}} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).not.toHaveStyle({ borderColor: '#f87171' })
  })

  it('FE-03: calls onChange when user types', async () => {
    const onChange = vi.fn()
    render(<QRTextInput value="" onChange={onChange} />)
    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('calls onChange with the new value', async () => {
    const values: string[] = []
    const onChange = (v: string) => values.push(v)
    render(<QRTextInput value="" onChange={onChange} />)
    const textarea = screen.getByRole('textbox')
    await userEvent.type(textarea, 'x')
    expect(values.length).toBeGreaterThan(0)
    expect(values[values.length - 1]).toContain('x')
  })
})
