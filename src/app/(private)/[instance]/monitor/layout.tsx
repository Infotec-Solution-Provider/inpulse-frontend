"use client";

import { MonitorProvider } from "./context";

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MonitorProvider>{children}</MonitorProvider>
    </>
  );
}
