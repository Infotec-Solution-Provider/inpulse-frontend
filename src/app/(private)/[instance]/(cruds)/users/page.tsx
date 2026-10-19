"use client";
import UsersTable from "./(table)/table";
import { useAuthContext } from "@/app/auth-context";
import { Button } from "@mui/material";
import Link from "next/link";

export default function UsersManagementPage() {
  const { instance, user } = useAuthContext();
  return (
    <div className="relative box-border flex h-full w-full min-w-0 flex-col overflow-auto px-4 pt-5 md:px-10">
      {user?.NIVEL === "ADMIN" && <div className="mb-3 flex justify-end"><Button component={Link} href={`/${instance}/user-catalogs`}>Cadastros de usuários</Button></div>}
      <UsersTable />
    </div>
  );
}
