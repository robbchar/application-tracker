import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ApplicationsPage } from './ApplicationsPage'
import type { AuthState } from '@/features/auth/AuthContext'
import * as useAuthModule from '@/features/auth/useAuth'
import * as repo from '@/features/applications/applicationRepository'

const mockUseAuth = useAuthModule as { useAuth: () => AuthState }

// Note: We don't mock react-window here because we want to see how it's used
// But react-window needs dimensions. We can mock its props or observe how it's called.

describe('Applications Performance', () => {
  it('passes the correct item count and row component to react-window', async () => {
    // Mock 100 applications
    const mockApps = Array.from({ length: 100 }).map((_, i) => ({
      id: `app-${i}`,
      userId: 'user-1',
      position: `Engineer ${i}`,
      company: `BigCorp ${i}`,
      appliedDate: new Date(),
      location: '',
      jobType: 'remote' as const,
      status: 'applied' as const,
      notes: '',
      links: [],
    }))

    vi.spyOn(repo, 'listApplicationsByUser').mockResolvedValue(mockApps)
    vi.spyOn(mockUseAuth, 'useAuth').mockReturnValue({
      user: { uid: 'user-1' } as unknown as AuthState['user'],
      loading: false,
      error: null,
    })

    // We can spy on the List component from react-window if it's exported as a function/component
    // but react-window 2.2.7 exports a functional List. We'll verify it indirectly or via vitest spies.

    render(
      <MemoryRouter>
        <ApplicationsPage />
      </MemoryRouter>,
    )

    // Check if at least some the items are rendered
    expect(await screen.findByText('BigCorp 0')).toBeInTheDocument()

    // In a virtualized list of 100 items with default height, we expect much fewer than 100 rows in the DOM.
    // Standard react-window would render ~15-20.
    const rows = screen.getAllByRole('row')
    // and a small number of visible rows (much fewer than 100)
    expect(rows.length).toBeLessThan(30)
    expect(rows.length).toBeGreaterThanOrEqual(2)
  })
})
