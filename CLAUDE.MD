# CLAUDE.md — HackUTD Marketing Hub

Source of truth for Claude Code. Read everything before making changes.

---

## Current state

- Next.js portal exists with UI
- Google Apps Script hits /api/requests on form submit — already working
- ClickUp API pulling tasks — already working
- NO auth, NO database, NO sessions set up yet
- Every page is currently public — needs to be protected

Build in this order:
1. Supabase client setup + schema
2. Auth + onboarding flow
3. Role-based routing + middleware
4. /my-tasks member dashboard
5. Fix the 3 bugs listed below
6. Thursday check-ins
7. Org view toggle

---


## What this app is

Marketing operations portal for HackUTD. Two user types:

- **Lead** — sees everything, approves external requests, assigns tasks, reviews content drafts
- **Members (15 people)** — see only their own tasks + team-specific quick links

ClickUp is the execution backend. Portal is the daily interface.
Team members never need to open ClickUp directly.

---

## Teams

| Team | Members |
|---|---|
| outreach | Shraddha |
| content | Karan, Sristi, Danish, Andie |
| design | Ann, Shiloh, Saran, Lisa, Santiago |
| uiux | (remaining members) |

---

## Supabase setup

### 1. Create project at supabase.com (free tier)

### 2. Run this SQL in the Supabase SQL editor

```sql
-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  role text not null check (role in ('lead', 'member')),
  team text check (team in ('design', 'uiux', 'outreach', 'content')),
  clickup_user_id text,
  password_hash text,
  onboarded_at timestamptz default now(),
  created_at timestamptz default now()
);

-- External requests (from Google Form via GAS)
create table requests (
  id uuid primary key default gen_random_uuid(),
  title text,
  type text,
  from_name text,
  from_org text,
  description text,
  due_requested date,
  team text check (team in ('design', 'uiux', 'outreach', 'content')),
  status text default 'submitted' check (
    status in ('submitted', 'in_review', 'approved', 'deferred', 'rejected')
  ),
  assigned_to uuid references users(id),
  clickup_task_id text,
  created_at timestamptz default now()
);

-- Thursday check-ins
create table checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  week_of date not null,
  status text check (status in ('on_track', 'needs_help', 'blocked')),
  note text,
  submitted_at timestamptz default now(),
  unique (user_id, week_of)
);

-- Internal notes on requests (before approval)
create table notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id),
  author_id uuid references users(id),
  body text not null,
  created_at timestamptz default now()
);
```

### 3. Seed the lead account manually

Auth uses bcrypt password hashing. Generate a hash for the lead password:
```bash
node -e "const b=require('bcryptjs'); b.hash('yourpassword', 10).then(h => console.log(h))"
```

Then insert:
```sql
insert into users (name, email, role, password_hash)
values ('Your Name', 'youremail@utdallas.edu', 'lead', '<bcrypt_hash_here>');
```

Everyone else self-onboards via the invite code + password flow on /login → Create account.

### 4. Get your keys

In Supabase: Settings → API
- Project URL → NEXT_PUBLIC_SUPABASE_URL
- anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
- service_role key → SUPABASE_SERVICE_ROLE_KEY (server-side only, never expose to client)

---

## Supabase client config

```javascript
// lib/supabase.js — client-side
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,     // saves session in cookie — user stays logged in
      autoRefreshToken: true,   // silently refreshes before expiry
      sessionExpirySeconds: 60 * 60 * 24 * 30, // 30 days
    }
  }
)
```

```javascript
// lib/supabase-server.js — server-side only (API routes, middleware)
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

---

## Auth flow

### New user (first time ever)

```
/login
  → enters email
  → email not in users table → redirect /onboarding?email={email}

/onboarding
  → form fields:
      Full name         [text]
      Team              [select: Design / UI/UX / Content / Outreach]
      ClickUp email     [text — "find in ClickUp → your avatar → Profile settings"]
      Invite code       [text]
  → on submit:
      1. validate invite code === INVITE_CODE env var
      2. call ClickUp API to resolve clickup_user_id from their ClickUp email
      3. insert into users table
      4. generate 6-digit login code, store with 10min expiry
      5. send code via Resend
      6. redirect /verify

/verify
  → enter 6-digit code
  → validate + check expiry
  → create persistent Supabase session (30 days)
  → clear login_code from DB
  → redirect based on role:
      lead   → /dashboard
      member → /my-tasks
