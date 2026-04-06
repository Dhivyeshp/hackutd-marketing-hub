import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getSession } from '@/lib/session'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

function getMimeIcon(mimeType) {
  if (mimeType === FOLDER_MIME) return 'folder'
  if (mimeType.includes('document')) return 'doc'
  if (mimeType.includes('spreadsheet')) return 'sheet'
  if (mimeType.includes('presentation')) return 'slide'
  if (mimeType.includes('video')) return 'video'
  if (mimeType.includes('image')) return 'image'
  if (mimeType.includes('pdf')) return 'pdf'
  return 'file'
}

export async function GET(request) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get('folderId')

  if (!folderId || !/^[\w-]+$/.test(folderId)) {
    return NextResponse.json({ error: 'Invalid folderId' }, { status: 400 })
  }

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    return NextResponse.json({ error: 'Google credentials not configured' }, { status: 500 })
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })

    const drive = google.drive({ version: 'v3', auth })

    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id,name,mimeType,webViewLink,iconLink)',
      orderBy: 'folder,name',
      pageSize: 100,
    })

    const files = (res.data.files ?? []).map(f => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      isFolder: f.mimeType === FOLDER_MIME,
      url: f.webViewLink,
      icon: getMimeIcon(f.mimeType),
    }))

    return NextResponse.json({ files })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
