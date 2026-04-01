# HackUTD Marketing Hub

A unified dashboard for the HackUTD marketing org — Design, UI/UX, Outreach, and Content teams. Pulls live data from Notion and ClickUp, Google auth via Supabase, deployed on Vercel.

---

## What it does

- **Overview** — live task stats, announcements, pending reel approvals
- **Tasks** — pulls directly from your ClickUp marketing list, filtered by team + status
- **Reel ideas** — pulls from Notion brewing station. One-click approve → auto-creates ClickUp task + marks Notion row as In Progress
- **Calendar** — all ClickUp due dates in one view, color-coded by team
- **Sidebar** — one-click access to all Drive folders, Notion, ClickUp, and Sheets

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Auth | Supabase (Google OAuth) |
| API proxy | Next.js Route Handlers (`/app/api/*`) |
| Notion sync | Notion API v1 (free) |
| Task sync | ClickUp API v2 (free) |
| Deployment | Vercel (free tier) |

---

## Project structure

```
hackutd-hub/
├── app/
│   ├── api/
│   │   ├── notion/route.js       # GET reels, PATCH approve
│   │   └── clickup/route.js      # GET tasks, POST create task
│   ├── layout.jsx
│   └── page.jsx                  # auth gate → dashboard
├── components/
│   ├── Dashboard.jsx             # main hub UI + sidebar
│   ├── TasksView.jsx
│   ├── ReelsView.jsx
│   ├── CalendarView.jsx
│   └── ui/                       # shadcn components
├── lib/
│   ├── supabase.js
│   └── api.js                    # fetch helpers for /api/*
├── .env.local                    # secrets — never commit this
├── CLAUDE.md                     # instructions for AI coding tools
└── README.md
```

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd hackutd-hub
npm install
```

### 2. Supabase — Google login

1. Go to [supabase.com](https://supabase.com) → New project (free)
2. **Settings → API** → copy your `Project URL` and `anon public` key
3. **Authentication → Providers → Google** → enable it
4. Follow the Google OAuth setup guide Supabase shows (needs a Google Cloud project, ~5 min)
5. Set redirect URLs:
   - Dev: `http://localhost:3000`
   - Prod: `https://your-app.vercel.app`
6. Optional: restrict to UTD emails under **Auth → Settings → Allowed email domains** → add `utdallas.edu`

### 3. Notion API

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration** → name it `HackUTD Hub` → Submit
3. Copy the **Internal Integration Secret** (starts with `secret_`)
4. Open your Reel Ideas database in Notion
5. Click `···` menu → **Connections** → add your integration
6. Copy the database ID from the URL:

```
notion.so/workspace/THIS-IS-THE-ID?v=...
```

Your Notion database needs these columns (exact names matter — see Customizing below if yours differ):

| Column | Type |
|---|---|
| `Video Title` | Title |
| `Filmer/Editor` | Text or People |
| `Storyboarder/Ideator` | Text or People |
| `Type` | Select |
| `Progress` | Status |

### 4. ClickUp API

1. In ClickUp: **Settings → Apps → API token** → copy your token (starts with `pk_`)
2. Your list ID is in the URL — from `app.clickup.com/9017827536/v/l/6-901710727679-1` the list ID is the last number: `901710727679`

### 5. Environment variables

```bash
cp .env.example .env.local
```

```env
# Supabase — NEXT_PUBLIC prefix required for client-side auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Notion — server-side only, no NEXT_PUBLIC prefix
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ClickUp — server-side only
CLICKUP_API_KEY=pk_xxxxxxxxxxxxxxxxxx
CLICKUP_LIST_ID=901710727679
```

### 6. Run locally

```bash
npm run dev
# open http://localhost:3000
```

### 6.5. Test Notion and ClickUp connections

After adding your env vars and starting the app, open:

```bash
http://localhost:3000/api/integrations
```

You should get JSON like:

```json
{
  "ok": true,
  "notion": { "ok": true, "service": "notion", "message": "Connected" },
  "clickup": { "ok": true, "service": "clickup", "message": "Connected" }
}
```

If something is wrong, the response now tells you whether it is:

- a missing env var
- a bad token
- a wrong Notion database ID
- a wrong ClickUp list ID
- or an upstream API permission issue

### 6.6. Test Google Sheets roster

The roster integration reads a Google Sheet tab using:

```env
GOOGLE_SHEETS_SPREADSHEET_ID=1WYP6mtncXyEonhJZtBYxj9vqdI7vdR4PEvXcYbxn42Q
GOOGLE_SHEETS_GID=1730045142
```

After starting the app, open:

```bash
http://localhost:3000/api/roster
```

If the sheet is accessible, you should get a `members` array back. If it fails, make sure the sheet or tab is viewable by the app or published to the web.

### 7. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

In the Vercel dashboard go to **Settings → Environment Variables** and add all five env vars. Then redeploy.

---

## Key flows

**Approve a reel**
1. User clicks Approve on a reel idea
2. `PATCH /api/notion` updates the Notion row to "In Progress"
3. `POST /api/clickup` creates a new task in the marketing list
4. Both fire in parallel — UI updates instantly

**Add a task manually**
1. User fills in the New Task dialog
2. `POST /api/clickup` creates the task
3. Task appears in the hub + in ClickUp

**Auth**
1. User hits `/` → Supabase checks for a session
2. No session → `/login` → Google OAuth popup
3. After login → session created → redirect to `/`

---

## Customizing Drive folders

In `components/Dashboard.jsx` find the `DRIVE_FOLDERS` array and replace the URLs with your actual subfolder links:

```js
const DRIVE_FOLDERS = [
  { name: 'Marketing (root)', url: 'https://drive.google.com/drive/folders/YOUR_ID', color: 'gray' },
  { name: 'Design assets',    url: 'https://drive.google.com/drive/folders/YOUR_ID', color: 'coral' },
  { name: 'UI/UX files',      url: 'https://drive.google.com/drive/folders/YOUR_ID', color: 'blue' },
  { name: 'Outreach docs',    url: 'https://drive.google.com/drive/folders/YOUR_ID', color: 'teal' },
  { name: 'Content / reels',  url: 'https://drive.google.com/drive/folders/YOUR_ID', color: 'amber' },
  { name: 'Brand guidelines', url: 'https://drive.google.com/drive/folders/YOUR_ID', color: 'gray' },
]
```

## Customizing Notion column names

If your Notion DB uses different column names, edit `app/api/notion/route.js` around line 25:

```js
title:  page.properties["Video Title"]?.title?.[0]?.plain_text,
filmer: page.properties["Filmer/Editor"]?.rich_text?.[0]?.plain_text,
story:  page.properties["Storyboarder/Ideator"]?.rich_text?.[0]?.plain_text,
type:   page.properties["Type"]?.select?.name,
status: page.properties["Progress"]?.status?.name,
```

---

## Commands

```bash
npm run dev        # dev server at localhost:3000
npm run build      # production build
npm run lint       # lint
vercel --prod      # deploy to production
```
