import { describe, expect, it } from "vitest";
import { getReminderTier, parseDeadline } from "./useDueReminders";

const H = 3_600_000;
const now = new Date("2026-10-18T10:00:00").getTime();

describe("getReminderTier", () => {
  it("returns null when more than a day away", () => expect(getReminderTier(now + 25 * H, now)).toBeNull());
  it("day tier within 24h", () => expect(getReminderTier(now + 5 * H, now)).toBe("day"));
  it("hour tier within 1h", () => expect(getReminderTier(now + H / 2, now)).toBe("hour"));
  it("due tier right after the deadline", () => expect(getReminderTier(now - 10 * 60_000, now)).toBe("due"));
  it("overdue tier after an hour", () => expect(getReminderTier(now - 2 * H, now)).toBe("overdue"));
});

describe("parseDeadline", () => {
  it("handles empty and invalid values", () => {
    expect(parseDeadline(null)).toBeNull();
    expect(parseDeadline("nope")).toBeNull();
  });
  it("treats date-only as end of that day", () => {
    expect(new Date(parseDeadline("2026-10-18")!).getHours()).toBe(23);
  });
});
