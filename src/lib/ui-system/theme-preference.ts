export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export const THEME_PREFERENCE_KEY = "themePreference";

/** A stored legacy choice wins over the new system default. */
export function readThemePreference(
  preference: string | null,
  legacyTheme: string | null,
): ThemePreference {
  if (preference === "light" || preference === "dark" || preference === "system") return preference;
  return legacyTheme === "light" || legacyTheme === "dark" ? legacyTheme : "system";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}
