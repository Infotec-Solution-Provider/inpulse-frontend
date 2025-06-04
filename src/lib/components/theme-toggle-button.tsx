"use client";
import { IconButton } from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useThemeContext } from "@/app/theme-context";

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useThemeContext();

  const iconColor = theme === "dark" ? "#FACC15"  : "#111827";

  return (
    <IconButton
      title="Alternar tema"
      onClick={toggleTheme}
      sx={{ color: iconColor }}
    >
      {theme === "dark" ? <Brightness7 /> : <Brightness4 />}
    </IconButton>
  );
}
