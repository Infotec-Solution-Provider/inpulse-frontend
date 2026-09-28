"use client";

import { Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/app/auth-context";
import { MonitorProvider } from "./context";
import ConversationMonitor from "./conversations";
import TelephonyMonitor from "./telephony/components/telephony-monitor";

export default function MonitorPage() {
  const { instance, user } = useAuthContext();
  const scope = instance && user ? `${encodeURIComponent(instance)}:${user.CODIGO}` : "anonymous";
  return <ScopedMonitorPage key={scope} scope={scope} />;
}

function ScopedMonitorPage({ scope }: { scope: string }) {
  const storageKey = `monitor_tab:v1:${scope}`;
  const [tab, setTab] = useState<"conversations" | "telephony">("conversations");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setTab(localStorage.getItem(storageKey) === "telephony" ? "telephony" : "conversations");
    } catch {
      setTab("conversations");
    }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (!ready || scope === "anonymous") return;
    try {
      localStorage.setItem(storageKey, tab);
    } catch {
      // Storage is optional; both views remain usable without it.
    }
  }, [ready, scope, storageKey, tab]);

  // Keep the server and first client render identical; restored tabs must not
  // briefly start requests for a different channel during hydration.
  if (!ready)
    return (
      <p role="status" className="p-5 text-sm text-slate-500">
        Carregando monitoria…
      </p>
    );

  return (
    <div className="flex min-h-full w-full min-w-0 flex-col lg:h-full lg:min-h-0">
      <Tabs
        aria-label="Canal da monitoria"
        value={tab}
        onChange={(_event, value: "conversations" | "telephony") => setTab(value)}
        className="mx-3 shrink-0 border-b border-slate-200 dark:border-slate-700 md:mx-5"
      >
        <Tab
          id="monitor-tab-conversations"
          aria-controls="monitor-panel-conversations"
          value="conversations"
          label="Conversas"
        />
        <Tab
          id="monitor-tab-telephony"
          aria-controls="monitor-panel-telephony"
          value="telephony"
          label="Telefonia"
        />
      </Tabs>
      <div
        role="tabpanel"
        id={`monitor-panel-${tab}`}
        aria-labelledby={`monitor-tab-${tab}`}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        {tab === "conversations" ? (
          <MonitorProvider>
            <ConversationMonitor />
          </MonitorProvider>
        ) : (
          <TelephonyMonitor />
        )}
      </div>
    </div>
  );
}
