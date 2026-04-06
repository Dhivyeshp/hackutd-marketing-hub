import { google } from 'googleapis'
import { getSession, safeCompare } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  formatRequestRecord,
  getPreviewRequests,
  getRequestSheetTitle,
  mapSheetRowsToRequests,
  normalizeTeam,
} from '@/lib/requests'


function hasSupabaseAdminEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function getGasSecret(request) {
  const authHeader = request.headers.get('authorization') ?? ''
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }

  return request.headers.get('x-gas-secret') ?? ''
}

async function loadRequestsFromSupabase() {
  const { data, error } = await supabaseAdmin
    .from('requests')
    .select('id, title, type, from_name, from_org, description, due_requested, team, status, assigned_to, clickup_task_id, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const assigneeIds = [...new Set((data ?? []).map(request => request.assigned_to).filter(Boolean))]
  let assigneesById = {}

  if (assigneeIds.length > 0) {
    const { data: assignees } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', assigneeIds)

    assigneesById = Object.fromEntries((assignees ?? []).map(user => [user.id, user.name]))
  }

  return (data ?? []).map(request =>
    formatRequestRecord({
      ...request,
      assigneeName: assigneesById[request.assigned_to] ?? '',
    })
  )
}

async function loadRequestsFromSheets() {
  const sheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!sheetId || !clientEmail || !privateKey) {
    throw new Error('Missing Google Sheets credentials')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const token = await auth.getAccessToken()
  const headers = { Authorization: `Bearer ${token}` }

  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, { headers, cache: 'no-store' })
  const meta = await metaRes.json()
  if (!metaRes.ok) throw new Error(meta?.error?.message ?? 'Could not fetch spreadsheet metadata')

  const sheets = meta.sheets ?? []
  const target = sheets.find(sheet => {
    const title = sheet.properties?.title?.trim().toLowerCase()
    return title === getRequestSheetTitle().trim().toLowerCase()
  }) ?? sheets[0]

  if (!target?.properties?.title) throw new Error('No sheets found in spreadsheet')

  const dataRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(target.properties.title)}`,
    { headers, cache: 'no-store' }
  )
  const payload = await dataRes.json()
  if (!dataRes.ok) throw new Error(payload?.error?.message ?? 'Sheets API error')

  const [header = [], ...rows] = payload.values ?? []
  const mappedRows = rows.map(row => {
    const record = {}
    header.forEach((key, index) => {
      record[key] = row[index] ?? ''
    })
    return record
  })

  return mapSheetRowsToRequests(mappedRows)
}

export async function GET() {
  const session = getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'lead') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    if (hasSupabaseAdminEnv()) {
      const requests = await loadRequestsFromSupabase()
      if (requests.length > 0) {
        return Response.json({ requests, source: 'supabase' })
      }
      // Supabase configured but empty — fall through to Sheets for existing data
    }

    const requests = await loadRequestsFromSheets()
    return Response.json({ requests, source: 'sheets' })
  } catch (error) {
    return Response.json({ requests: getPreviewRequests(), source: 'preview', warning: error.message })
  }
}

export async function POST(request) {
  const configuredSecret = process.env.GAS_SECRET

  if (!configuredSecret) {
    return Response.json({ error: 'Missing GAS_SECRET' }, { status: 500 })
  }

  if (!safeCompare(getGasSecret(request), configuredSecret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const record = {
    title: body.title?.trim() || null,
    type: body.type?.trim() || null,
    from_name: body.from_name?.trim() || null,
    from_org: body.from_org?.trim() || null,
    description: body.description?.trim() || null,
    due_requested: body.due_requested || null,
    team: normalizeTeam(body.team),
    status: 'submitted',
  }

  if (!record.type || !record.from_name || !record.description || !record.team) {
    return Response.json({ error: 'Missing required request fields' }, { status: 400 })
  }

  if (!hasSupabaseAdminEnv()) {
    return Response.json({ ok: true, preview: true, request: formatRequestRecord(record) })
  }

  const { data, error } = await supabaseAdmin
    .from('requests')
    .insert(record)
    .select('id, type, from_name, from_org, description, due_requested, team, status, assigned_to, clickup_task_id, created_at')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, request: formatRequestRecord(data) })
}
