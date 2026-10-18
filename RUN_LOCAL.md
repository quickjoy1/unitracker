# Run UniTracker locally

1. Install Node 20+ and run: `npm install --legacy-peer-deps`
2. Start: `npm run dev` then open http://localhost:5173
3. No account or keys needed: without `.env` the app runs in local mode. You are signed in automatically as a local user, and everything (tasks, workspaces, sessions) is saved in this browser. Google login is not used in this mode.
   (Optional: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` to use login and cloud sync.)

## Due-task reminders
- Works while the app is open in a browser tab. Click anywhere once and allow notifications.
- You get a reminder 24 hours before, 1 hour before, when the task is due, and daily while it is overdue.
- Date-only deadlines count as due at the end of that day. Done tasks never remind.

## Backup and restore
- Settings > export a backup to get a JSON file. Restore saves workspaces, tasks and sessions, then reloads the page.
- Data lives in this browser only. Clearing site data deletes it, so export a backup now and then.
