import type { Theme } from "@mui/material/styles";

/** Monitoring adopts the semantic surface of the scoped design-system theme. */
export const surface = (theme: Theme) => theme.palette.background.paper;
export const surfaceBorder = (theme: Theme) => theme.palette.divider;
export const dialogPaperSx = {
  bgcolor: surface,
  backgroundImage: "none",
  borderRadius: 3,
  border: 1,
  borderColor: surfaceBorder,
  "& .MuiDialogContent-dividers": { borderColor: surfaceBorder },
} as const;
