import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplicationForm } from './ApplicationForm'

describe('ApplicationForm', () => {
  beforeEach(() => {
    if (!globalThis.crypto) {
      // @ts-expect-error test-only
      globalThis.crypto = {}
    }
    let callCount = 0
    const randomUUIDMock = vi.fn(() => `test-uuid-${callCount++}`)
    // @ts-expect-error test-only
    globalThis.crypto.randomUUID = randomUUIDMock
  })

  it('submits trimmed values and filters empty links', async () => {
    const onSubmit = vi.fn()
    render(
      <ApplicationForm
        mode="create"
        submitting={false}
        error={null}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/position/i), '  Frontend Engineer  ')
    await user.type(screen.getByLabelText(/company/i), '  TestCo ')
    await user.type(screen.getByLabelText(/date applied/i), '2025-01-10')
    await user.type(screen.getByLabelText(/notes/i), '  hello world  ')

    await user.click(screen.getByRole('button', { name: /add link/i }))
    const urlInput = screen.getByPlaceholderText(/https:\/\/example.com/i)
    await user.type(urlInput, 'https://example.com/job')

    await user.click(screen.getByRole('button', { name: /create/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.position).toBe('Frontend Engineer')
    expect(payload.company).toBe('TestCo')
    expect(payload.notes).toBe('hello world')
    expect(payload.links).toEqual([{ url: 'https://example.com/job' }])
  })

  it('can add and remove link rows', async () => {
    render(
      <ApplicationForm
        mode="create"
        submitting={false}
        error={null}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /add link/i }))
    expect(screen.getAllByPlaceholderText(/https:\/\/example.com/i)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: /add link/i }))
    expect(screen.getAllByPlaceholderText(/https:\/\/example.com/i)).toHaveLength(2)

    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    await user.click(removeButtons[0])
    expect(screen.getAllByPlaceholderText(/https:\/\/example.com/i)).toHaveLength(1)
  })
})
