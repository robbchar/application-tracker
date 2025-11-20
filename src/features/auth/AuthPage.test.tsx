import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthPage } from './AuthPage'

describe('AuthPage', () => {
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
})
