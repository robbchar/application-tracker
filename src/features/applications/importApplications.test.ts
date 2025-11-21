import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseApplicationsFromLog,
  splitIntoBlocks,
  parseDateString,
  inferStatus,
  inferJobType,
} from './importApplications'

describe('importApplications parser', () => {
  const sampleLog = `### Senior Engineering Manager, Buy @ Spanx - 1/8/2025

spanx.com

https://www.linkedin.com/jobs/view/4113014594

progress:

- rejected by email

### Senior Engineering Manager @ GlossGenius - 1/8/2025

glossgenius.com

https://www.linkedin.com/jobs/view/4104383254/

progress:

- rejected by email

### Engineering Manager - Frontend @ Qventus - 1/9/2025

qventus.com

https://www.linkedin.com/jobs/view/4120605447/

progress:

- rejected by email`

  it('splits logs into blocks using ### delimiter', () => {
    const blocks = splitIntoBlocks(sampleLog)
    expect(blocks).toHaveLength(3)
    expect(blocks[0]).toMatch(/Spanx/)
    expect(blocks[2]).toMatch(/Qventus/)
  })

  it('parses applications from the sample log', () => {
    const { parsed, failures } = parseApplicationsFromLog(sampleLog)
    expect(failures).toHaveLength(0)
    expect(parsed).toHaveLength(3)

    const first = parsed[0].input
    expect(first.position).toBe('Senior Engineering Manager, Buy')
    expect(first.company).toBe('Spanx')
    expect(first.appliedDate.getFullYear()).toBe(2025)
    expect(first.appliedDate.getMonth()).toBe(0)
    expect(first.appliedDate.getDate()).toBe(8)
    expect(first.links[0]?.url).toContain('linkedin.com/jobs/view/4113014594')
    expect(first.status).toBe('rejected')
    expect(first.jobType).toBe('remote')
    expect(first.notes).toMatch(/progress:/i)
  })

  describe('parseDateString', () => {
    it('parses slash and dash formats', () => {
      expect(parseDateString('1/8/2025')?.toISOString().slice(0, 10)).toBe('2025-01-08')
      expect(parseDateString('01-09-2025')?.toISOString().slice(0, 10)).toBe('2025-01-09')
      expect(parseDateString('2025-11-21')?.toISOString().slice(0, 10)).toBe('2025-11-21')
    })

    it('returns null for invalid dates', () => {
      expect(parseDateString('13/40/2025')).toBeNull()
      expect(parseDateString('not-a-date')).toBeNull()
    })
  })

  describe('inferStatus', () => {
    it('maps rejected bullets to rejected', () => {
      const result = inferStatus(['progress:', '- rejected by email'])
      expect(result.status).toBe('rejected')
    })

    it('maps offer bullets to offer', () => {
      const result = inferStatus(['notes:', '- offer received'])
      expect(result.status).toBe('offer')
    })

    it('defaults to interested when no bullets', () => {
      const result = inferStatus(['no status here'])
      expect(result.status).toBe('interested')
    })
  })

  describe('inferJobType', () => {
    it('infers from keywords else defaults remote', () => {
      expect(inferJobType('Senior Engineer Remote')).toBe('remote')
      expect(inferJobType('Hybrid role')).toBe('hybrid')
      expect(inferJobType('On-site in office')).toBe('onsite')
      expect(inferJobType('No keywords')).toBe('remote')
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-02-01T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('defaults date to today when missing', () => {
      const log = `### Engineer @ TestCo
https://example.com/job/1`
      const { parsed, failures } = parseApplicationsFromLog(log)
      expect(failures).toHaveLength(0)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].input.appliedDate.toISOString().slice(0, 10)).toBe('2025-02-01')
      expect(parsed[0].warnings).toContain('No date found; defaulting to today.')
    })

    it('handles missing @ by leaving company empty', () => {
      const log = `### Just A Title - 1/1/2025`
      const { parsed, failures } = parseApplicationsFromLog(log)
      expect(failures).toHaveLength(0)
      expect(parsed[0].input.position).toBe('Just A Title')
      expect(parsed[0].input.company).toBe('')
    })
  })
})
