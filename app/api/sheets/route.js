import { NextResponse } from 'next/server'
import { google } from 'googleapis'

const SHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
const SHEET_RANGE = 'Hack Marketing Request From (Responses)'

const GOOGLE_SHEETS_CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
const GOOGLE_SHEETS_PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')

export async function GET() {
  if (!SHEET_ID || !GOOGLE_SHEETS_CLIENT_EMAIL || !GOOGLE_SHEETS_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Missing Google Sheets credentials' }, { status: 500 })
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: GOOGLE_SHEETS_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  try {
    const token = await auth.getAccessToken()
    const headers = { Authorization: `Bearer ${token}` }

    // Fetch spreadsheet metadata to get exact sheet names and IDs
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`,
      { headers }
    )
    if (!metaRes.ok) {
      const err = await metaRes.json()
      return NextResponse.json({ error: err.error?.message ?? 'Could not fetch spreadsheet metadata' }, { status: metaRes.status })
    }
    const meta = await metaRes.json()
    const availableSheets = meta.sheets ?? []

    // Find matching sheet by name (case-insensitive), fall back to first sheet
    const target = availableSheets.find(
      s => s.properties.title.trim().toLowerCase() === SHEET_RANGE.trim().toLowerCase()
    ) ?? availableSheets[0]

    if (!target) {
      return NextResponse.json({ error: 'No sheets found in spreadsheet' }, { status: 500 })
    }

    const title = target.properties.title

    const dataRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(title)}`,
      { headers }
    )
    if (!dataRes.ok) {
      const err = await dataRes.json()
      return NextResponse.json({ error: err.error?.message ?? 'Sheets API error' }, { status: dataRes.status })
    }

    const json = await dataRes.json()
    const [header, ...rows] = json.values || []
    const data = rows.map(row => {
      const obj = {}
      header.forEach((key, i) => { obj[key] = row[i] ?? '' })
      return obj
    })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Google Sheets API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
