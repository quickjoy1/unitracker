import { describe, expect, it } from "vitest";
import { formatTime, nextIndex, prevIndex, titleFromFileName, validateStreamUrl } from "./musicQueue";

describe("nextIndex", () => {
  const o = { shuffle: false, loop: "all" as const, auto: true };
  it("goes to the next track and wraps with loop all", () => {
    expect(nextIndex(3, 0, o)).toBe(1);
    expect(nextIndex(3, 2, o)).toBe(0);
  });
  it("stops at the end when loop is off and playback ended by itself", () => {
    expect(nextIndex(3, 2, { ...o, loop: "off" })).toBeNull();
  });
  it("Next pressed by hand always wraps", () => {
    expect(nextIndex(3, 2, { ...o, loop: "off", auto: false })).toBe(0);
  });
  it("repeat one replays the same track when it ends, but Next still moves on", () => {
    expect(nextIndex(3, 1, { ...o, loop: "one" })).toBe(1);
    expect(nextIndex(3, 1, { ...o, loop: "one", auto: false })).toBe(2);
  });
  it("shuffle never repeats the current track", () => {
    for (const r of [0, 0.25, 0.5, 0.99]) {
      const n = nextIndex(4, 2, { ...o, shuffle: true, random: () => r })!;
      expect(n).not.toBe(2);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(4);
    }
  });
  it("handles empty and single-track queues", () => {
    expect(nextIndex(0, 0, o)).toBeNull();
    expect(nextIndex(1, 0, o)).toBe(0);
    expect(nextIndex(1, 0, { ...o, loop: "off" })).toBeNull();
  });
});

describe("prevIndex", () => {
  it("wraps to the last track", () => {
    expect(prevIndex(3, 0)).toBe(2);
    expect(prevIndex(3, 2)).toBe(1);
    expect(prevIndex(0, 0)).toBeNull();
  });
});

describe("validateStreamUrl", () => {
  it("accepts https links", () => {
    expect(validateStreamUrl("https://ice1.somafm.com/groovesalad-128-mp3")).toMatchObject({ ok: true });
  });
  it("rejects junk, other protocols and streaming-site pages", () => {
    expect(validateStreamUrl("not a url").ok).toBe(false);
    expect(validateStreamUrl("ftp://x.com/a.mp3").ok).toBe(false);
    expect(validateStreamUrl("https://www.youtube.com/watch?v=abc").ok).toBe(false);
  });
  it("blocks http streams on https pages except localhost", () => {
    expect(validateStreamUrl("http://radio.example.com/live", "https:").ok).toBe(false);
    expect(validateStreamUrl("http://radio.example.com/live", "http:").ok).toBe(true);
    expect(validateStreamUrl("http://localhost:8000/live", "https:").ok).toBe(true);
  });
});

describe("helpers", () => {
  it("cleans file names", () => {
    expect(titleFromFileName("my_lofi  mix.mp3")).toBe("my lofi mix");
    expect(titleFromFileName(".mp3")).toBe(".mp3".replace(/\.[a-z0-9]{2,5}$/i, "") || "Untitled");
  });
  it("formats time", () => {
    expect(formatTime(75)).toBe("1:15");
    expect(formatTime(NaN)).toBe("0:00");
  });
});
