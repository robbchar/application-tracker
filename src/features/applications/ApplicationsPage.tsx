import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import { useAuth } from '@/features/auth/useAuth'
import {
  createApplication,
  createApplicationsBulk,
  deleteApplication,
  listApplicationsByUser,
  updateApplication,
  updateApplicationStatus,
} from '@/features/applications/applicationRepository'
import { parseApplicationsFromLog } from '@/features/applications/importApplications'
import type { Application, ApplicationInput, ApplicationStatus } from '@/types/application'
import { auth } from '@/lib/firebase'
import { ApplicationForm } from '@/features/applications/ApplicationForm'

type SortKey = 'appliedDate' | 'company' | 'jobType'

export const ApplicationsPage = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('appliedDate')
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [activeApplication, setActiveApplication] = useState<Application | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null)

  const defaultImportFormat =
    '### TITLE @ COMPANY_NAME - DATE\\n[optional company site]\\n[optional JD_LINK]\\nprogress or notes:\\n- STATUS'
  const [importFormat, setImportFormat] = useState(defaultImportFormat)
  const [importText, setImportText] = useState('')
  const [importPreview, setImportPreview] = useState<ReturnType<
    typeof parseApplicationsFromLog
  > | null>(null)
  const [importSubmitting, setImportSubmitting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null)

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
        sortKey === 'company' ? a.company.toLowerCase() : a.jobType.toString().toLowerCase()
      const bValue =
        sortKey === 'company' ? b.company.toLowerCase() : b.jobType.toString().toLowerCase()

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

  const handlePreviewImport = () => {
    setImportError(null)
    setImportSuccessCount(null)
    const preview = parseApplicationsFromLog(importText)
    setImportPreview(preview)
  }

  const cancelImportPreview = () => {
    if (importSubmitting) return
    setImportPreview(null)
  }

  const confirmImport = async () => {
    if (!user || !importPreview || importPreview.parsed.length === 0) return

    setImportSubmitting(true)
    setImportError(null)

    try {
      const inputs = importPreview.parsed.map((item) => item.input)
      const ids = await createApplicationsBulk(user.uid, inputs)
      const createdApplications: Application[] = inputs.map((input, index) => ({
        ...input,
        id: ids[index],
        userId: user.uid,
      }))

      setApplications((current) => [...createdApplications, ...current])
      setImportSuccessCount(createdApplications.length)
      setImportPreview(null)
      setImportText('')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import applications')
    } finally {
      setImportSubmitting(false)
    }
  }

  return (
    <section className="applications-card">
      <section className="applications-form" aria-label="Import applications">
        <h2 className="applications-form-title">Import applications</h2>
        <div className="applications-form-body">
          <label className="field">
            <span>Format (editable for reference)</span>
            <textarea
              name="importFormat"
              rows={4}
              value={importFormat}
              onChange={(event) => setImportFormat(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Paste logs</span>
            <textarea
              name="importText"
              rows={10}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Paste application notes here…"
            />
          </label>

          <div className="applications-form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handlePreviewImport}
              disabled={!importText.trim() || importSubmitting}
            >
              Preview import
            </button>
          </div>

          {importError && <p className="auth-error">{importError}</p>}
          {importSuccessCount !== null && <p>Imported {importSuccessCount} applications.</p>}

          {importPreview && (
            <div className="applications-controls">
              <div>
                <p>
                  Ready to import <strong>{importPreview.parsed.length}</strong> applications.
                </p>
                {importPreview.parsed.map((item, index) => (
                  <div key={`${item.input.company}-${item.input.position}-${index}`}>
                    <p>
                      {item.input.company || '(no company)'} — {item.input.position} (
                      {item.input.appliedDate.toLocaleDateString()}) — {item.input.status} —{' '}
                      {item.input.jobType}
                    </p>
                    {item.warnings.length > 0 && (
                      <ul>
                        {item.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}

                {importPreview.failures.length > 0 && (
                  <>
                    <p>Failures: {importPreview.failures.length}</p>
                    <ul>
                      {importPreview.failures.map((failure, idx) => (
                        <li key={`${failure.error}-${idx}`}>{failure.error}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="app-header-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={cancelImportPreview}
                  disabled={importSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={confirmImport}
                  disabled={importSubmitting || importPreview.parsed.length === 0}
                >
                  {importSubmitting ? 'Importing…' : 'Import now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

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
          <button className="btn-primary" type="button" onClick={openCreateForm}>
            Add application
          </button>
        </div>
      </header>

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
        <div>{/* TODO: add filters in a later iteration */}</div>
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
              <th />
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
