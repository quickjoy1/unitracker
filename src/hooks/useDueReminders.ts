import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { isTaskDone } from "@/constants/taskStatus";
import { useTasksOnly } from "@/store/appStore";
import {
  getDesktopPermission,
  requestDesktopPermission,
  showDesktopNotification,
} from "@/utils/desktopNotifications";

const STORAGE_KEY = "dueReminderSent";
const CHECK_EVERY_MS = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type Tier = "day" | "hour" | "due" | "overdue";

/** Date-only deadlines ("2026-10-20") count as due at the end of that day (local time). */
export const parseDeadline = (deadline?: string | null): number | null => {
  if (!deadline) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(deadline);
  const ms = new Date(dateOnly ? `${deadline}T23:59:00` : deadline).getTime();
  return Number.isNaN(ms) ? null : ms;
};

/** Which reminder (if any) a task needs right now. Highest urgency wins; one reminder per check. */
export const getReminderTier = (dueMs: number, now: number): Tier | null => {
  const left = dueMs - now;
  if (left <= -HOUR) return "overdue";
  if (left <= 0) return "due";
  if (left <= HOUR) return "hour";
  if (left <= DAY) return "day";
  return null;
};

const MESSAGES: Record<Tier, (title: string) => string> = {
  day: (t) => `Due within 24 hours: ${t}`,
  hour: (t) => `Due within 1 hour: ${t}`,
  due: (t) => `Due now: ${t}`,
  overdue: (t) => `Overdue: ${t}`,
};

const loadSent = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

/** Watches task deadlines and reminds once per tier (overdue repeats once a day). Runs while the app is open. */
export const useDueReminders = () => {
  const tasks = useTasksOnly();
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    // Browsers only allow the permission prompt from a user gesture
    const askOnce = () => {
      if (getDesktopPermission() === "default") void requestDesktopPermission();
    };
    window.addEventListener("click", askOnce, { once: true });

    const check = () => {
      const now = Date.now();
      const sent = loadSent();
      const alive = new Set<string>();
      let changed = false;

      for (const task of tasksRef.current) {
        if (isTaskDone(task.status) || task.completed) continue;
        const dueMs = parseDeadline(task.deadline);
        if (dueMs === null) continue;
        const tier = getReminderTier(dueMs, now);
        if (!tier) continue;

        // Key includes the deadline so changing it re-arms reminders; overdue also keys on the day
        const day = tier === "overdue" ? `-${new Date(now).toISOString().slice(0, 10)}` : "";
        const key = `${task.id}|${task.deadline}|${tier}${day}`;
        alive.add(key);
        if (sent[key]) continue;

        sent[key] = now;
        changed = true;
        const message = MESSAGES[tier](task.title);
        toast[tier === "overdue" || tier === "due" ? "error" : "warning"](message, { autoClose: 8000 });
        showDesktopNotification("Task reminder", { body: message, tag: key });
      }

      // Drop records older than 3 days so storage doesn't grow forever
      for (const key of Object.keys(sent)) {
        if (!alive.has(key) && now - (sent[key] ?? 0) > 3 * DAY) {
          delete sent[key];
          changed = true;
        }
      }
      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sent));
        } catch {
          // storage full or blocked: reminders still show this session
        }
      }
    };

    check();
    const id = window.setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("click", askOnce);
    };
  }, [tasks.length]);
};
