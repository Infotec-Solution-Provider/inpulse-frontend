import type { Theme } from "@mui/material/styles";

/** The page's Tailwind card surface (white / slate-800) and border (slate-200 / slate-700).
 * The MUI themes are stock, so dark Paper would otherwise be gray (#121212 plus an
 * elevation gradient) instead of the slate palette used around it. */
export const surface = (theme: Theme) => (theme.palette.mode === "dark" ? "#1e293b" : "#ffffff");
export const surfaceBorder = (theme: Theme) =>
  theme.palette.mode === "dark" ? "#334155" : "#e2e8f0";
export const dialogPaperSx = {
  bgcolor: surface,
  backgroundImage: "none",
  borderRadius: 3,
  border: 1,
  borderColor: surfaceBorder,
  "& .MuiDialogContent-dividers": { borderColor: surfaceBorder },
} as const;
