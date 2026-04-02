import type { ReactElement } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { List, type RowComponentProps } from 'react-window'
import { useAuth } from '@/features/auth/useAuth'
import {
  createApplication,
  deleteApplication,
  deleteAllApplicationsByUser,
  listApplicationsByUser,
  updateApplication,
  updateApplicationStatus,
} from '@/features/applications/applicationRepository'
import type { Application, ApplicationInput, ApplicationStatus } from '@/types/application'
import { ApplicationForm } from '@/features/applications/ApplicationForm'
import { AppHeader } from '@/components/AppHeader'

type SortKey = 'appliedDate' | 'company' | 'jobType' | 'position' | 'status'
type SortDirection = 'asc' | 'desc'
interface SortConfig {
  key: SortKey | null
  direction: SortDirection | null
}

interface ApplicationRowData {
  applications: Application[]
  statusUpdatingId: string | null
  deletingId: string | null
  formMode: 'create' | 'edit' | null
  activeApplicationId: string | undefined
  onStatusChange: (id: string, status: ApplicationStatus) => void
  onEdit: (application: Application) => void
  onDelete: (application: Application) => void
}

const ApplicationRow = ({
  index,
  style,
  applications,
  statusUpdatingId,
  deletingId,
  formMode,
  activeApplicationId,
  onStatusChange,
  onEdit,
  onDelete,
}: RowComponentProps<ApplicationRowData>): ReactElement | null => {
  const application = applications[index]
  if (!application) return null

  return (
    <div className="virtual-table-row" style={style} role="row">
      <div className="virtual-table-cell" title={application.company} role="gridcell">
        {application.company}
      </div>
      <div className="virtual-table-cell" title={application.position} role="gridcell">
        {application.links && application.links.length > 0 ? (
          <a
            href={application.links[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="job-link"
          >
            {application.position}
          </a>
        ) : (
          application.position
        )}
      </div>
      <div className="virtual-table-cell" role="gridcell">
        {application.appliedDate.toLocaleDateString()}
      </div>
      <div className="virtual-table-cell" role="gridcell">
        {application.jobType}
      </div>
      <div className="virtual-table-cell" role="gridcell">
        <select
          value={application.status}
          onChange={(event) =>
            onStatusChange(application.id, event.target.value as ApplicationStatus)
          }
          disabled={
            statusUpdatingId === application.id ||
            (formMode === 'edit' && activeApplicationId === application.id)
          }
        >
          <option value="interested">interested</option>
          <option value="applied">applied</option>
          <option value="interview">interview</option>
          <option value="offer">offer</option>
          <option value="rejected">rejected</option>
          <option value="archived">archived</option>
        </select>
      </div>
      <div className="virtual-table-cell" role="gridcell">
        <div className="applications-row-actions">
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={() => onEdit(application)}
            disabled={formMode === 'edit' && activeApplicationId === application.id}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={() => onDelete(application)}
            disabled={
              deletingId === application.id ||
              (formMode === 'edit' && activeApplicationId === application.id)
            }
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export const ApplicationsPage = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'appliedDate',
    direction: 'desc',
  })
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

    if (!sortConfig.key || !sortConfig.direction) return filtered

    const copy = [...filtered]
    copy.sort((a, b) => {
      let aValue: any = a[sortConfig.key!]
      let bValue: any = b[sortConfig.key!]

      if (aValue instanceof Date) aValue = (aValue as Date).getTime()
      if (bValue instanceof Date) bValue = (bValue as Date).getTime()

      if (typeof aValue === 'string') aValue = aValue.toLowerCase()
      if (typeof bValue === 'string') bValue = bValue.toLowerCase()

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [applications, sortConfig, companySearchQuery])

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

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' }
      }
      return { key: null, direction: null }
    })
  }

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return '-'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const handleDeleteAll = async () => {
    if (!user) return
    const confirmed = window.confirm(
      'Are you sure you want to delete ALL your applications? This cannot be undone.',
    )
    if (!confirmed) return

    setLoading(true)
    try {
      await deleteAllApplicationsByUser(user.uid)
      setApplications([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete applications')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="applications-card">
      <AppHeader title="Applications" />

      {formMode && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <ApplicationForm
              mode={formMode}
              initial={formMode === 'edit' ? (activeApplication ?? undefined) : undefined}
              submitting={formSubmitting}
              error={formError}
              onSubmit={formMode === 'create' ? handleCreate : handleEdit}
              onCancel={closeForm}
            />
          </div>
        </div>
      )}

      <div className="applications-controls">
        <div className="applications-controls-main">
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
          <button
            className="btn-primary"
            type="button"
            onClick={openCreateForm}
            style={{ marginRight: '8px' }}
          >
            Add application
          </button>
          <button
            className="btn-danger"
            type="button"
            onClick={handleDeleteAll}
            disabled={loading || applications.length === 0}
          >
            Delete all
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
        <div className="virtual-table-container">
          <div className="virtual-table-header" role="row">
            <div
              onClick={() => handleSort('company')}
              className="virtual-table-header-cell sortable-header"
              role="columnheader"
            >
              Company {getSortIndicator('company')}
            </div>
            <div
              onClick={() => handleSort('position')}
              className="virtual-table-header-cell sortable-header"
              role="columnheader"
            >
              Position {getSortIndicator('position')}
            </div>
            <div
              onClick={() => handleSort('appliedDate')}
              className="virtual-table-header-cell sortable-header"
              role="columnheader"
            >
              Date {getSortIndicator('appliedDate')}
            </div>
            <div
              onClick={() => handleSort('jobType')}
              className="virtual-table-header-cell sortable-header"
              role="columnheader"
            >
              Job type {getSortIndicator('jobType')}
            </div>
            <div
              onClick={() => handleSort('status')}
              className="virtual-table-header-cell sortable-header"
              role="columnheader"
            >
              Status {getSortIndicator('status')}
            </div>
            <div className="virtual-table-header-cell" role="columnheader" />
          </div>

          <div className="virtual-list-wrapper">
            <List<ApplicationRowData>
              className="virtual-table-list"
              rowCount={visibleApplications.length}
              rowHeight={50}
              rowComponent={ApplicationRow}
              role="grid"
              rowProps={{
                applications: visibleApplications,
                statusUpdatingId,
                deletingId,
                formMode,
                activeApplicationId: activeApplication?.id,
                onStatusChange: handleStatusChange,
                onEdit: openEditForm,
                onDelete: requestDelete,
              }}
            />
          </div>
        </div>
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
