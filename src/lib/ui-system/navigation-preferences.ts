import type { NavigationItem } from "./navigation";

export interface NavigationPreferences {
  hidden: string[];
  order: Record<string, string[]>;
}

export const defaultNavigationPreferences: NavigationPreferences = { hidden: [], order: {} };
export const navigationRoot = "$root";

export function navigationPreferencesKey(instance: string, userId: number | string): string {
  return `@inpulse/ui/navigation:v1:${encodeURIComponent(instance)}:${encodeURIComponent(String(userId))}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function readNavigationPreferences(saved: string | null): NavigationPreferences {
  if (saved === null) return defaultNavigationPreferences;
  try {
    const value = JSON.parse(saved) as Partial<NavigationPreferences> | null;
    const order = value?.order;
    if (
      !isStringArray(value?.hidden) ||
      !order ||
      typeof order !== "object" ||
      Array.isArray(order)
    ) {
      return defaultNavigationPreferences;
    }
    const levels = Object.entries(order);
    if (levels.some(([, ids]) => !isStringArray(ids))) return defaultNavigationPreferences;
    return {
      hidden: [...new Set(value.hidden)],
      order: Object.fromEntries(levels.map(([parent, ids]) => [parent, [...new Set(ids)]])),
    };
  } catch {
    return defaultNavigationPreferences;
  }
}

export function orderedNavigationLevel(
  items: NavigationItem[],
  order: string[] | undefined,
): NavigationItem[] {
  if (!order?.length) return items;
  const remaining = new Map(items.map((item) => [item.id, item]));
  const ordered = order.flatMap((id) => {
    const item = remaining.get(id);
    remaining.delete(id);
    return item ? [item] : [];
  });
  return [...ordered, ...remaining.values()];
}

export function moveNavigationItem(
  preferences: NavigationPreferences,
  parent: string,
  siblings: NavigationItem[],
  from: number,
  to: number,
): NavigationPreferences {
  if (from < 0 || from >= siblings.length || to < 0 || to >= siblings.length || from === to) {
    return preferences;
  }
  const ids = siblings.map((item) => item.id);
  const available = new Set(ids);
  const [moved] = ids.splice(from, 1);
  ids.splice(to, 0, moved);

  // Keep slots for items that are temporarily unavailable in the current catalog.
  let next = 0;
  const order = (preferences.order[parent] ?? []).map((id) =>
    available.has(id) ? ids[next++] : id,
  );
  return {
    ...preferences,
    order: { ...preferences.order, [parent]: [...order, ...ids.slice(next)] },
  };
}

export function visibleNavigation(
  catalog: NavigationItem[],
  preferences: NavigationPreferences,
): NavigationItem[] {
  if (preferences === defaultNavigationPreferences) return catalog;
  const hidden = new Set(preferences.hidden);
  function visit(items: NavigationItem[], parent: string): NavigationItem[] {
    return orderedNavigationLevel(items, preferences.order[parent]).flatMap<NavigationItem>(
      (item) => {
        if (hidden.has(item.id)) return [];
        if (item.kind === "link") return [item];
        const routes = visit(item.routes, item.id);
        return routes.length ? [{ ...item, routes }] : [];
      },
    );
  }
  return visit(catalog, navigationRoot);
}
