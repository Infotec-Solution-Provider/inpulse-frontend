import { describe, expect, it } from "vitest";
import { readThemePreference, resolveTheme } from "./theme-preference";

describe("theme preference compatibility", () => {
  it("migrates an existing explicit light or dark choice", () => {
    expect(readThemePreference(null, "light")).toBe("light");
    expect(readThemePreference(null, "dark")).toBe("dark");
  });
  it("defaults new or invalid preferences to system", () => {
    expect(readThemePreference(null, null)).toBe("system");
    expect(readThemePreference("invalid", "invalid")).toBe("system");
  });
  it("keeps an explicit system selection instead of replacing it with the last resolved legacy mode", () => {
    expect(readThemePreference("system", "dark")).toBe("system");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("system", true)).toBe("dark");
  });
  it("ignores OS changes while the user has an explicit preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
