const STORAGE_KEY = "last-user-activity-at";
const ACTIVITY_WRITE_THROTTLE_MS = 15_000;

let lastActivityAt = readStoredActivityAt();
let lastPersistedAt = lastActivityAt;
let started = false;

function readStoredActivityAt() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function persistActivityAt(value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore storage issues
  }
}

function shouldPersist(nextTime: number, previousIso: string) {
  if (!previousIso) return true;
  const previousTime = new Date(previousIso).getTime();
  if (!Number.isFinite(previousTime)) return true;
  return nextTime - previousTime >= ACTIVITY_WRITE_THROTTLE_MS;
}

export function markUserActivity() {
  const now = new Date();
  const nextIso = now.toISOString();
  lastActivityAt = nextIso;

  if (shouldPersist(now.getTime(), lastPersistedAt)) {
    persistActivityAt(nextIso);
    lastPersistedAt = nextIso;
  }
}

export function getLastUserActivityAt() {
  return lastActivityAt || readStoredActivityAt();
}

export function startUserActivityTracking() {
  if (started || typeof window === "undefined") return;
  started = true;

  const mark = () => {
    markUserActivity();
  };

  mark();

  window.addEventListener("pointerdown", mark, { passive: true });
  window.addEventListener("keydown", mark, { passive: true });
  window.addEventListener("scroll", mark, { passive: true });
  window.addEventListener("focus", mark, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      mark();
    }
  });
}
