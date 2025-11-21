import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

  it('creates a new application through the form', async () => {
    vi.spyOn(repo, 'createApplication').mockResolvedValue('new-app')
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

    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /add application/i }))

    const positionInput = screen.getByLabelText(/position/i)
    const form = positionInput.closest('form')
    if (!form) {
      throw new Error('Expected application form to be present')
    }
    await user.type(within(form).getByLabelText(/position/i), 'Engineer')
    await user.type(within(form).getByLabelText(/^company$/i), 'NewCo')
    await user.type(within(form).getByLabelText(/date applied/i), '2025-01-05')

    await user.click(screen.getByRole('button', { name: /^create$/i }))

    expect(repo.createApplication).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        position: 'Engineer',
        company: 'NewCo',
      }),
    )

    expect(await screen.findByText('NewCo')).toBeInTheDocument()
  })

  it('deletes an application after confirming the modal', async () => {
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
    ])
    vi.spyOn(repo, 'deleteApplication').mockResolvedValue()
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

    const row = await screen.findByRole('row', { name: /alphacorp/i })
    const user = userEvent.setup()
    await user.click(within(row).getByRole('button', { name: /delete/i }))

    const dialog = await screen.findByRole('dialog', { name: /delete application/i })
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

    expect(repo.deleteApplication).toHaveBeenCalledWith('app-1')
    expect(screen.queryByText('AlphaCorp')).not.toBeInTheDocument()
  })
})
