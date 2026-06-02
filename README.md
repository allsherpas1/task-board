# Task Board

A personal Kanban board for turning client emails into tasks. Paste email content, Claude extracts the task, it saves to Supabase.

## Setup

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to the **SQL Editor** and run this to create the tasks table:

```sql
create table tasks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  col text not null default 'todo',
  action text not null,
  client text default '',
  deadline text default '',
  snippet text default ''
);
```

4. Go to **Settings → API** and copy:
   - Project URL
   - Anon public key

### 2. Config

```bash
cp js/config.example.js js/config.js
```

Open `js/config.js` and fill in:
- `supabaseUrl` — your project URL
- `supabaseKey` — your anon public key
- `anthropicKey` — from [console.anthropic.com](https://console.anthropic.com) → API Keys

`js/config.js` is gitignored and will never be committed.

### 3. GitHub + Vercel

1. Create a new repo at github.com/allsherpas1/task-board
2. Push this folder to it:

```bash
cd task-board
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/allsherpas1/task-board.git
git push -u origin main
```

3. Go to [vercel.com](https://vercel.com), import the repo, deploy. No build settings needed — it's plain HTML.

### 4. Vercel environment (optional hardening)

If you want to avoid keeping keys in `config.js` entirely, you can move to Vercel environment variables + a serverless function later. For personal use, `config.js` kept local and out of git is fine.

## Usage

- Click **+ Add from email** and paste any email content
- Hit **Extract task** (or Cmd+Enter) — Claude parses out the action, client, deadline, and a key snippet
- Tasks land in **To do** — move them right as you work, or drag between columns
- Click the **✎** icon to edit any card inline
- Use the **client filter** to focus on one client at a time
