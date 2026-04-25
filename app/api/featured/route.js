import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { cached, invalidate } from '@/lib/cache'

const SHEET_ID = process.env.FEATURED_SHEET_ID
const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
const PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')

function hasCreds() {
  return Boolean(SHEET_ID && CLIENT_EMAIL && PRIVATE_KEY)
}

function permissionError(raw) {
  if (/permission|forbidden|403/i.test(raw)) {
    return `Share the sheet with ${CLIENT_EMAIL} (Editor) in Google Sheets, then retry.`
  }
  return raw
}

async function getToken(scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']) {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
    scopes,
  })
  return auth.getAccessToken()
}

async function getSheetTitle(token) {
  return cached('featured:title', 60 * 60_000, async () => {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      const err = await res.json()
      const raw = err.error?.message ?? 'Failed to fetch spreadsheet metadata'
      throw new Error(permissionError(raw))
    }
    const meta = await res.json()
    return meta.sheets?.[0]?.properties?.title ?? 'Sheet1'
  })
}

export async function GET() {
  if (!hasCreds()) {
    return NextResponse.json({ error: 'Missing Google Sheets credentials' }, { status: 500 })
  }

  try {
    const token = await getToken()
    const title = await getSheetTitle(token)

    const people = await cached('featured:people', 2 * 60_000, async () => {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(title)}?valueRenderOption=UNFORMATTED_VALUE`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        const err = await res.json()
        const raw = err.error?.message ?? 'Sheets API error'
        throw new Error(permissionError(raw))
      }
      const json = await res.json()
      const [header = [], ...rows] = json.values ?? []

      const nameIdx = header.findIndex(h => /first.?name/i.test(h))
      const featuredIdx = header.findIndex(h => /featured/i.test(h))

      if (nameIdx === -1) throw new Error('No "First Name" column found in sheet')
      if (featuredIdx === -1) throw new Error('No "Featured" column found in sheet')

      return rows
        .map((row, i) => ({
          name: row[nameIdx] ?? '',
          featured: row[featuredIdx] === true || String(row[featuredIdx]).toUpperCase() === 'TRUE',
          rowIndex: i + 2,
        }))
        .filter(p => p.name && !p.featured)
    })

    return NextResponse.json({ people })
  } catch (err) {
    invalidate('featured:title')
    invalidate('featured:people')
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  if (!hasCreds()) {
    return NextResponse.json({ error: 'Missing Google Sheets credentials' }, { status: 500 })
  }

  const { rowIndex } = await request.json()
  if (!rowIndex) {
    return NextResponse.json({ error: 'rowIndex required' }, { status: 400 })
  }

  try {
    const token = await getToken(['https://www.googleapis.com/auth/spreadsheets'])
    const title = await getSheetTitle(token)

    const headerRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(title)}!1:1`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const headerJson = await headerRes.json()
    const header = headerJson.values?.[0] ?? []
    const featuredIdx = header.findIndex(h => /featured/i.test(h))

    if (featuredIdx === -1) {
      return NextResponse.json({ error: 'No "Featured" column found in sheet' }, { status: 400 })
    }

    const colLetter = String.fromCharCode(65 + featuredIdx)
    const range = `${title}!${colLetter}${rowIndex}`

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range, majorDimension: 'ROWS', values: [[true]] }),
      }
    )

    if (!updateRes.ok) {
      const err = await updateRes.json()
      const raw = err.error?.message ?? 'Failed to update sheet'
      throw new Error(permissionError(raw))
    }

    invalidate('featured:people')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
