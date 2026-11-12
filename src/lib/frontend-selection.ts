export type FrontendVersion = "legacy" | "new";
export type FrontendParameters = Record<string, string | undefined>;

const CHOICE_PREFIX = "@inpulse/frontend-choice:v1:";
const OWNER_KEY = `${CHOICE_PREFIX}active-scope`;
export type FrontendChoiceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export function frontendChoiceKey(instance: string, userId: number | string): string {
  return `${CHOICE_PREFIX}${encodeURIComponent(instance)}:${userId}`;
}

export function clearFrontendChoices(storage: FrontendChoiceStorage): void {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) if (key?.startsWith(CHOICE_PREFIX)) storage.removeItem(key);
}

export function activateFrontendScope(storage: FrontendChoiceStorage, instance: string, userId: number | string): string {
  const key = frontendChoiceKey(instance, userId);
  if (storage.getItem(OWNER_KEY) !== key) {
    clearFrontendChoices(storage);
    storage.setItem(OWNER_KEY, key);
  }
  return key;
}

export function parseFrontendChoice(value: string | null | undefined): FrontendVersion | null {
  return value === "legacy" || value === "new" ? value : null;
}

export function frontendChoiceFromHash(hash: string): FrontendVersion | null {
  return hash.startsWith("#frontend-choice=") ? parseFrontendChoice(hash.slice("#frontend-choice=".length)) : null;
}

export function resolveFrontendVersion(parameters: FrontendParameters, savedChoice?: FrontendVersion | null): FrontendVersion {
  if (parameters.feature_frontend_switch_enabled === "true" && savedChoice) return savedChoice;
  return parameters.feature_new_frontend_enabled === "true" ? "new" : "legacy";
}

export function frontendSwitchHref(instance: string, version: FrontendVersion): string {
  return `${version === "new" ? "/nova" : ""}/${encodeURIComponent(instance)}#frontend-choice=${version}`;
}

export function getFrontendChoiceStorage(): FrontendChoiceStorage | null {
  try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; }
}

export function clearSessionFrontendChoices(): void {
  const storage = getFrontendChoiceStorage();
  try { if (storage) clearFrontendChoices(storage); } catch { /* Storage can be disabled by the browser. */ }
}

export function activateSessionFrontendScope(instance: string, userId: number | string): void {
  const storage = getFrontendChoiceStorage();
  try { if (storage) activateFrontendScope(storage, instance, userId); } catch { /* Selection still has its safe default. */ }
}
