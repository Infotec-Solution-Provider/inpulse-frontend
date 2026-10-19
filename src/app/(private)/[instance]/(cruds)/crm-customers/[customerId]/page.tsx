"use client";
import CustomerCrmManagement from "@/lib/components/crm-customer-management";
import { Alert } from "@mui/material";
import { useParams } from "next/navigation";
export default function CustomerCrmPage() {
  const { customerId } = useParams<{ customerId: string }>();
  if (!/^(?:0|-?[1-9]\d*)$/.test(customerId) || Number(customerId) < -2147483648 || Number(customerId) > 2147483647) return <Alert severity="warning" sx={{ m: 3 }}>Código de cliente inválido.</Alert>;
  return <CustomerCrmManagement customerId={Number(customerId)} />;
}
