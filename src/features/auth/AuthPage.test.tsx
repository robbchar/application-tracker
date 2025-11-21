import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthPage } from './AuthPage'

import { vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'

vi.mock('@/lib/firebase', () => ({
  auth: {},
  googleAuthProvider: {},
}))

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
}))

describe('AuthPage', () => {
  beforeEach(() => {
    vi.mocked(signInWithEmailAndPassword).mockReset()
    vi.mocked(createUserWithEmailAndPassword).mockReset()
    vi.mocked(signInWithPopup).mockReset()
  })

  it('renders sign in form by default', () => {
    render(<AuthPage />)

    expect(screen.getByRole('heading', { name: /sign in to your tracker/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('allows toggling to create account mode', () => {
    render(<AuthPage />)

    fireEvent.click(screen.getByRole('button', { name: /create one/i }))

    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows friendly error on failed sign in', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValue({ code: 'auth/wrong-password' })

    render(<AuthPage />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'badpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/incorrect email or password/i)).toBeInTheDocument()
  })

  it('shows friendly error on failed signup', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValue({
      code: 'auth/email-already-in-use',
    })

    render(<AuthPage />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /create one/i }))
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument()
  })

  it('shows friendly error when google popup is closed', async () => {
    vi.mocked(signInWithPopup).mockRejectedValue({ code: 'auth/popup-closed-by-user' })

    render(<AuthPage />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(await screen.findByText(/popup was closed/i)).toBeInTheDocument()
  })
})
