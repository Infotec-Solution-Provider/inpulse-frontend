"use client";

import { useContext } from "react";
import { Alert } from "@mui/material";
import { AuthContext } from "@/app/auth-context";
import { CallAbcReport } from "@/components/reports/CallAbcReport";
import { UserRole } from "@/lib/sdk-local";

export default function CallAbcPage() {
  const { instance, user, token } = useContext(AuthContext);
  if (!token || !user) return <p className="p-6">Carregando sessão…</p>;
  if (user.NIVEL !== UserRole.ADMIN)
    return <Alert severity="warning">Acesso restrito a administradores.</Alert>;
  const scope = `${instance}:${user.CODIGO}:call-abc`;
  return <CallAbcReport key={scope} scope={scope} instance={instance} token={token} />;
}
