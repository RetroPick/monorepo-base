/** Shared square carousel tile — slightly larger for readability. */
export const ROUND_CARD_SHELL =
  "aspect-square w-[min(100%,272px)] min-w-[220px] max-w-[272px] shrink-0 sm:w-[min(100%,292px)] sm:max-w-[292px]";

/** Green / red / amber outline for settled outcomes (Up/Down or Above/Below). */
export function outcomeBorderForResult(resolved: string | null) {
  if (resolved === "Up" || resolved === "Above") {
    return "border-2 border-emerald-500/70 shadow-[0_0_0_1px_rgba(16,185,129,0.12)] dark:border-emerald-400/55 dark:shadow-[0_0_20px_-8px_rgba(16,185,129,0.35)]";
  }
  if (resolved === "Down" || resolved === "Below") {
    return "border-2 border-rose-500/70 shadow-[0_0_0_1px_rgba(244,63,94,0.12)] dark:border-rose-400/55 dark:shadow-[0_0_20px_-8px_rgba(244,63,94,0.3)]";
  }
  if (resolved === "Tie") return "border-2 border-amber-500/45 dark:border-amber-400/40";
  return "";
}

export function formatLiveCountdown(targetMs: number, format: "mm:ss" | "hh:mm:ss") {
  const totalSeconds = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (format === "mm:ss") {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
