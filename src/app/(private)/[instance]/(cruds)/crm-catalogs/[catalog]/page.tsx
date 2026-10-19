"use client";
import CrmCatalogManagement from "@/lib/components/crm-catalog-management";
import { isCrmCatalog } from "@/lib/crm-catalogs-form";
import { Alert } from "@mui/material";
import { useParams } from "next/navigation";

export default function CrmCatalogPage() {
  const { catalog } = useParams<{ catalog: string }>();
  return isCrmCatalog(catalog) ? <CrmCatalogManagement catalog={catalog} /> : <Alert severity="warning" sx={{ m: 3 }}>Catálogo não encontrado.</Alert>;
}