```

### Returning user (already in users table)

```
/login
  → enters email
  → email found → generate code → send via Resend → redirect /verify
  → /verify → session already persisted → redirect to dashboard/my-tasks
  (they only see /login if session expired or they logged out)
```

### Already has active session

```
visits any page → middleware detects session → skip login entirely
lead   → /dashboard
member → /my-tasks
```

Users only ever enter a login code ONCE (or when session expires after 30 days, or if they log out).

### ClickUp user ID resolution during onboarding

```javascript
// in /api/auth/onboard route handler
const res = await fetch(
  `https://api.clickup.com/api/v2/group?team_id=${process.env.CLICKUP_TEAM_ID}`,
  { headers: { Authorization: process.env.CLICKUP_API_KEY } }
)
const { teams } = await res.json()
const allMembers = teams.flatMap(t => t.members)
const match = allMembers.find(m => m.user.email === clickupEmail)
const clickup_user_id = match?.user?.id ?? null
// if null: still create account, show warning, lead can fix later
```

---

## Routing + middleware

```
/                     → no session → /login | session → role redirect
/login                → public
/onboarding           → public (invite code gated)
/verify               → public
/dashboard            → lead only
/dashboard/requests   → lead only
/dashboard/tasks      → lead only
/dashboard/drafts     → lead only
/dashboard/calendar   → lead only
/my-tasks             → members only
/checkin              → any authenticated user
/api/requests         → public (called by GAS, validate a shared API secret)
/api/auth/*           → public
/api/*                → authenticated (check session in route handler)
```

Middleware file: `middleware.js` at project root.
Check Supabase session cookie on every request.
If no session + protected route → redirect /login.
If session + role mismatch → redirect appropriately.

---

## Bug fix 1 — Defer behavior

Current bug: deferring a request moves it back to Submitted. Wrong.

Fix:
- `status = 'deferred'` is its own state, not the same as submitted
- Deferred cards stay in the Submitted column, rendered at the bottom
- Visual treatment: `opacity: 0.6`, gray "deferred" badge
- Show "Reconsider" button → sets status back to `submitted`, restores opacity
- Deferred cards never disappear

---

## Bug fix 2 — Task title format

Current bug: ClickUp receives raw type field e.g. "Post" as task name.

Fix — build the title before sending:
```javascript
const taskTitle = `${request.type} — ${request.description?.slice(0, 60)} · ${request.from_org}`
// e.g. "Social post — Promote the React Workshop, March 24th · ACM UTD"
```

Full ClickUp task payload:
```javascript
{
  name: taskTitle,
  assignees: [clickup_user_id],
  due_date: new Date(request.due_requested).getTime(),
  due_date_time: false,
  description: `${request.description}\n\nRequested by: ${request.from_name} (${request.from_org})`,
  tags: [request.team]
}
```

---

## Bug fix 3 — Approve button

Approve button must be disabled when no assignee selected.

```jsx
<button
  disabled={!selectedAssignee}
  onClick={handleApprove}
  title={!selectedAssignee ? 'Select an assignee first' : ''}
  className={!selectedAssignee ? 'opacity-40 cursor-not-allowed' : ''}
>
  Approve
</button>
```

Assignee dropdown pulls from users table filtered by request.team:
```javascript
supabase.from('users').select('id, name').eq('team', request.team).eq('role', 'member')
```

---

## Approve flow

```
1. Assignee must be selected (button disabled otherwise)
2. Fetch assignee clickup_user_id from users table
3. Build formatted task title
4. POST to ClickUp → get clickup_task_id back
5. PATCH request: status='approved', clickup_task_id, assigned_to
6. Move card to "In ClickUp" column
7. Toast: "Task created in ClickUp — assigned to [name]"
```

---

## Member dashboard — /my-tasks

Simple. No clutter. Just their stuff.

### Layout
```
Hey [firstname] 👋                    [Design] pill

Quick access
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  Figma   │ │  Brand   │ │  Design  │ │ Finals   │
│    ↗     │ │guidelines│ │  assets  │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

My tasks (3)                    [ My tasks | Org view ]

☐  Social post — React Workshop        Content  Apr 5
☐  Finalize logo variants              Design   Apr 7
✓  Caption copy for sponsor post       Content  Apr 3
```

### Fetch tasks
```javascript
GET /api/tasks?user_id={supabase_user_id}
// server: fetch clickup_user_id, call ClickUp filtered by assignee
```

### Task row
- Checkbox → mark done (PATCH ClickUp, optimistic UI update)
- Title
- Team pill
- Due date (formatted "Apr 5")
- No ClickUp links visible

---

## Quick access cards by team

Rendered as link cards at top of /my-tasks. Icon + label + ↗. Opens new tab.

### Design (Ann, Shiloh, Saran, Lisa, Santiago)
- Figma → DESIGN_FIGMA_URL
- Brand guidelines → DRIVE_BRAND_URL
- Design assets → DRIVE_DESIGN_URL
- Final deliverables → DRIVE_FINALS_URL

### UI/UX
- Figma → UIUX_FIGMA_URL (different URL from design team)
- UI/UX files → DRIVE_UIUX_URL
- Brand guidelines → DRIVE_BRAND_URL

### Content (Karan, Sristi, Danish, Andie)
- Notion → https://www.notion.so/HackUTD-Content-Brewing-Station-30782010b15980ab81bbf599c0c6af04
- Content / reels → DRIVE_CONTENT_URL
- Brand guidelines → DRIVE_BRAND_URL

### Outreach (Shraddha)
- Outreach docs → DRIVE_OUTREACH_URL
- Roster sheet → https://docs.google.com/spreadsheets/d/1WYP6mtncXyEonhJZtBYxj9vqdI7vdR4PEvXcYbxn42Q/edit
- Brand guidelines → DRIVE_BRAND_URL
- Marketing Drive → https://drive.google.com/drive/folders/1bI-2T5k91Hu7s-RtdiFXjuqeCxMzi3DD

---

## Org view toggle

On /my-tasks, top right toggle: [ My tasks | Org view ]

Org view = read-only snapshot of all teams' active tasks.
4 columns, one per team, color coded.
No action buttons. Clicking a card expands description only.
Members can see what other teams are working on for context.

```
Design          UI/UX           Content         Outreach
──────────      ──────────      ──────────      ──────────
Logo variants   Hero section    IG captions     Camera shops
Social templ.   Sponsor page    Launch email    Photo club
```

Fetch: GET /api/tasks/all (lead's view of all tasks, no edit permissions for members)

---

## Thursday check-ins

### Member
- Every Thursday 7pm: Vercel cron sends email with link to /checkin
- /checkin page: 3 big buttons (On track / Needs help / Blocked) + optional note
- Submit → insert into checkins table
- Already submitted this week → show their response, no resubmit

### Lead (on /dashboard Overview)
- "This week's check-ins" section
- 15 rows: name + dot (green/yellow/red/gray) + note on expand
- Gray = not submitted yet
- Count: "12 / 15 submitted"

### Vercel cron
```json
{
  "crons": [{
    "path": "/api/cron/checkin-reminder",
    "schedule": "0 19 * * 4"
  }]
}
```

/api/cron/checkin-reminder:
1. Verify CRON_SECRET header or return 401
2. Fetch all users where role = 'member'
3. Send email to each via Resend with link /checkin?uid={user.id}

---

## API routes

### POST /api/requests
Called by GAS on form submit. Validate GAS_SECRET header.
```javascript
// body: { type, from_name, from_org, description, due_requested, team }
// action: insert into requests, status='submitted'
```

### POST /api/auth/onboard
```javascript
// body: { name, email, team, clickup_email, invite_code }
// 1. validate invite_code
// 2. resolve clickup_user_id from ClickUp API
// 3. insert user
// 4. generate + send login code
```

### POST /api/auth/send-code
```javascript
// body: { email }
// generate 6-digit code, store with 10min expiry, send via Resend
```

### POST /api/auth/verify-code
```javascript
// body: { email, code }
// validate, create persistent session, clear code from DB
// return { role, team }
```

### GET /api/tasks
```javascript
// query: ?user_id={id}
// fetch clickup_user_id, GET ClickUp tasks filtered by assignee
```

### GET /api/tasks/all
```javascript
// no filter — returns all tasks for org view
// still server-side only, never expose raw ClickUp API key
```

### PATCH /api/tasks/[id]/done
```javascript
// PATCH ClickUp task status to complete
```

### PATCH /api/requests/[id]/approve
```javascript
// body: { assigned_to_user_id }
// build title, POST to ClickUp, update request
```

### PATCH /api/requests/[id]/status
```javascript
// body: { status }
// update requests.status — handles defer, in_review, reconsider
```

### POST /api/checkin
```javascript
// authenticated, body: { status, note }
// insert into checkins for current week
```

### GET /api/cron/checkin-reminder
```javascript
// verify CRON_SECRET, send emails to all members
```

---

## Environment variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ClickUp
CLICKUP_API_KEY=
CLICKUP_LIST_ID=901710727679
CLICKUP_TEAM_ID=9017827536

# Notion
NOTION_API_KEY=
NOTION_DATABASE_ID=

# Resend (email)
RESEND_API_KEY=
RESEND_FROM_EMAIL=hub@hackutd.com

# Auth
INVITE_CODE=HACKUTD2026

# Security
CRON_SECRET=
GAS_SECRET=              # shared secret between GAS and /api/requests

# Drive folder URLs — fill in actual subfolder links
DRIVE_ROOT_URL=https://drive.google.com/drive/folders/1bI-2T5k91Hu7s-RtdiFXjuqeCxMzi3DD
DRIVE_DESIGN_URL=
DRIVE_UIUX_URL=
DRIVE_CONTENT_URL=
DRIVE_OUTREACH_URL=
DRIVE_BRAND_URL=
DRIVE_FINALS_URL=

# Figma
DESIGN_FIGMA_URL=
UIUX_FIGMA_URL=

# Roster sheet
ROSTER_SHEET_URL=https://docs.google.com/spreadsheets/d/1WYP6mtncXyEonhJZtBYxj9vqdI7vdR4PEvXcYbxn42Q/edit
```

---

## Hard rules

1. Never call ClickUp, Notion, or Resend from client components. Always use /api/* route handlers.
2. Never expose SUPABASE_SERVICE_ROLE_KEY or CLICKUP_API_KEY to the client.
3. Never show one member's tasks to another member in the My tasks view.
4. Approve button is disabled until an assignee is selected. No exceptions.
5. Deferred requests stay visible in the pipeline forever. They never disappear.
6. Login codes expire after 10 minutes. Show clear error if expired.
7. All /dashboard/* routes redirect to /my-tasks if role !== 'lead'.
8. Task titles sent to ClickUp must use the formatted template. Never raw form values.
9. /api/cron/* must verify CRON_SECRET or return 401.
10. /api/requests must verify GAS_SECRET header or return 401.
11. Sessions persist 30 days. Users should almost never see the login page after first login.
12. If clickup_user_id is null after onboarding, still create account but show warning.


## Notion content approval — exact status values

The Notion brewing station database uses these exact status values.
Use these strings precisely in all Notion API calls — wrong casing will break the filter.
```
Drafting         → default, ignore in portal
Ready for Review → fetch these for Drafts tab
Needs Revision   → PATCH when lead clicks "Request changes"
Approved         → PATCH when lead clicks "Approve"
Rejected         → PATCH when lead clicks "Reject"
```

### Fetching drafts (GET /api/notion)
```javascript
// Only pull pages where Progress = "Ready for Review"
// Note: the Notion property is named "Progress", not "Status"
body: JSON.stringify({
  filter: {
    property: "Progress",
    status: { equals: "Ready for Review" }
  },
  sorts: [{ timestamp: "created_time", direction: "descending" }]
})
```

### Approving (PATCH /api/notion/[id]/approve)
```javascript
// 1. PATCH Notion page status to Approved
await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
  method: "PATCH",
  headers: {
    "Authorization": `Bearer ${process.env.NOTION_API_KEY}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    properties: {
      Progress: { status: { name: "Approved" } }
    }
  })
})
// 2. POST to ClickUp — create task "Film: [title]" assigned to content team
```

### Requesting changes (PATCH /api/notion/[id]/revise)
```javascript
body: JSON.stringify({
  properties: {
    Status: { status: { name: "Needs Revision" } }
  }
})
// Do NOT create a ClickUp task — just update Notion
// Item disappears from Drafts tab, reappears when they mark Ready for Review again
```

### Rejecting (PATCH /api/notion/[id]/reject)
```javascript
body: JSON.stringify({
  properties: {
    Status: { status: { name: "Rejected" } }
  }
})
// Item disappears from Drafts tab permanently
```

### Content team quick access links
```javascript
// In /my-tasks personalized cards for team === 'content'
const CONTENT_LINKS = [
  { name: "Content calendar", url: process.env.NOTION_CALENDAR_URL },
  { name: "Brewing station",  url: "https://www.notion.so/HackUTD-Content-Brewing-Station-30782010b15980ab81bbf599c0c6af04" },
  { name: "Content / reels",  url: process.env.DRIVE_CONTENT_URL },
  { name: "Brand guidelines", url: process.env.DRIVE_BRAND_URL },
]
```

Add to .env.local:
```env
NOTION_CALENDAR_URL=    ← paste your Notion calendar page URL here
```