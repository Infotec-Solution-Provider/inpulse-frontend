/** in.pulse UI foundations. Semantic roles are shared by CSS and the MUI adapter. */
export const uiPalette = {
  light: {
    bg: "#f6f6f8",
    surface: "#ffffff",
    surfaceMuted: "#f0f0f3",
    surfaceRaised: "#ffffff",
    pressed: "#e6e6ed",
    borderSubtle: "#e8e8ed",
    border: "#d9d9e1",
    text: "#202027",
    muted: "#62626f",
    accent: "#6d28d9",
    accentSoft: "#f0e9fc",
    onAccent: "#ffffff",
    danger: "#b91c1c",
    dangerSoft: "#fef2f2",
    warning: "#92400e",
    warningSoft: "#fffbeb",
    success: "#047857",
    successSoft: "#ecfdf5",
    focus: "#7c3aed",
  },
  dark: {
    bg: "#101114",
    surface: "#191a1f",
    surfaceMuted: "#22232a",
    surfaceRaised: "#22232a",
    pressed: "#2c2d35",
    borderSubtle: "#2c2d35",
    border: "#393a45",
    text: "#f4f4f6",
    muted: "#b0b0bf",
    accent: "#c4b5fd",
    accentSoft: "#302044",
    onAccent: "#24103d",
    danger: "#fca5a5",
    dangerSoft: "#3e2025",
    warning: "#fcd34d",
    warningSoft: "#3c3020",
    success: "#6ee7b7",
    successSoft: "#15352e",
    focus: "#c4b5fd",
  },
} as const;

export type UiMode = keyof typeof uiPalette;
export const uiShadows = {
  light: {
    menu: "0 8px 28px rgb(20 20 30 / 12%)",
    overlay: "0 20px 64px rgb(20 20 30 / 18%)",
  },
  dark: {
    menu: "0 8px 28px rgb(0 0 0 / 32%)",
    overlay: "0 20px 64px rgb(0 0 0 / 44%)",
  },
} as const;
export const uiFontFamily =
  '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
export const uiMetrics = {
  space: [0, 4, 8, 12, 16, 24, 32, 48],
  controlRadius: 8,
  panelRadius: 12,
  controlHeight: 36,
  touchHeight: 44,
  filterPanel: 480,
  detailPanel: 720,
  navigationExpanded: 240,
  navigationCollapsed: 64,
  motionMs: 160,
} as const;

export function uiCssVariables(mode: UiMode): Record<string, string> {
  return Object.fromEntries(
    Object.entries({
      ...uiPalette[mode],
      shadowMenu: uiShadows[mode].menu,
      shadowOverlay: uiShadows[mode].overlay,
    }).map(([key, value]) => [
      `--ip-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
      value,
    ]),
  );
}
