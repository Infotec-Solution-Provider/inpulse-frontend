import type { ReactNode } from "react";
import "./attendance-sidebar.css";

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
  return (
    <aside aria-label="Painel de atendimento" className="attendance-sidebar">
      {telephony && (
        <div aria-label="Telefonia e próximas ligações" className="attendance-sidebar-telephony">
          {telephony}
        </div>
      )}
      <div className="attendance-sidebar-conversations">
        <div className="attendance-sidebar-filters">{filters}</div>
        <div className="attendance-sidebar-list">{children}</div>
      </div>
    </aside>
  );
}
