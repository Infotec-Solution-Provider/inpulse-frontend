import { describe, expect, it } from "vitest";
import type { NavigationItem } from "./navigation";
import {
  defaultNavigationPreferences,
  moveNavigationItem,
  navigationPreferencesKey,
  navigationRoot,
  orderedNavigationLevel,
  readNavigationPreferences,
  visibleNavigation,
} from "./navigation-preferences";

const link = (id: string): NavigationItem => ({ id, kind: "link", title: id, href: `/${id}` });
const group = (id: string, routes: NavigationItem[]): NavigationItem => ({
  id,
  kind: "group",
  title: id,
  routes,
});
const ids = (items: NavigationItem[]) => items.map((item) => item.id);

describe("navigation preferences", () => {
  it("scopes the versioned record to one operator and company", () => {
    expect(navigationPreferencesKey("a:b", 1)).not.toBe(navigationPreferencesKey("a", "b:1"));
    expect(navigationPreferencesKey("a", 1)).not.toBe(navigationPreferencesKey("a", 2));
  });

  it.each([null, "{", "null", "[]", '{"order":{},"hidden":[1]}', '{"order":{"a":1},"hidden":[]}'])(
    "uses defaults for an invalid or missing record %j",
    (saved) => expect(readNavigationPreferences(saved)).toBe(defaultNavigationPreferences),
  );

  it("deduplicates saved IDs and appends new catalog entries in their default order", () => {
    const preferences = readNavigationPreferences(
      JSON.stringify({
        hidden: ["x", "x"],
        order: { [navigationRoot]: ["c", "missing", "a", "c"] },
      }),
    );
    expect(preferences.hidden).toEqual(["x"]);
    expect(
      ids(visibleNavigation([link("new-1"), link("a"), link("new-2"), link("c")], preferences)),
    ).toEqual(["c", "a", "new-1", "new-2"]);
  });

  it("keeps unavailable slots when editing a level and ignores out-of-range moves", () => {
    const preferences = {
      hidden: ["unavailable"],
      order: { [navigationRoot]: ["a", "unavailable", "b"], other: ["n"] },
    };
    const siblings = [link("a"), link("b"), link("c")];
    expect(moveNavigationItem(preferences, navigationRoot, siblings, 0, -1)).toBe(preferences);
    const updated = moveNavigationItem(preferences, navigationRoot, siblings, 0, 2);
    expect(updated).toEqual({
      hidden: ["unavailable"],
      order: { [navigationRoot]: ["b", "unavailable", "c", "a"], other: ["n"] },
    });
    expect(ids(visibleNavigation(siblings, updated))).toEqual(["b", "c", "a"]);
  });

  it("filters hidden items and empty groups without changing the authorized catalog", () => {
    const teamRoutes = [link("x"), link("y"), group("archive", [link("z")])];
    const catalog = [link("home"), group("teams", teamRoutes), group("reports", [link("r")])];
    const preferences = {
      hidden: ["reports", "z"],
      order: { [navigationRoot]: ["unavailable", "teams", "home"], teams: ["y", "x"] },
    };
    expect(visibleNavigation(catalog, preferences)).toEqual([
      group("teams", [link("y"), link("x")]),
      link("home"),
    ]);
    expect(orderedNavigationLevel(teamRoutes, preferences.order.teams)).toEqual([
      link("y"),
      link("x"),
      group("archive", [link("z")]),
    ]);
    expect(visibleNavigation(catalog, defaultNavigationPreferences)).toBe(catalog);
  });
});
