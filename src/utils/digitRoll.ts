/**
 * Clock animation for the full-screen / floating clock face.
 * When a digit changes, the old digit slides down and fades while the new one drops in from above (clipped to the digit box).
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
    const now = (seg.textContent ?? "").trim();
    let layer = holder.querySelector(":scope > .digit-ghost-layer") as HTMLElement | null;
    if (!layer) {
      layer = doc.createElement("div");
      layer.className = "digit-ghost-layer";
      holder.appendChild(layer);
    }
    const hostRect = holder.getBoundingClientRect();
    const rect = seg.getBoundingClientRect();
    const cs = (doc.defaultView ?? window).getComputedStyle(seg);
    const fs = parseFloat(cs.fontSize) || 48;
    const pad = fs * 0.5; // room for the short slide so nothing is cut
    const box = doc.createElement("div");
    box.className = "digit-clip";
    box.style.cssText =
      `left:${rect.left - hostRect.left}px;top:${rect.top - hostRect.top - pad}px;` +
      `width:${rect.width}px;height:${rect.height + pad * 2}px;padding:${pad}px 0;` +
      `font-size:${cs.fontSize};font-family:${cs.fontFamily};font-weight:${cs.fontWeight};color:${cs.color};`;
    const n = Math.max(now.length, oldText.length);
    for (let i = 0; i < n; i++) {
      const o = oldText[i] ?? "", c = now[i] ?? "";
      const col = doc.createElement("span");
      col.className = "digit-col";
      if (o === c) {
        col.textContent = c;
      } else {
        const out = doc.createElement("span");
        out.className = "digit-old";
        out.textContent = o;
        const inn = doc.createElement("span");
        inn.className = "digit-new";
        inn.textContent = c;
        col.append(out, inn);
      }
      box.appendChild(col);
    }
    layer.appendChild(box);
    seg.classList.add("digit-hide");
    let finished = false;
    const done = () => { if (finished) return; finished = true; box.remove(); seg.classList.remove("digit-hide"); };
    const lastOld = box.querySelector(".digit-old");
    if (lastOld) lastOld.addEventListener("animationend", done, { once: true });
    window.setTimeout(done, 500); // safety net
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
