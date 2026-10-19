import { createTheme } from "@mui/material/styles";
import { uiFontFamily, uiMetrics, uiPalette, uiShadows, type UiMode } from "./tokens";

export function createPilotTheme(mode: UiMode, container?: () => HTMLElement | null) {
  const colors = uiPalette[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: colors.accent, contrastText: colors.onAccent },
      background: { default: colors.bg, paper: colors.surface },
      text: { primary: colors.text, secondary: colors.muted },
      divider: colors.border,
      error: { main: colors.danger },
      warning: { main: colors.warning },
      success: { main: colors.success },
      action: { hover: colors.surfaceMuted, selected: colors.accentSoft, focus: colors.accentSoft },
    },
    typography: {
      fontFamily: uiFontFamily,
      fontSize: 14,
      h1: { fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.035em" },
      h2: { fontSize: "1.125rem", fontWeight: 600, letterSpacing: "-0.02em" },
      h6: { fontSize: "1rem", fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    },
    shape: { borderRadius: uiMetrics.controlRadius },
    transitions: {
      duration: {
        shortest: 100,
        shorter: 120,
        short: 160,
        standard: 160,
        enteringScreen: 160,
        leavingScreen: 120,
      },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 36,
            borderRadius: 8,
            paddingInline: 12,
            fontSize: 13,
            transition: "background-color 120ms ease, color 120ms ease, border-color 120ms ease",
            "@media (pointer: coarse)": { minHeight: 44 },
          },
          outlined: ({ ownerState }) =>
            ownerState.color === "primary"
              ? {
                  color: colors.text,
                  borderColor: colors.border,
                  "&:hover": { borderColor: colors.muted, backgroundColor: colors.surfaceMuted },
                }
              : {},
          text: ({ ownerState }) =>
            ownerState.color === "primary"
              ? {
                  color: colors.muted,
                  "&:hover": { color: colors.text, backgroundColor: colors.surfaceMuted },
                }
              : {},
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: 8,
            transition: "background-color 120ms ease, color 120ms ease",
            "&:active": { backgroundColor: colors.pressed },
            "@media (pointer: coarse)": { minHeight: 44, minWidth: 44 },
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiDialog: {
        defaultProps: { container },
        styleOverrides: {
          paper: {
            borderRadius: 12,
            backgroundColor: colors.surfaceRaised,
            backgroundImage: "none",
            border: `1px solid ${colors.border}`,
            boxShadow: uiShadows[mode].overlay,
            "@media (max-width: 599px)": {
              margin: 12,
              width: "calc(100% - 24px)",
              maxHeight: "calc(100dvh - 24px)",
            },
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontSize: 18, fontWeight: 600, padding: "20px 24px 12px" } },
      },
      MuiDialogContent: { styleOverrides: { root: { paddingInline: 24 } } },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: "12px 24px",
            borderTop: `1px solid ${colors.border}`,
            gap: 8,
            flexWrap: "wrap",
          },
        },
      },
      MuiModal: { defaultProps: { container } },
      MuiPopover: {
        defaultProps: { container },
        styleOverrides: {
          root: { zIndex: 1400 },
          paper: {
            border: "1px solid " + colors.border,
            borderRadius: 8,
            backgroundColor: colors.surfaceRaised,
            boxShadow: uiShadows[mode].menu,
          },
        },
      },
      MuiPopper: { defaultProps: { container }, styleOverrides: { root: { zIndex: 1400 } } },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 36,
            fontSize: 14,
            gap: 8,
            "&:active": { backgroundColor: colors.pressed },
            "&.Mui-selected": {
              backgroundColor: colors.accentSoft,
              boxShadow: "inset 3px 0 0 " + colors.accent,
            },
            "@media (pointer: coarse)": { minHeight: 44 },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 8, fontSize: 14, backgroundColor: colors.surface },
          input: { "@media (max-width: 767px)": { fontSize: 16 } },
        },
      },
      MuiInputLabel: { styleOverrides: { root: { fontSize: 14 } } },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontSize: 12, height: 28, maxWidth: "100%" },
          label: { overflow: "hidden", textOverflow: "ellipsis" },
        },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 8, fontSize: 13 }, message: { minWidth: 0 } },
      },
      MuiTabs: {
        styleOverrides: { root: { minHeight: 40 }, indicator: { height: 2, borderRadius: 2 } },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 40,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            textTransform: "none",
            gap: 6,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            minHeight: 36,
            textTransform: "none",
            fontSize: 13,
            fontWeight: 500,
            color: colors.muted,
            borderColor: colors.border,
            "&.Mui-selected": {
              backgroundColor: colors.accentSoft,
              color: colors.accent,
              boxShadow: "inset 0 -2px 0 " + colors.accent,
            },
            "&:active": { backgroundColor: colors.pressed },
            "&.Mui-selected:hover": { backgroundColor: colors.accentSoft },
            "@media (pointer: coarse)": { minHeight: 44 },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: colors.border, fontSize: 13, padding: "12px 16px" },
          head: {
            color: colors.muted,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: colors.surfaceMuted,
            whiteSpace: "nowrap",
          },
        },
      },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: 12, borderRadius: 6 } } },
    },
  });
}
