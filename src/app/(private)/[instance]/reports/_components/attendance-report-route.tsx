"use client";

import { useContext } from "react";
import { AuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "../../whatsapp-context";
import { AttendanceReport } from "@/components/reports/AttendanceReport";
import type { AttendanceReportId } from "@/lib/reports/attendance-routes";

export default function AttendanceReportRoute({ report }: { report: AttendanceReportId }) {
  const { instance, token, user } = useContext(AuthContext);
  const { sectors } = useWhatsappContext();
  if (!token || !user) return <p className="p-6">Carregando sessão…</p>;
  const scope = `${instance}:${user.CODIGO}:${report}`;
  return (
    <AttendanceReport
      key={scope}
      report={report}
      instance={instance}
      token={token}
      scope={scope}
      sectors={sectors}
    />
  );
}
