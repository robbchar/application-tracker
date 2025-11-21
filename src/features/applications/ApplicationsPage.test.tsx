import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('filters applications by company name as the user types', async () => {
    vi.spyOn(repo, 'listApplicationsByUser').mockResolvedValue([
      {
        id: 'app-1',
        userId: 'user-1',
        position: 'Engineer',
        company: 'AlphaCorp',
        appliedDate: new Date('2025-01-01'),
        location: '',
        jobType: 'remote',
        status: 'applied',
        notes: '',
        links: [],
      },
      {
        id: 'app-2',
        userId: 'user-1',
        position: 'Manager',
        company: 'Beta Industries',
        appliedDate: new Date('2025-01-02'),
        location: '',
        jobType: 'remote',
        status: 'applied',
        notes: '',
        links: [],
      },
    ])

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

    expect(await screen.findByText('AlphaCorp')).toBeInTheDocument()
    expect(await screen.findByText('Beta Industries')).toBeInTheDocument()

    const user = userEvent.setup()
    const searchInput = screen.getByRole('searchbox', { name: /company/i })
    await user.type(searchInput, 'beta')

    expect(screen.queryByText('AlphaCorp')).not.toBeInTheDocument()
    expect(screen.getByText('Beta Industries')).toBeInTheDocument()
  })
})
