"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useTelephony } from "@/lib/telephony/telephony-provider";
import { TelephonyHeaderHost } from "@/lib/telephony/header-host";
import { UiIcon } from "@/lib/ui-system/icons";
import "./attendance-sidebar.css";
import "./attendance-telephony.css";

interface ConversationSidebarProps {
  telephony?: ReactNode;
  filters: ReactNode;
  children: ReactNode;
}

export default function ConversationSidebar({
  telephony,
  filters,
  children,
}: ConversationSidebarProps) {
  const phone = useTelephony();
  const [telephonyExpanded, setTelephonyExpanded] = useState(true);
  const contentId = useId();
  const [headerElement, setHeaderElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (phone.busy) setTelephonyExpanded(true);
  }, [phone.busy, phone.state.phase, phone.state.number, phone.state.startedAt]);

  return (
    <aside aria-label="Painel de atendimento" className="attendance-sidebar">
      {telephony && (
        <section
          aria-label="Telefonia e próximas ligações"
          className="attendance-sidebar-telephony attendance-telephony-section"
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
      <div className="attendance-sidebar-conversations">
        <div className="attendance-sidebar-filters">{filters}</div>
        <div className="attendance-sidebar-list">{children}</div>
      </div>
    </aside>
  );
}
