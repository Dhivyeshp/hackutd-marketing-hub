import { NextResponse } from 'next/server'

const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
const GOOGLE_SHEETS_GID = process.env.GOOGLE_SHEETS_GID

function getMissingEnvResponse() {
  if (GOOGLE_SHEETS_SPREADSHEET_ID && GOOGLE_SHEETS_GID) return null

  return NextResponse.json(
    { error: 'Missing GOOGLE_SHEETS_SPREADSHEET_ID or GOOGLE_SHEETS_GID' },
    { status: 500 }
  )
}

function parseGoogleVisualizationJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start === -1 || end === -1) {
    throw new Error('Unexpected Google Sheets response format')
  }

  return JSON.parse(text.slice(start, end + 1))
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function findHeaderKey(headers, patterns) {
  const normalizedHeaders = Object.keys(headers)

  for (const key of normalizedHeaders) {
    const label = headers[key]
    if (patterns.some((pattern) => label.includes(pattern))) {
      return key
    }
  }

  return null
}

function normalizeTeam(value) {
  const normalized = String(value || '').trim().toLowerCase()

  if (!normalized) return ''
  if (normalized.includes('ui') || normalized.includes('ux')) return 'uiux'
  if (normalized.includes('outreach')) return 'outreach'
  if (normalized.includes('content')) return 'content'
  if (normalized.includes('design')) return 'design'

  return normalized
}

function getCellValue(cell) {
  if (!cell) return ''
  if (cell.f) return String(cell.f).trim()
  if (cell.v === null || cell.v === undefined) return ''
  return String(cell.v).trim()
}

export async function GET() {
  const missingEnvResponse = getMissingEnvResponse()
  if (missingEnvResponse) return missingEnvResponse

  try {
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_SPREADSHEET_ID}/gviz/tq?tqx=out:json&gid=${GOOGLE_SHEETS_GID}`,
      { cache: 'no-store' }
    )

    const rawText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: `Google Sheets returned ${response.status}` },
        { status: response.status }
      )
    }

    const data = parseGoogleVisualizationJson(rawText)
    const cols = data?.table?.cols ?? []
    const rows = data?.table?.rows ?? []

    const headers = cols.reduce((result, column, index) => {
      result[`c${index}`] = normalizeHeader(column.label || column.id || '')
      return result
    }, {})

    const nameKey = findHeaderKey(headers, ['name', 'member', 'person'])
    const teamKey = findHeaderKey(headers, ['team', 'pillar', 'department'])
    const roleKey = findHeaderKey(headers, ['role', 'position'])
    const availabilityKey = findHeaderKey(headers, ['availability', 'capacity', 'bandwidth'])
    const workloadKey = findHeaderKey(headers, ['workload', 'current', 'assignment', 'assigned'])
    const notesKey = findHeaderKey(headers, ['note', 'comment', 'details'])

    const members = rows
      .map((row, index) => {
        const cells = row.c ?? []
        const getByKey = (key) => {
          if (!key) return ''
          const cellIndex = Number(key.replace('c', ''))
          return getCellValue(cells[cellIndex])
        }

        const name = getByKey(nameKey)
        if (!name) return null

        return {
          id: `member-${index + 1}`,
          name,
          team: normalizeTeam(getByKey(teamKey)),
          role: getByKey(roleKey),
          availability: getByKey(availabilityKey),
          workload: getByKey(workloadKey),
          notes: getByKey(notesKey),
        }
      })
      .filter(Boolean)

    const summary = members.reduce((result, member) => {
      const key = member.team || 'unassigned'
      result[key] = (result[key] || 0) + 1
      return result
    }, {})

    return NextResponse.json({
      members,
      summary,
      headers,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: `${error.message}. Make sure the Google Sheet is viewable by the app or published to the web.`,
      },
      { status: 500 }
    )
  }
}
