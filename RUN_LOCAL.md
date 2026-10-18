# Run UniTracker locally

1. Install Node 20+ and run: `npm install --legacy-peer-deps`
2. Start: `npm run dev` then open http://localhost:5173
3. No account or keys needed: without `.env` the app runs in local mode and saves everything in your browser.
   (Optional: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` to use login and cloud sync.)

## Due-task reminders
- Works while the app is open in a browser tab. Click anywhere once and allow notifications.
- You get a reminder 24 hours before, 1 hour before, when the task is due, and daily while it is overdue.
- Date-only deadlines count as due at the end of that day. Done tasks never remind.
