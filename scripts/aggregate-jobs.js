import fs from 'fs'
import path from 'path'

const JOBS_DIR = 'C:\\Users\\Admin\\OneDrive\\Documents\\Windows\\job stuff\\jobs applied to'
const OUTPUT_FILE = 'master_import.md'

const CURRENT_YEAR = 2026
const CURRENT_MONTH = 3 // March

function normalizeDate(line, fileName) {
  // Matches: M/D/YY, MM/DD/YYYY, M-D-YYYYY, OR just M/D
  const dateRegex = /(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,5}))?/
  const match = line.match(dateRegex)

  if (!match) return line

  let [fullMatch, monthStr, dayStr, yearStr] = match
  let month = parseInt(monthStr)
  let year

  if (yearStr) {
    year = yearStr
    if (year === '20225') year = '2025'
    if (year.length === 2) {
      year = parseInt(year) < 70 ? `20${year}` : `19${year}`
    }
  } else {
    // YEAR INFERENCE LOGIC
    // 1. Try to get year from filename first (e.g., "01-04-2026.md")
    const fileYearMatch = fileName.match(/202\d/)
    if (fileYearMatch) {
      year = fileYearMatch[0]
    } else {
      // 2. Fallback to "Has month passed yet in 2026?"
      // If month <= current month (Jan, Feb, Mar), it's 2026.
      // If month > current month (Apr - Dec), it's 2025.
      year = month <= CURRENT_MONTH ? '2026' : '2025'
    }
  }

  const paddedMonth = monthStr.padStart(2, '0')
  const paddedDay = dayStr.padStart(2, '0')
  const normalizedDate = `${paddedMonth}/${paddedDay}/${year}`

  return line.replace(fullMatch, normalizedDate)
}

function aggregateJobs() {
  const files = fs
    .readdirSync(JOBS_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort()

  let masterLog = ''
  let count = 0

  files.forEach((file) => {
    const filePath = path.join(JOBS_DIR, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.replace(/\r\n/g, '\n').split('\n')

    const processedLines = lines.map((line) => {
      if (line.trim().startsWith('###')) {
        count++
        return normalizeDate(line, file)
      }
      return line
    })

    if (masterLog && !masterLog.endsWith('\n\n')) masterLog += '\n\n'
    masterLog += `<!-- Source: ${file} -->\n`
    masterLog += processedLines.join('\n')
  })

  fs.writeFileSync(OUTPUT_FILE, masterLog)
  // Using simple console.error for status to avoid stdout/theme issues
  process.stderr.write(`✅ Success! Generated ${OUTPUT_FILE}\n`)
  process.stderr.write(`📑 Processed ${files.length} files and found ${count} applications.\n`)
}

aggregateJobs()
