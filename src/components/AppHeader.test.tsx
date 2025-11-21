import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import type { AuthState } from '@/features/auth/AuthContext'
import * as useAuthModule from '@/features/auth/useAuth'

const mockUseAuth = useAuthModule as { useAuth: () => AuthState }

describe('AppHeader', () => {
  beforeEach(() => {
    vi.spyOn(mockUseAuth, 'useAuth').mockReturnValue({
      user: { uid: 'user-1', email: 'user@example.com' } as unknown as AuthState['user'],
      loading: false,
      error: null,
    })
  })

  it('highlights Applications when on /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppHeader title="Applications" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /applications/i })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: /primary/i })
    expect(within(nav).getByText('Applications')).toHaveAttribute('aria-current', 'page')
    expect(within(nav).queryByRole('link', { name: 'Applications' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /import/i })).toBeInTheDocument()
  })

  it('highlights Import when on /import', () => {
    render(
      <MemoryRouter initialEntries={['/import']}>
        <AppHeader title="Import applications" />
      </MemoryRouter>,
    )

    const nav = screen.getByRole('navigation', { name: /primary/i })
    expect(within(nav).getByText('Import')).toHaveAttribute('aria-current', 'page')
    expect(within(nav).queryByRole('link', { name: 'Import' })).not.toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /applications/i })).toBeInTheDocument()
  })
})
