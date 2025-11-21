import { useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { createApplicationsBulk } from '@/features/applications/applicationRepository'
import { parseApplicationsFromLog } from '@/features/applications/importApplications'
import { AppHeader } from '@/components/AppHeader'

export const ImportApplicationsPage = () => {
  const { user } = useAuth()

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
      await createApplicationsBulk(user.uid, inputs)
      setImportSuccessCount(inputs.length)
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
      <AppHeader title="Import applications" />

      <section className="applications-form" aria-label="Import applications">
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
    </section>
  )
}
