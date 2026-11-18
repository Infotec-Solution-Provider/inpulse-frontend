"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useTelephony } from "@/lib/telephony/telephony-provider";
import { TelephonyHeaderHost } from "@/lib/telephony/header-host";
import { UiIcon } from "@/lib/ui-system/icons";
import { AttendanceViewMenu, type AttendanceViewOptions } from "../attendance-view-menu";
import "./attendance-sidebar.css";
import "./attendance-telephony.css";

interface ConversationSidebarProps {
  integrated?: boolean;
  telephony?: ReactNode;
  filters: ReactNode;
  children: ReactNode;
  viewOptions?: AttendanceViewOptions;
}

export default function ConversationSidebar({
  integrated = false,
  telephony,
  filters,
  children,
  viewOptions,
}: ConversationSidebarProps) {
  const phone = useTelephony();
  const [telephonyExpanded, setTelephonyExpanded] = useState(true);
  const [channel, setChannel] = useState<"all" | "whatsapp" | "phone">("all");
  const contentId = useId();
  const [headerElement, setHeaderElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (phone.busy) setTelephonyExpanded(true);
  }, [phone.busy, phone.state.phase, phone.state.number, phone.state.startedAt]);

  return (
    <aside aria-label="Painel de atendimento" className="attendance-sidebar">
      {integrated && (
        <div className="attendance-channel-filter" role="group" aria-label="Canal da fila">
          {(["all", "whatsapp", "phone"] as const).map((kind) => (
            <button key={kind} type="button" aria-pressed={channel === kind} onClick={() => setChannel(kind)}>
              {{ all: "Todos", whatsapp: "Conversas", phone: "Telefonia" }[kind]}
            </button>
          ))}
        </div>
      )}
      {telephony && (
        <section
          aria-label="Telefonia e próximas ligações"
          className="attendance-sidebar-telephony attendance-telephony-section"
          hidden={integrated && channel === "whatsapp"}
          data-expanded={telephonyExpanded}
        >
          <div className="attendance-telephony-header">
            <button
              type="button"
              className="attendance-telephony-toggle"
              aria-label={
                telephonyExpanded
                  ? "Ocultar telefonia e próxima ligação"
                  : "Mostrar telefonia e próxima ligação"
              }
              aria-expanded={telephonyExpanded}
              aria-controls={contentId}
              onClick={() => setTelephonyExpanded((expanded) => !expanded)}
            >
              <span className="attendance-telephony-title">Telefonia</span>
              <UiIcon
                name="chevronDown"
                scale="metadata"
                className={telephonyExpanded ? "attendance-telephony-chevron-open" : undefined}
              />
            </button>
            <div className="attendance-telephony-actions" ref={setHeaderElement} />
          </div>
          {/* Hidden preserves the slot registration, phone, queue and drawer state. */}
          <div id={contentId} className="attendance-telephony-content" hidden={!telephonyExpanded}>
            <TelephonyHeaderHost.Provider
              value={{ element: headerElement, reveal: () => setTelephonyExpanded(true) }}
            >
              {telephony}
            </TelephonyHeaderHost.Provider>
          </div>
        </section>
      )}
      <div className="attendance-sidebar-conversations" hidden={integrated && channel === "phone"}>
        <div className="attendance-sidebar-filters">{filters}</div>
        <div className="attendance-sidebar-list">{children}</div>
      </div>
      {viewOptions && (
        <footer className="attendance-sidebar-preferences">
          <AttendanceViewMenu options={viewOptions} />
        </footer>
      )}
    </aside>
  );
}
