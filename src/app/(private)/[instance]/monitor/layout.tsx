"use client";

import { MonitorProvider } from "./context";
import ReadyMessagesProvider from "../(cruds)/ready-messages/ready-messages-context";

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ReadyMessagesProvider>
        <MonitorProvider>{children}</MonitorProvider>
      </ReadyMessagesProvider>
    </>
  );
}
