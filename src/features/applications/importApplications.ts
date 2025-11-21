import type { ApplicationInput, ApplicationStatus, JobType, Link } from '@/types/application'

export type ParsedApplication = {
  input: ApplicationInput
  warnings: string[]
  sourceBlock: string
}

export type ParseFailure = {
  sourceBlock: string
  error: string
}

export type ParseApplicationsResult = {
  parsed: ParsedApplication[]
  failures: ParseFailure[]
}

const titleDelimiter = '###'

const httpUrlRegex = /https?:\/\/\S+/gi
const dateRegex = /(\d{4}-\d{2}-\d{2})|(\d{1,2}[/-]\d{1,2}[/-]\d{4})/g

export function parseApplicationsFromLog(rawText: string): ParseApplicationsResult {
  const blocks = splitIntoBlocks(rawText)
  const parsed: ParsedApplication[] = []
  const failures: ParseFailure[] = []

  for (const block of blocks) {
    const parseResult = parseBlock(block)
    if ('error' in parseResult) {
      failures.push(parseResult)
      continue
    }
    parsed.push(parseResult)
  }

  return { parsed, failures }
}

export function splitIntoBlocks(rawText: string): string[] {
  const normalizedText = rawText.replace(/\r\n/g, '\n')
  const lines = normalizedText.split('\n')

  const blocks: string[] = []
  let currentBlockLines: string[] = []

  const flushCurrentBlock = () => {
    const trimmedBlock = currentBlockLines.join('\n').trim()
    if (trimmedBlock) {
      blocks.push(trimmedBlock)
    }
    currentBlockLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (line.trimStart().startsWith(`${titleDelimiter} `)) {
      flushCurrentBlock()
      currentBlockLines.push(line)
      continue
    }

    if (currentBlockLines.length > 0) {
      currentBlockLines.push(line)
    }
  }

  flushCurrentBlock()
  return blocks
}

export function parseBlock(blockText: string): ParsedApplication | ParseFailure {
  const warnings: string[] = []

  const lines = blockText.replace(/\r\n/g, '\n').split('\n')
  const titleLineIndex = lines.findIndex((line) => line.trim().startsWith(titleDelimiter))
  if (titleLineIndex === -1) {
    return { sourceBlock: blockText, error: 'Missing title delimiter.' }
  }

  const titleLine = lines[titleLineIndex]
  const { position, company, appliedDate, dateWarnings } = parseTitleLine(titleLine)
  warnings.push(...dateWarnings)

  if (!position) {
    return { sourceBlock: blockText, error: 'Could not parse position from title line.' }
  }

  const remainingLines = lines.slice(titleLineIndex + 1)
  const urls = extractUrls(remainingLines)
  const links = urlsToLinks(urls)

  const notes = extractNotes(remainingLines)
  const inferredStatus = inferStatus(remainingLines)
  const status: ApplicationStatus = inferredStatus.status
  const jobType: JobType = inferJobType(`${titleLine}\n${notes}`)

  const input: ApplicationInput = {
    position,
    company,
    appliedDate,
    location: '',
    jobType,
    status,
    notes,
    links,
  }

  if (
    inferredStatus.rawText &&
    !notes.toLowerCase().includes(inferredStatus.rawText.toLowerCase())
  ) {
    input.notes = notes ? `${notes}\n${inferredStatus.rawText}` : inferredStatus.rawText
  }

  return { input, warnings, sourceBlock: blockText }
}

