"use client";
import { useAuthContext } from "@/app/auth-context";
import { Button } from "@mui/material";
import Link from "next/link";
export default function CrmPurchasesReportLink() {
  const { instance, user } = useAuthContext();
  return user?.NIVEL === "ADMIN" ? (
    <Button
      component={Link}
      href={`/${instance}/crm-purchases`}
      variant="outlined"
      sx={{ justifySelf: "start" }}
    >
      Lançamentos de vendas
    </Button>
  ) : null;
}
