"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import darkTheme from "@/lib/themes/dark";
import lightTheme from "@/lib/themes/light";

const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeMode] = useState<"light" | "dark">("dark");

  // Recupera o tema salvo no localStorage no carregamento inicial
  useEffect(() => {
    const savedTheme = localStorage.getItem("themeMode") as "light" | "dark" | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setThemeMode(savedTheme);
    }
  }, []);

  // Atualiza o <html> class e salva no localStorage sempre que o tema mudar
  useEffect(() => {
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  const theme = useMemo(() => {
    return themeMode === "dark" ? darkTheme : lightTheme;
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme: themeMode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
