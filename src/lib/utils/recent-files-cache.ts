const RECENT_FILES_KEY = "inpulse:recent-file-views";
const MAX_RECENT_FILES = 200;

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readRecentFiles(): number[] {
  if (!canUseSessionStorage()) return [];

  try {
    const raw = window.sessionStorage.getItem(RECENT_FILES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0)
      .slice(0, MAX_RECENT_FILES);
  } catch {
    return [];
  }
}

function writeRecentFiles(ids: number[]) {
  if (!canUseSessionStorage()) return;

  try {
    window.sessionStorage.setItem(RECENT_FILES_KEY, JSON.stringify(ids.slice(0, MAX_RECENT_FILES)));
  } catch {
    // Silently ignore storage quota/unavailable errors.
  }
}

export function hasViewedRecentFile(fileId: number) {
  const ids = readRecentFiles();
  return ids.includes(fileId);
}

export function markRecentFileAsViewed(fileId: number) {
  const ids = readRecentFiles();
  const next = [fileId, ...ids.filter((id) => id !== fileId)];
  writeRecentFiles(next);
}
