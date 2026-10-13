import type { ReactNode } from "react";

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
    <aside
      aria-label="Painel de atendimento"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-200 text-black dark:bg-slate-800 dark:text-slate-300 md:rounded-md md:shadow-md"
    >
      {telephony && (
        <div
          aria-label="Telefonia e próximas ligações"
          className="max-h-[45%] shrink-0 space-y-3 overflow-y-auto border-b border-slate-300/80 py-3 dark:border-slate-700"
        >
          {telephony}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="max-h-[65%] shrink-0 overflow-y-auto">{filters}</div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </aside>
  );
}
