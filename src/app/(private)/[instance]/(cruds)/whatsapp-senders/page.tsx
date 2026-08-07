"use client";

import { AuthContext } from "@/app/auth-context";
import { UserRole } from "@/lib/sdk-local";
import { useContext } from "react";
import WhatsappSendersPanel from "./whatsapp-senders-panel";

export default function WhatsappSendersPage() {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <div className="p-8 text-sm text-slate-500">Carregando permissões...</div>;
  }

  if (user.NIVEL !== UserRole.ADMIN) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-300">
        Acesso restrito a administradores.
      </div>
    );
  }

  return <WhatsappSendersPanel />;
}
