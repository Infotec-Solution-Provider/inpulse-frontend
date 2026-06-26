"use client";

import { useContext, useMemo } from "react";
import { AuthContext } from "@/app/auth-context";

const REPORTS_URL = process.env["NEXT_PUBLIC_REPORTS_URL"] || "http://localhost:8006";

export default function MailingAnalysisPage() {
  const { token } = useContext(AuthContext);

  const src = useMemo(() => {
    if (!token) return "";
    return `${REPORTS_URL}/api/reports/pages/mailing-analysis?token=${encodeURIComponent(token)}`;
  }, [token]);

  if (!token) {
    return <div className="p-6 text-sm text-slate-500">Carregando sessao...</div>;
  }

  return (
    <div className="h-[calc(100vh-1px)] w-full bg-white dark:bg-slate-950">
      <iframe
        title="Analise de Mailing"
        src={src}
        className="h-full w-full border-0"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
