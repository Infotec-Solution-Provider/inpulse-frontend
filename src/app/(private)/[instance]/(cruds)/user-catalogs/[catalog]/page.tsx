"use client";
import CrmUserCatalogManagement from "@/lib/components/crm-user-catalog-management";
import { isCrmUserCatalog } from "@/lib/crm-user-catalogs-form";
import { Alert } from "@mui/material";
import { useParams } from "next/navigation";
export default function UserCatalogPage() { const { catalog } = useParams<{ catalog: string }>(); return isCrmUserCatalog(catalog) ? <CrmUserCatalogManagement catalog={catalog} /> : <Alert severity="warning" sx={{ m: 3 }}>Cadastro de usuários não encontrado.</Alert>; }
