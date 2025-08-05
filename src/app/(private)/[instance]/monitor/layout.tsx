"use client";

import { MonitorProvider } from "./monitor-context";

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MonitorProvider>{children}</MonitorProvider>
    </>
  );
}
