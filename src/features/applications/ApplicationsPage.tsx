import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import { useAuth } from '@/features/auth/useAuth'
import { listApplicationsByUser } from '@/features/applications/applicationRepository'
import type { Application } from '@/types/application'
import { auth } from '@/lib/firebase'

type SortKey = 'appliedDate' | 'company' | 'jobType'

export const ApplicationsPage = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('appliedDate')

  useEffect(() => {
    if (!user) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const items = await listApplicationsByUser(user.uid)
        setApplications(items)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load applications')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [user])

  const sortedApplications = useMemo(() => {
    const copy = [...applications]
    copy.sort((a, b) => {
      if (sortKey === 'appliedDate') {
        return b.appliedDate.getTime() - a.appliedDate.getTime()
      }

      const aValue =
        sortKey === 'company'
          ? a.company.toLowerCase()
          : a.jobType.toString().toLowerCase()
      const bValue =
        sortKey === 'company'
          ? b.company.toLowerCase()
          : b.jobType.toString().toLowerCase()

      if (aValue < bValue) return -1
      if (aValue > bValue) return 1
      return 0
    })
    return copy
  }, [applications, sortKey])

  const handleSignOut = async () => {
    await signOut(auth)
  }

  const hasData = !loading && !error && sortedApplications.length > 0

  return (
    <section className="applications-card">
      <header className="app-header">
        <div>
          <h1>Applications</h1>
          {user && (
            <p className="app-subtitle">
              Signed in as <strong>{user.email ?? user.uid}</strong>
            </p>
          )}
        </div>
        <div className="app-header-actions">
          <button className="btn-secondary" type="button" onClick={handleSignOut}>
            Sign out
          </button>
          <button className="btn-primary" type="button" disabled>
            Add application
          </button>
        </div>
      </header>

      <div className="applications-controls">
        <div>
          <label className={!hasData ? 'field-disabled' : undefined}>
            Sort by{' '}
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              disabled={!hasData}
            >
              <option value="appliedDate">Date</option>
              <option value="company">Company</option>
              <option value="jobType">Job type</option>
            </select>
          </label>
        </div>
        <div>
          {/* TODO: add filters in a later iteration */}
        </div>
      </div>

      {loading && <p>Loading applications…</p>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && sortedApplications.length === 0 && (
        <p>No applications yet. Start by adding your first one.</p>
      )}

      {!loading && !error && sortedApplications.length > 0 && (
        <table className="applications-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Position</th>
              <th>Date</th>
              <th>Job type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedApplications.map((application) => (
              <tr key={application.id}>
                <td>{application.company}</td>
                <td>{application.position}</td>
                <td>{application.appliedDate.toLocaleDateString()}</td>
                <td>{application.jobType}</td>
                <td>
                  <span className="badge">{application.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}