export function parseTitleLine(titleLine: string): {
  position: string
  company: string
  appliedDate: Date
  dateWarnings: string[]
} {
  const dateWarnings: string[] = []
  const rawTitle = titleLine.replace(/^#+\s*/, '').trim()

  const dateMatches = [...rawTitle.matchAll(dateRegex)]
  let appliedDate = new Date()
  let titleWithoutDate = rawTitle

  if (dateMatches.length === 0) {
    dateWarnings.push('No date found; defaulting to today.')
  } else {
    const lastMatch = dateMatches[dateMatches.length - 1]
    const matchedDateText = lastMatch[0]
    const parsedDate = parseDateString(matchedDateText)
    if (!parsedDate) {
      dateWarnings.push(`Unparseable date "${matchedDateText}"; defaulting to today.`)
    } else {
      appliedDate = parsedDate
    }

    const matchIndex = lastMatch.index ?? rawTitle.lastIndexOf(matchedDateText)
    titleWithoutDate = rawTitle.slice(0, matchIndex).trim()
    titleWithoutDate = titleWithoutDate.replace(/[-–—]\s*$/g, '').trim()

    if (dateMatches.length > 1) {
      dateWarnings.push('Multiple date-like tokens found; using the last one.')
    }
  }

  const atIndex = titleWithoutDate.lastIndexOf('@')
  let position = ''
  let company = ''

  if (atIndex === -1) {
    position = titleWithoutDate.trim()
  } else {
    position = titleWithoutDate.slice(0, atIndex).trim()
    company = titleWithoutDate.slice(atIndex + 1).trim()
  }

  return { position, company, appliedDate, dateWarnings }
}

export function extractUrls(lines: string[]): string[] {
  const urls: string[] = []
  for (const line of lines) {
    const matches = line.match(httpUrlRegex)
    if (!matches) continue
    for (const url of matches) {
      if (!urls.includes(url)) {
        urls.push(url)
      }
    }
  }
  return urls
}

function urlsToLinks(urls: string[]): Link[] {
  if (urls.length === 0) return []
  return urls.map((url, index) => (index === 0 ? { url, title: 'JD' } : { url }))
}

export function extractNotes(lines: string[]): string {
  const notesLines: string[] = []

  for (const line of lines) {
    if (isUrlLine(line)) continue
    notesLines.push(line)
  }

  while (notesLines.length > 0 && notesLines[0].trim() === '') {
    notesLines.shift()
  }
  while (notesLines.length > 0 && notesLines[notesLines.length - 1].trim() === '') {
    notesLines.pop()
  }

  return notesLines.join('\n').trimEnd()
}

export function inferStatus(lines: string[]): { status: ApplicationStatus; rawText?: string } {
  const bulletRegex = /^\s*-\s+(.+)$/
  const headerRegex = /^\s*(progress|notes)\s*:\s*$/i

  let afterHeader = false
  const bulletsAfterHeader: string[] = []
  const allBullets: string[] = []

  for (const line of lines) {
    if (headerRegex.test(line)) {
      afterHeader = true
      continue
    }

    const bulletMatch = line.match(bulletRegex)
    if (bulletMatch) {
      const bulletText = bulletMatch[1].trim()
      allBullets.push(bulletText)
      if (afterHeader) {
        bulletsAfterHeader.push(bulletText)
      }
    }
  }

  const rawText = bulletsAfterHeader[0] ?? allBullets[0]
  if (!rawText) {
    return { status: 'interested' }
  }

  const normalized = rawText.toLowerCase()
  if (normalized.includes('reject')) return { status: 'rejected', rawText }
  if (normalized.includes('offer')) return { status: 'offer', rawText }
  if (
    normalized.includes('interview') ||
    normalized.includes('screen') ||
    normalized.includes('call')
  ) {
    return { status: 'interview', rawText }
  }
  if (normalized.includes('applied')) return { status: 'applied', rawText }

  return { status: 'interested', rawText }
}

export function inferJobType(titleOrNotesText: string): JobType {
  const normalized = titleOrNotesText.toLowerCase()
  if (normalized.includes('remote')) return 'remote'
  if (normalized.includes('hybrid')) return 'hybrid'
  if (
    normalized.includes('onsite') ||
    normalized.includes('on-site') ||
    normalized.includes('in office') ||
    normalized.includes('in-office')
  ) {
    return 'onsite'
  }
  return 'remote'
}

export function parseDateString(dateText: string): Date | null {
  const trimmed = dateText.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parts = trimmed.split(/[/-]/).map((part) => Number(part))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null
  }

  const [month, day, year] = parts
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

function isUrlLine(line: string): boolean {
  return httpUrlRegex.test(line)
}
