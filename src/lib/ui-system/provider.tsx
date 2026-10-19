"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import { createPilotTheme } from "./theme";
import { uiCssVariables } from "./tokens";
import "./pilot.css";

const PilotPortalContext = createContext<(() => HTMLElement | null) | undefined>(undefined);
export const usePilotPortal = () => useContext(PilotPortalContext);

/** Scoped adoption: the legacy app retains its theme; pilot portals inherit this scope. */
export function PilotDesignProvider({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const outerTheme = useTheme();
  const mode = outerTheme.palette.mode;
  const root = useRef<HTMLDivElement>(null);
  const container = useMemo(() => () => root.current, []);
  const theme = useMemo(() => createPilotTheme(mode, container), [mode, container]);
  return (
    <ThemeProvider theme={theme}>
      <PilotPortalContext.Provider value={container}>
        <div
          ref={root}
          className={`ip-ui ${className}`}
          data-ui-theme={mode}
          style={{ ...uiCssVariables(mode), ...style } as CSSProperties}
        >
          {children}
        </div>
      </PilotPortalContext.Provider>
    </ThemeProvider>
  );
}
