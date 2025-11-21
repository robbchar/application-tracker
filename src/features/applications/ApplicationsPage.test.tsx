import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ApplicationsPage } from './ApplicationsPage'
import type { AuthState } from '@/features/auth/AuthContext'
import * as useAuthModule from '@/features/auth/useAuth'
import * as repo from '@/features/applications/applicationRepository'

const mockUseAuth = useAuthModule as { useAuth: () => AuthState }

describe('ApplicationsPage', () => {
  beforeEach(() => {
    vi.spyOn(repo, 'listApplicationsByUser').mockResolvedValue([])
  })

  it('shows empty state when there are no applications', async () => {
    vi.spyOn(mockUseAuth, 'useAuth').mockReturnValue({
      user: { uid: 'user-1' } as unknown as AuthState['user'],
      loading: false,
      error: null,
    })

    render(
      <MemoryRouter>
        <ApplicationsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/no applications yet/i)).toBeInTheDocument()
  })
})
