"use client";

import { useContext } from "react";
import { AuthContext } from "@/app/auth-context";
import { MessagesPerOperatorReport } from "@/components/reports/MessagesPerOperatorReport";

export default function MessagesPerOperatorPage() {
  const { instance, token, user } = useContext(AuthContext);
  if (!token || !user) return <p className="p-6">Carregando sessão…</p>;
  const scope = `${instance}:${user.CODIGO}`;
  return <MessagesPerOperatorReport key={scope} instance={instance} token={token} scope={scope} />;
}
