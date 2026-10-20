/**
 * Clock animation for the full-screen / floating clock face.
 * When a digit changes, the old digit slides up and fades out (a ghost copy) while the new one fades in.
 * It only watches the DOM, so the timer components don't need to know about it.
 */
const SCOPE = ".timer-panel-fs, .pip-slot-host";

const segOf = (node: Node | null): HTMLElement | null => {
  const el = node && node.nodeType === 3 ? node.parentElement : (node as HTMLElement | null);
  const seg = el?.closest?.("span[data-seg]") as HTMLElement | null;
  return seg && seg.closest(SCOPE) ? seg : null;
};

export function attachDigitRoll(holder: HTMLElement): () => void {
  if (typeof MutationObserver === "undefined") return () => {};
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};

  const spawn = (seg: HTMLElement, oldText: string) => {
    const doc = seg.ownerDocument;
    let layer = holder.querySelector(":scope > .digit-ghost-layer") as HTMLElement | null;
    if (!layer) {
      layer = doc.createElement("div");
      layer.className = "digit-ghost-layer";
      holder.appendChild(layer);
    }
    const hostRect = holder.getBoundingClientRect();
    const rect = seg.getBoundingClientRect();
    const cs = (doc.defaultView ?? window).getComputedStyle(seg);
    const ghost = doc.createElement("div");
    ghost.className = "digit-ghost";
    ghost.textContent = oldText;
    ghost.style.cssText =
      `left:${rect.left - hostRect.left}px;top:${rect.top - hostRect.top}px;width:${rect.width}px;` +
      `font-size:${cs.fontSize};font-family:${cs.fontFamily};font-weight:${cs.fontWeight};color:${cs.color};line-height:1;`;
    layer.appendChild(ghost);
    ghost.addEventListener("animationend", () => ghost.remove(), { once: true });
    window.setTimeout(() => ghost.remove(), 800); // safety net

    // new digit fades in
    seg.classList.remove("digit-tick");
    void seg.offsetWidth;
    seg.classList.add("digit-tick");
    seg.addEventListener("animationend", () => seg.classList.remove("digit-tick"), { once: true });
  };

  const observer = new MutationObserver((mutations) => {
    const seen = new Set<HTMLElement>();
    for (const m of mutations) {
      let seg: HTMLElement | null = null;
      let oldText = "";
      if (m.type === "characterData") {
        seg = segOf(m.target);
        oldText = m.oldValue ?? "";
      } else if (m.type === "childList") {
        seg = segOf(m.target);
        oldText = Array.from(m.removedNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("");
      }
      if (!seg || seen.has(seg)) continue;
      const now = seg.textContent ?? "";
      if (!oldText.trim() || oldText === now) continue;
      seen.add(seg);
      spawn(seg, oldText.trim());
    }
  });
  observer.observe(holder, { subtree: true, characterData: true, characterDataOldValue: true, childList: true });
  return () => observer.disconnect();
}
