import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getSession } from '@/lib/session'
import { cached } from '@/lib/cache'

const SHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
const SHEET_RANGE = 'Hack Marketing Request From (Responses)'
const GOOGLE_SHEETS_CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
const GOOGLE_SHEETS_PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')

function hasSheetsCreds() {
  return Boolean(SHEET_ID && GOOGLE_SHEETS_CLIENT_EMAIL && GOOGLE_SHEETS_PRIVATE_KEY)
}

async function getSheetsToken(scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: GOOGLE_SHEETS_PRIVATE_KEY,
    },
    scopes,
  })
  return auth.getAccessToken()
}

async function resolveSheetTitle(token) {
  return cached('sheets:title', 60 * 60_000, async () => {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!metaRes.ok) {
      const err = await metaRes.json()
      throw new Error(err.error?.message ?? 'Could not fetch spreadsheet metadata')
    }
    const meta = await metaRes.json()
    const sheets = meta.sheets ?? []
    const target = sheets.find(
      s => s.properties.title.trim().toLowerCase() === SHEET_RANGE.trim().toLowerCase()
    ) ?? sheets[0]
    if (!target) throw new Error('No sheets found in spreadsheet')
    return target.properties.title
  })
}

async function resolveSheetHeader(token, title) {
  return cached('sheets:header', 60 * 60_000, async () => {
    const headerRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(title)}!1:1`,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    )
    if (!headerRes.ok) {
      const err = await headerRes.json()
      throw new Error(err.error?.message ?? 'Could not fetch header row')
    }
    return (await headerRes.json()).values?.[0] ?? []
  })
}

export async function GET() {
  if (!hasSheetsCreds()) {
    return NextResponse.json({ error: 'Missing Google Sheets credentials' }, { status: 500 })
  }

  try {
    const token = await getSheetsToken()
    const headers = { Authorization: `Bearer ${token}` }
    const title = await resolveSheetTitle(token)

    const dataRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(title)}`,
      { headers }
    )
    if (!dataRes.ok) {
      const err = await dataRes.json()
      return NextResponse.json({ error: err.error?.message ?? 'Sheets API error' }, { status: dataRes.status })
    }

    const json = await dataRes.json()
    const [header = [], ...rows] = json.values ?? []
    const data = rows.map(row => {
      const obj = {}
      header.forEach((key, i) => { obj[key] = row[i] ?? '' })
      return obj
    })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Updates Assignee and/or Status columns for a sheet-based request.
// requestId must be in the form "sheet-request-{rowIndex}" (0-based data row).
export async function PATCH(request) {
  const session = getSession()
  if (!session || session.role !== 'lead') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!hasSheetsCreds()) {
    return NextResponse.json({ error: 'Missing Google Sheets credentials' }, { status: 500 })
  }

  const { requestId, assigneeName, status } = await request.json()

  const match = requestId?.match(/^sheet-request-(\d+)$/)
  if (!match) {
    return NextResponse.json({ error: 'Not a sheet-based request' }, { status: 400 })
  }

  const fieldUpdates = []
  if (assigneeName !== undefined) fieldUpdates.push({ column: 'assignee', value: assigneeName ?? '' })
  if (status !== undefined) fieldUpdates.push({ column: 'status', value: status ?? '' })

  if (fieldUpdates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // rowIndex is 0-based data index; sheet row = index + 2 (header is row 1, data starts at row 2)
  const dataRowIndex = parseInt(match[1], 10)
  const sheetRow = dataRowIndex + 2

  try {
    const token = await getSheetsToken(['https://www.googleapis.com/auth/spreadsheets'])
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    const title = await resolveSheetTitle(token)

    const headerRow = await resolveSheetHeader(token, title)

    // Build one range per field; skip any column not present in the sheet
    const valueRanges = fieldUpdates.flatMap(({ column, value }) => {
      const colIndex = headerRow.findIndex(col => col.trim().toLowerCase() === column)
      if (colIndex === -1) return []
      // Convert 0-based column index to A1 letter (supports up to column Z)
      const colLetter = String.fromCharCode(65 + colIndex)
      return [{ range: `${title}!${colLetter}${sheetRow}`, values: [[value]] }]
    })

    if (valueRanges.length === 0) {
      return NextResponse.json({ error: 'No matching columns found in sheet' }, { status: 400 })
    }

    const batchRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ valueInputOption: 'RAW', data: valueRanges }),
      }
    )

    if (!batchRes.ok) {
      const err = await batchRes.json()
      throw new Error(err.error?.message ?? 'Failed to update sheet')
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
