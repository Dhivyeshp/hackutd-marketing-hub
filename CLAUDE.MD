# CLAUDE.md

This file tells AI coding tools (Claude, Cursor, Copilot, etc.) how this project is structured and what conventions to follow.

---

## Project overview

HackUTD Marketing Hub — a Next.js 14 dashboard for 4 marketing teams (Design, UI/UX, Outreach, Content). Pulls live data from Notion and ClickUp via server-side Route Handlers. Google auth via Supabase.

---

## Stack and conventions

- **Framework**: Next.js 14 App Router — use `app/` directory, not `pages/`
- **Components**: shadcn/ui primitives + Tailwind CSS utility classes
- **Auth**: Supabase client from `lib/supabase.js` — never call Supabase directly in components
- **API calls**: always go through `/app/api/*` route handlers — never call Notion or ClickUp APIs from the client directly, the keys must stay server-side
- **Styling**: Tailwind only — no inline styles, no CSS modules, no styled-components
- **State**: React `useState` / `useEffect` — no Redux, no Zustand needed for this project
- **Fonts**: Inter via `next/font/google`

---

## Environment variables

| Variable | Used where | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon key |
| `NOTION_API_KEY` | server only | Notion integration secret |
| `NOTION_DATABASE_ID` | server only | Reel ideas database ID |
| `CLICKUP_API_KEY` | server only | ClickUp personal token |
| `CLICKUP_LIST_ID` | server only | Marketing list ID (901710727679) |

Never add `NEXT_PUBLIC_` to Notion or ClickUp keys — they must stay server-side only.

---

## API routes

### `GET /api/notion`
Fetches all rows from the Reel Ideas Notion database.

Returns:
```json
{
  "reels": [
    {
      "id": "notion-page-id",
      "title": "Running Late",
      "filmer": "Karan",
      "story": "Andie",
      "type": "Emotional",
      "status": "Idea",
      "notionUrl": "https://notion.so/..."
    }
  ]
}
```

### `PATCH /api/notion`
Marks a Notion page as approved (updates Progress status to "In Progress").

Body: `{ "pageId": "notion-page-id" }`

### `GET /api/clickup`
Fetches all open tasks from the marketing ClickUp list.

Returns:
```json
{
  "tasks": [
    {
      "id": "clickup-task-id",
      "title": "Finalize logo variants",
      "team": "design",
      "due": "2026-04-04",
      "status": "in-progress",
      "clickupUrl": "https://app.clickup.com/..."
    }
  ]
}
```

Team is inferred from task name + tags using keyword matching — see `inferTeam()` in `app/api/clickup/route.js`.

### `POST /api/clickup`
Creates a new task in the marketing list.

Body: `{ "title": "Film: Running Late", "team": "content", "due": "2026-04-10" }`

---

## Component map

| Component | What it does |
|---|---|
| `app/page.jsx` | Auth gate — checks Supabase session, renders login or dashboard |
| `components/Dashboard.jsx` | Shell — sidebar, breadcrumb, page routing, Drive folder links |
| `components/TasksView.jsx` | Tasks list with team/status filters, cycle status, add task dialog |
| `components/ReelsView.jsx` | Reel ideas list with approve/reject, Notion status badge |
| `components/CalendarView.jsx` | Monthly calendar, tasks as colored events |
| `lib/supabase.js` | Supabase client singleton |
| `lib/api.js` | `fetchTasks()`, `fetchReels()`, `createClickUpTask()`, `approveReelInNotion()` |

---

## Team color system

All team colors use Tailwind classes consistently across the codebase:

```js
const TEAM_COLORS = {
  design:   { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  uiux:     { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200' },
  outreach: { bg: 'bg-emerald-100',text: 'text-emerald-800',border: 'border-emerald-200' },
  content:  { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200' },
}
```

Never hardcode hex colors for team indicators — always use these Tailwind classes.

---

## Notion column name mapping

The Notion database property names are mapped in `app/api/notion/route.js`. If the Notion DB schema changes, update only that file. Current mapping:

```
"Video Title"            → title
"Filmer/Editor"          → filmer
"Storyboarder/Ideator"   → story
"Type"                   → type  (select)
"Progress"               → status (status type)
```

---

## Data flow for reel approval

When a user approves a reel, two things happen in parallel:

```
approveReel(reelId)
  ├── PATCH /api/notion  { pageId }     → Notion row → "In Progress"
  └── POST  /api/clickup { title, team } → new ClickUp task created
```

Both are called with `Promise.all()` in `lib/api.js`. If either fails, show an error toast — do not silently swallow errors.

---

## What not to do

- Do not call `https://api.notion.com` or `https://api.clickup.com/api/v2` from client components — always proxy through `/api/*`
- Do not use `pages/` directory — this project uses App Router only
- Do not add new global CSS — use Tailwind classes
- Do not store API keys in client-side code or commit `.env.local`
- Do not use `any` types if adding TypeScript later — define proper interfaces
- Do not add heavy dependencies without checking bundle size impact

---

## Links

- Notion brewing station: https://www.notion.so/HackUTD-Content-Brewing-Station-30782010b15980ab81bbf599c0c6af04
- ClickUp marketing list: https://app.clickup.com/9017827536/v/l/6-901710727679-1
- Google Sheets roster: https://docs.google.com/spreadsheets/d/1WYP6mtncXyEonhJZtBYxj9vqdI7vdR4PEvXcYbxn42Q/edit
- Marketing Drive: https://drive.google.com/drive/folders/1bI-2T5k91Hu7s-RtdiFXjuqeCxMzi3DD