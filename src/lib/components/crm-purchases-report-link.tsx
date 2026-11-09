"use client";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import { useAuthContext } from "@/app/auth-context";
import { Button } from "@mui/material";
import Link from "next/link";
export default function CrmPurchasesReportLink() {
  const { instance, user } = useAuthContext();
  const { parameters } = useWhatsappContext();
  return user?.NIVEL === "ADMIN" && isFeatureEnabled(parameters, FEATURE_FLAGS.crmSales) ? (
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
