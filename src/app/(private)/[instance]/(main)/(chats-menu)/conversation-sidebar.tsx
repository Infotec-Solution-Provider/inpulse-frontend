"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useTelephony } from "@/lib/telephony/telephony-provider";
import { callPhaseLabels } from "@/lib/telephony/types";
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
  const statusId = useId();
  const connectionLabels = {
    disconnected: "Desconectado",
    connecting: "Conectando",
    ready: "Ramal conectado",
    error: "Sem conexão",
  };
  const statusLabel = phone.busy
    ? callPhaseLabels[phone.state.phase]
    : connectionLabels[phone.state.connection];

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
            aria-describedby={statusId}
            onClick={() => setTelephonyExpanded((expanded) => !expanded)}
          >
            <UiIcon name="phone" scale="metadata" />
            <span className="attendance-telephony-title">Telefonia</span>
            <span id={statusId} className="attendance-telephony-status" role="status">
              {statusLabel}
            </span>
            <UiIcon
              name="chevronDown"
              scale="metadata"
              className={telephonyExpanded ? "attendance-telephony-chevron-open" : undefined}
            />
          </button>
          {/* Hidden preserves the slot registration, phone, queue and drawer state. */}
          <div id={contentId} className="attendance-telephony-content" hidden={!telephonyExpanded}>
            {telephony}
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
