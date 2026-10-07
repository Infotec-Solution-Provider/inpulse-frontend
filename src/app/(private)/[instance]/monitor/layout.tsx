"use client";

import { useAuthContext } from "@/app/auth-context";

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  if (!user)
    return (
      <p role="status" className="p-6 text-sm text-slate-500">
        Carregando permissões...
      </p>
    );
  if (user.NIVEL !== "ADMIN")
    return (
      <p role="alert" className="p-6 text-sm text-slate-500 dark:text-slate-300">
        A monitoria está disponível apenas para administradores.
      </p>
    );
  return <>{children}</>;
}
