"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import darkTheme from "@/lib/themes/dark";
import lightTheme from "@/lib/themes/light";
import {
  readThemePreference,
  resolveTheme,
  THEME_PREFERENCE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/ui-system/theme-preference";

interface ThemeContextValue {
  theme: ResolvedTheme;
  toggleTheme: () => void;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  preference: "system",
  toggleTheme: () => {},
  setPreference: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(true);
  const [ready, setReady] = useState(false);
  const themeMode = resolveTheme(preference, systemDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => setSystemDark(media.matches);
    const syncPreference = () => {
      try {
        setPreference(
          readThemePreference(
            localStorage.getItem(THEME_PREFERENCE_KEY),
            localStorage.getItem("themeMode"),
          ),
        );
      } catch {
        setPreference("system");
      }
    };
    syncSystem();
    syncPreference();
    setReady(true);
    media.addEventListener("change", syncSystem);
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_PREFERENCE_KEY || event.key === "themeMode" || event.key === null)
        syncPreference();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", syncSystem);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    try {
      localStorage.setItem(THEME_PREFERENCE_KEY, preference);
      // Retain the resolved value for older application controls and tabs.
      localStorage.setItem("themeMode", themeMode);
    } catch {
      // A browser that blocks storage must still be able to switch themes.
    }
  }, [preference, ready, themeMode]);

  const muiTheme = useMemo(() => (themeMode === "dark" ? darkTheme : lightTheme), [themeMode]);
  const toggleTheme = useCallback(() => {
    setPreference(themeMode === "dark" ? "light" : "dark");
  }, [themeMode]);
  const value = useMemo(
    () => ({ theme: themeMode, toggleTheme, preference, setPreference }),
    [themeMode, toggleTheme, preference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
