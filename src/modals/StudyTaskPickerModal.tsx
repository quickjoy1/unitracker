import { AlertCircle, CalendarClock, Clock, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BaseModal from "@/modals/BaseModal";
import { useTasksOnly } from "@/store/appStore";
import { fetchLaps } from "@/store/LapActions";
import { useTaskStudyTime } from "@/hooks/useTaskStudyTime";
import { formatDue, getReminderTier, parseDeadline } from "@/utils/reminderEngine";
import { formatStudied } from "@/utils/taskStudyTime";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPick: (task: any) => void;
}

const StudyTaskPickerModal = ({ isOpen, onClose, onPick }: Props) => {
  const tasks = useTasksOnly();
  const { totals, refresh } = useTaskStudyTime();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
    void fetchLaps().catch(() => {});
    void refresh();
  }, [isOpen, refresh]);

  // Open tasks: overdue first, then soonest deadline, then tasks without a deadline
  const rows = useMemo(() => {
    return tasks
      .filter((t) => !t.completed && t.status !== "completed")
      .map((t) => ({ task: t, dueMs: parseDeadline(t.deadline) }))
      .sort((a, b) => (a.dueMs ?? Infinity) - (b.dueMs ?? Infinity));
  }, [tasks]);

  const withDeadline = rows.filter((r) => r.dueMs !== null);
  const without = rows.filter((r) => r.dueMs === null);

  const renderRow = ({ task, dueMs }: { task: any; dueMs: number | null }) => {
    const tier = dueMs !== null ? getReminderTier(dueMs, now) : null;
    const overdue = dueMs !== null && dueMs < now;
    const studied = totals.get(task.id)?.totalSeconds ?? 0;
    return (
      <button
        key={task.id}
        type="button"
        onClick={() => onPick(task)}
        className="group w-full flex items-center gap-3 text-left bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] rounded-xl px-3 py-2.5 hover:border-[var(--accent-primary)] transition-colors"
      >
        <span className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white transition-colors shrink-0">
          <Play size={14} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-[var(--text-primary)] truncate">{task.title}</span>
          <span className="flex flex-wrap items-center gap-x-3 text-xs text-[var(--text-secondary)]">
            {task.assignment ? <span>{task.assignment}</span> : null}
            <span className="inline-flex items-center gap-1"><Clock size={11} /> {formatStudied(studied)} studied</span>
          </span>
        </span>
        {dueMs !== null ? (
          <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
            overdue || tier === "due" ? "text-red-500 border-red-500/30 bg-red-500/10"
              : tier === "1h" || tier === "3h" ? "text-orange-500 border-orange-500/30 bg-orange-500/10"
              : "text-[var(--text-secondary)] border-[var(--border-primary)]"
          }`}>{formatDue(dueMs, now)}</span>
        ) : null}
      </button>
    );
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Study a task" maxWidth="max-w-xl">
      <p className="text-sm text-[var(--text-secondary)] mb-3">Pick a task and the study timer starts right away. Your time is saved to that task.</p>
      {rows.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] py-6 justify-center">
          <AlertCircle size={16} /> No open tasks. Add one on the Tasks page first.
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {withDeadline.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"><CalendarClock size={13} /> Due and upcoming</div>
          )}
          {withDeadline.map(renderRow)}
          {without.length > 0 && (
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mt-2">No deadline</div>
          )}
          {without.map(renderRow)}
        </div>
      )}
    </BaseModal>
  );
};

export default StudyTaskPickerModal;
