# UniTracker (quickjoy1 fork)

A fork of [rickypcyt/unitracker](https://github.com/rickypcyt/unitracker), an all-in-one productivity app: Pomodoro and study timers, Kanban tasks, calendar, stats, notes and habits.

This fork is made to **run locally with no account, no keys and no hosting**.

## What is different in this fork

- **Works offline with no login.** Without Supabase keys the app uses a small built-in database stored in your browser and signs you in automatically as a local user (`src/utils/localSupabase.ts`). Tasks, workspaces and sessions all work.
- **Task status is saved.** In Progress and On Hold no longer jump back to To Do after a reload.
- **Due-task reminders and a Notifications tab.** Reminders go out 3 days, 1 day, 3 hours and 1 hour before a deadline, when it is due, and every 6 hours while overdue (only while the app is open in a tab). Popups are spaced 5 seconds apart, and a pile-up (for example after being away) becomes one summary popup. Everything is also saved in **Session > Notifications**, which has an *Upcoming* list (overdue and next 7 days) and a *History* list you can mark read or clear. Deadlines without a time count as due at the end of that day. Done tasks never remind.
- **Minimal clock face in full screen and the floating popup.** Each timer (Pomodoro, Study, Countdown) has a full-screen button: white digits on black, dot separators, HOURS / MINUTES / SECONDS labels, an "In progress" pill and pill buttons. The *Float timers* popup window uses the same style. The normal three-in-a-row panels are unchanged. Esc leaves full screen.
- **Study a task.** The Study timer has a *Study a task* button that lists your open tasks (overdue first, then upcoming, then no deadline). Pick one and a session starts for it, the task moves to In Progress, and the time is saved against that task.
- **Study time by task.** The Analytics page has a *Study time by task* card with today, last 7 days and all-time totals per task.
- **Backup restore works.** Restore now saves workspaces, tasks and sessions, then reloads the page. Before, it only showed a success message.

## Run it locally

You need Node.js 20 or newer.

```bash
git clone https://github.com/quickjoy1/unitracker.git
cd unitracker
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:5173/app. Click anywhere once and allow notifications so reminders can pop up.

Notes for local mode:
- Reminders only fire while the app is open in a browser tab.
- Data lives in this browser only. Clearing site data deletes it, so use Settings to export a backup now and then.
- Google login, friends and sharing, and avatar upload need a real Supabase project and do not work in local mode.
- Optional: to use your own Supabase project, create a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and restart.

## Keep your local folder in sync with this repo

**Easiest: start from a clone.** If your folder was not created with `git clone` (for example you unzipped a download), connect it to the repo once. This replaces tracked files with the repo version, but leaves `node_modules` and your `.env` alone:

```bash
cd path/to/your/unitracker-folder
git init
git remote add origin https://github.com/quickjoy1/unitracker.git
git fetch origin
git reset --hard origin/main
git branch --set-upstream-to=origin/main main
npm install --legacy-peer-deps
```

Back up anything you changed by hand before running `git reset --hard`.

**After that, to get new changes from GitHub into your folder:**

```bash
git pull
npm install --legacy-peer-deps   # only needed if package.json changed
```

If you want this to happen without typing, set up a scheduled task (Windows Task Scheduler, or cron on Mac/Linux) that runs `git -C path/to/folder pull` every so often. Git cannot pull on its own without something running it.

**To send your own local changes back to GitHub:**

```bash
git add -A
git commit -m "describe your change"
git push
```

You will be asked to sign in to GitHub the first time (use a personal access token as the password, or run `gh auth login` if you have the GitHub CLI).

**To also receive updates from the original project** (rickypcyt/unitracker):

```bash
git remote add upstream https://github.com/rickypcyt/unitracker.git
git fetch upstream
git merge upstream/main
```

If Git reports conflicts, they will be in files both sides changed (most likely `src/utils/supabaseClient.ts` or `src/hooks/useTaskStorage.ts`). Fix them, then `git add` and `git commit`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app at http://localhost:5173 |
| `npm test` | Run unit tests |
| `npm run type-check` | Check TypeScript types |
| `npm run build` | Production build |

## Credits

Original project by [rickypcyt](https://github.com/rickypcyt/unitracker). This fork keeps the original code and adds the changes listed above.
