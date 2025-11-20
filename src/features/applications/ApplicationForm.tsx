import { type FormEvent, useMemo, useState } from 'react'
import type {
  Application,
  ApplicationInput,
  ApplicationStatus,
  JobType,
  Link,
} from '@/types/application'

type Mode = 'create' | 'edit'

type ApplicationFormProps = {
  mode: Mode
  initial?: Application
  submitting: boolean
  error: string | null
  onSubmit: (input: ApplicationInput) => Promise<void> | void
  onCancel: () => void
}

type LinkDraft = Link & { id: string }

const jobTypeOptions: JobType[] = ['hybrid', 'onsite', 'remote']

const statusOptions: ApplicationStatus[] = [
  'interested',
  'applied',
  'interview',
  'offer',
  'rejected',
  'archived',
]

const createEmptyLink = (): LinkDraft => ({
  id: crypto.randomUUID(),
  title: '',
  url: '',
})

export const ApplicationForm = ({
  mode,
  initial,
  submitting,
  error,
  onSubmit,
  onCancel,
}: ApplicationFormProps) => {
  const [position, setPosition] = useState(initial?.position ?? '')
  const [company, setCompany] = useState(initial?.company ?? '')
  const [appliedDate, setAppliedDate] = useState(
    initial ? initial.appliedDate.toISOString().slice(0, 10) : '',
  )
  const [location, setLocation] = useState(initial?.location ?? '')
  const [jobType, setJobType] = useState<JobType>(initial?.jobType ?? 'onsite')
  const [status, setStatus] = useState<ApplicationStatus>(initial?.status ?? 'interested')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [links, setLinks] = useState<LinkDraft[]>(
    (initial?.links ?? []).map((link) => ({ ...link, id: crypto.randomUUID() })) || [
      createEmptyLink(),
    ],
  )

  const title = mode === 'create' ? 'Add application' : 'Edit application'
  const primaryLabel = mode === 'create' ? 'Create' : 'Save changes'

  const hasAtLeastOneNonEmptyLink = useMemo(
    () => links.some((link) => link.title?.trim() || link.url.trim()),
    [links],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const date = appliedDate ? new Date(appliedDate) : new Date()

    const cleanedLinks: Link[] = hasAtLeastOneNonEmptyLink
      ? links
          .filter((link) => link.url.trim())
          .map((link) => {
            const url = link.url.trim()
            const title = link.title?.trim()
            const result: Link = { url }
            if (title) {
              result.title = title
            }
            return result
          })
      : []

    const payload: ApplicationInput = {
      position: position.trim(),
      company: company.trim(),
      appliedDate: date,
      location: location.trim(),
      jobType,
      status,
      notes: notes.trim(),
      links: cleanedLinks,
    }

    await onSubmit(payload)
  }

  const updateLink = (id: string, field: keyof Link, value: string) => {
    setLinks((current) =>
      current.map((link) => (link.id === id ? { ...link, [field]: value } : link)),
    )
  }

  const addLinkRow = () => {
    setLinks((current) => [...current, createEmptyLink()])
  }

  const removeLinkRow = (id: string) => {
    setLinks((current) =>
      current.length <= 1 ? current : current.filter((link) => link.id !== id),
    )
  }

  return (
    <section className="applications-form">
      <h2 className="applications-form-title">{title}</h2>
      <form className="applications-form-body" onSubmit={handleSubmit}>
        <div className="applications-form-grid">
          <label className="field">
            <span>Position</span>
            <input
              type="text"
              name="position"
              required
              value={position}
              onChange={(event) => setPosition(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Company</span>
            <input
              type="text"
              name="company"
              required
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Date applied</span>
            <input
              type="date"
              name="appliedDate"
              required
              value={appliedDate}
              onChange={(event) => setAppliedDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Location</span>
            <input
              type="text"
              name="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Job type</span>
            <select
              name="jobType"
              value={jobType}
              onChange={(event) => setJobType(event.target.value as JobType)}
            >
              {jobTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
            >
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Notes</span>
          <textarea
            name="notes"
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        <div className="field">
          <div className="applications-links-header">
            <span>Links</span>
            <button type="button" className="btn-secondary btn-small" onClick={addLinkRow}>
              Add link
            </button>
          </div>
          <div className="applications-links-list">
            {links.map((link) => (
              <div key={link.id} className="applications-links-row">
                <input
                  type="text"
                  placeholder="Title (optional)"
                  value={link.title ?? ''}
                  onChange={(event) => updateLink(link.id, 'title', event.target.value)}
                />
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={link.url}
                  onChange={(event) => updateLink(link.id, 'url', event.target.value)}
                />
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={() => removeLinkRow(link.id)}
                  disabled={links.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <div className="applications-form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : primaryLabel}
          </button>
        </div>
      </form>
    </section>
  )
}
