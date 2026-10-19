"use client";
import { useAuthContext } from "@/app/auth-context";
import { UserRole } from "@/lib/sdk-local";
import { Button } from "@mui/material";
import Link from "next/link";
import CustomersTable from "./(table)/table";

export default function CustomersManagementPage() {
  const { user, instance } = useAuthContext();
  return (
    <div className="relative box-border flex h-screen w-screen flex-col px-10 pt-5">
      {user?.NIVEL === UserRole.ADMIN && (
        <div className="mb-3 flex justify-end">
          <Button component={Link} href={`/${instance}/customer-segments`} size="small">
            Cadastros auxiliares · Segmentos
          </Button>
        </div>
      )}
      <CustomersTable />
    </div>
  );
}
