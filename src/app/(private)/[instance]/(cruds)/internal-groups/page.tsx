"use client";
import { AuthContext } from "@/app/auth-context";
import { isExternalOperator } from "@/lib/permissions/operator-access";
import { useContext } from "react";
import InternalGroupsTable from "./(table)/table";

export default function InternalGroupsPage() {
  const { user } = useContext(AuthContext);

  if (isExternalOperator(user?.NIVEL)) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--ip-muted)] text-[var(--ip-text)]">
        Perfil sem acesso a grupos internos.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <InternalGroupsTable />
    </div>
  );
}
