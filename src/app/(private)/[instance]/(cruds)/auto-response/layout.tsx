"use client";
import { ReactNode } from "react";
import AutoResponseProvider from "./auto-response.context";

export default function AutoResponseLayout({ children }: { children: ReactNode }) {
  return (
    <AutoResponseProvider>
      {children}
    </AutoResponseProvider>
  );
}

