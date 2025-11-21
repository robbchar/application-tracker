import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import {
  createApplication,
  deleteApplication,
  listApplicationsByUser,
  updateApplication,
  updateApplicationStatus,
} from '@/features/applications/applicationRepository'
import type { Application, ApplicationInput, ApplicationStatus } from '@/types/application'
import { ApplicationForm } from '@/features/applications/ApplicationForm'
import { AppHeader } from '@/components/AppHeader'

type SortKey = 'appliedDate' | 'company' | 'jobType'

export const ApplicationsPage = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('appliedDate')
  const [companySearchQuery, setCompanySearchQuery] = useState('')
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [activeApplication, setActiveApplication] = useState<Application | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null)

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

  const visibleApplications = useMemo(() => {
    const normalizedQuery = companySearchQuery.trim().toLowerCase()
    const filtered = normalizedQuery
      ? applications.filter((application) =>
          application.company.toLowerCase().includes(normalizedQuery),
        )
      : applications
    const copy = [...filtered]
    copy.sort((a, b) => {
      if (sortKey === 'appliedDate') {
        return b.appliedDate.getTime() - a.appliedDate.getTime()
      }

      const aValue =
        sortKey === 'company' ? a.company.toLowerCase() : a.jobType.toString().toLowerCase()
      const bValue =
        sortKey === 'company' ? b.company.toLowerCase() : b.jobType.toString().toLowerCase()

      if (aValue < bValue) return -1
      if (aValue > bValue) return 1
      return 0
    })
    return copy
  }, [applications, sortKey, companySearchQuery])

  const hasData = !loading && !error && visibleApplications.length > 0
  const hasAnyApplications = !loading && !error && applications.length > 0

  const openCreateForm = () => {
    setFormMode('create')
    setActiveApplication(null)
    setFormError(null)
  }

  const openEditForm = (application: Application) => {
    setFormMode('edit')
    setActiveApplication(application)
    setFormError(null)
  }

  const closeForm = () => {
    setFormMode(null)
    setActiveApplication(null)
    setFormError(null)
  }

  const handleCreate = async (input: ApplicationInput) => {
    if (!user) return

    setFormSubmitting(true)
    setFormError(null)

    try {
      const id = await createApplication(user.uid, input)
      setApplications((current) => [{ ...input, id, userId: user.uid }, ...current])
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create application')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleEdit = async (input: ApplicationInput) => {
    if (!activeApplication) return

    setFormSubmitting(true)
    setFormError(null)

    try {
      await updateApplication(activeApplication.id, input)
      setApplications((current) =>
        current.map((application) =>
          application.id === activeApplication.id ? { ...application, ...input } : application,
        ),
      )
      closeForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update application')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    setStatusUpdatingId(id)
    try {
      await updateApplicationStatus(id, status)
      setApplications((current) =>
        current.map((application) =>
          application.id === id ? { ...application, status } : application,
        ),
      )
    } catch {
      // TODO surface a toast/error message for failed inline updates
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const requestDelete = (application: Application) => {
    setPendingDelete(application)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return

    const id = pendingDelete.id
    setDeletingId(id)
    try {
      await deleteApplication(id)
      setApplications((current) => current.filter((application) => application.id !== id))
      setPendingDelete(null)
    } catch {
      // TODO: surface delete failure to the user
    } finally {
      setDeletingId(null)
    }
  }

  const cancelDelete = () => {
    if (deletingId) return
    setPendingDelete(null)
  }

  return (
    <section className="applications-card">
      <AppHeader title="Applications" />

      {formMode && (
        <ApplicationForm
          mode={formMode}
          initial={formMode === 'edit' ? (activeApplication ?? undefined) : undefined}
          submitting={formSubmitting}
          error={formError}
          onSubmit={formMode === 'create' ? handleCreate : handleEdit}
          onCancel={closeForm}
        />
      )}

      <div className="applications-controls">
        <div className="applications-controls-main">
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
          <label className={!hasAnyApplications ? 'field-disabled' : undefined}>
            Company{' '}
            <input
              type="search"
              value={companySearchQuery}
              onChange={(event) => setCompanySearchQuery(event.target.value)}
              placeholder="Search company…"
              disabled={!hasAnyApplications}
            />
          </label>
        </div>
        <div className="applications-controls-actions">
          <button className="btn-primary" type="button" onClick={openCreateForm}>
            Add application
          </button>
        </div>
      </div>

      {loading && <p>Loading applications…</p>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && !error && applications.length === 0 && (
        <p>No applications yet. Start by adding your first one.</p>
      )}

      {!loading && !error && applications.length > 0 && visibleApplications.length === 0 && (
        <p>No applications match that company search.</p>
      )}

      {!loading && !error && visibleApplications.length > 0 && (
        <table className="applications-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Position</th>
              <th>Date</th>
              <th>Job type</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleApplications.map((application) => (
              <tr key={application.id}>
                <td>{application.company}</td>
                <td>{application.position}</td>
                <td>{application.appliedDate.toLocaleDateString()}</td>
                <td>{application.jobType}</td>
                <td>
                  <select
                    value={application.status}
                    onChange={(event) =>
                      handleStatusChange(application.id, event.target.value as ApplicationStatus)
                    }
                    disabled={
                      statusUpdatingId === application.id ||
                      (formMode === 'edit' && activeApplication?.id === application.id)
                    }
                  >
                    <option value="interested">interested</option>
                    <option value="applied">applied</option>
                    <option value="interview">interview</option>
                    <option value="offer">offer</option>
                    <option value="rejected">rejected</option>
                    <option value="archived">archived</option>
                  </select>
                </td>
                <td>
                  <div className="applications-row-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => openEditForm(application)}
                      disabled={formMode === 'edit' && activeApplication?.id === application.id}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => requestDelete(application)}
                      disabled={
                        deletingId === application.id ||
                        (formMode === 'edit' && activeApplication?.id === application.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {pendingDelete && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-delete-title"
          >
            <h2 id="modal-delete-title">Delete application</h2>
            <p>
              Are you sure you want to delete the application for{' '}
              <strong>{pendingDelete.position}</strong> at <strong>{pendingDelete.company}</strong>?
              This cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelDelete}
                disabled={deletingId === pendingDelete.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={confirmDelete}
                disabled={deletingId === pendingDelete.id}
              >
                {deletingId === pendingDelete.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
