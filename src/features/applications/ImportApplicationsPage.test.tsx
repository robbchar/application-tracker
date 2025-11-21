import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ImportApplicationsPage } from './ImportApplicationsPage'
import type { AuthState } from '@/features/auth/AuthContext'
import * as useAuthModule from '@/features/auth/useAuth'
import * as repo from '@/features/applications/applicationRepository'

const mockUseAuth = useAuthModule as { useAuth: () => AuthState }

describe('ImportApplicationsPage', () => {
  beforeEach(() => {
    vi.spyOn(mockUseAuth, 'useAuth').mockReturnValue({
      user: { uid: 'user-1' } as unknown as AuthState['user'],
      loading: false,
      error: null,
    })
    vi.spyOn(repo, 'createApplicationsBulk').mockResolvedValue(['new-1'])
  })

  it('previews and imports parsed applications', async () => {
    render(
      <MemoryRouter initialEntries={['/import']}>
        <ImportApplicationsPage />
      </MemoryRouter>,
    )

    const user = userEvent.setup()
    const previewButton = screen.getByRole('button', { name: /preview import/i })
    expect(previewButton).toBeDisabled()

    await user.type(
      screen.getByLabelText(/paste logs/i),
      '### Engineer @ TestCo - 1/1/2025\nhttps://example.com/job',
    )

    expect(previewButton).toBeEnabled()
    await user.click(previewButton)

    expect(await screen.findByText(/ready to import/i)).toBeInTheDocument()
    expect(screen.getByText(/testco/i, { selector: 'p' })).toBeInTheDocument()

    const importNowButton = screen.getByRole('button', { name: /import now/i })
    await user.click(importNowButton)

    expect(repo.createApplicationsBulk).toHaveBeenCalledTimes(1)
    expect(repo.createApplicationsBulk).toHaveBeenCalledWith(
      'user-1',
      expect.arrayContaining([
        expect.objectContaining({ company: 'TestCo', position: 'Engineer' }),
      ]),
    )

    expect(await screen.findByText(/imported 1 applications/i)).toBeInTheDocument()
  })
})
