"use client";

import { createContext } from "react";

export const TelephonyHeaderHost = createContext<{
  element: HTMLDivElement | null;
  reveal: () => void;
} | null>(null);
