"use client";
import { AuthContext } from "@/app/auth-context";
import { isExternalOperator } from "@/lib/permissions/operator-access";
import { useContext } from "react";
import InternalGroupsTable from "./(table)/table";

export default function InternalGroupsPage() {
  const { user } = useContext(AuthContext);

  if (isExternalOperator(user?.NIVEL)) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-300">
        Perfil sem acesso a grupos internos.
      </div>
    );
  }

  return (
    <div className="relative box-border flex h-screen w-screen flex-col px-10 pt-5">
      <InternalGroupsTable />
    </div>
  );
}
