"use client";
import { useAuthContext } from "@/app/auth-context";
import { CRM_CATALOGS } from "@/lib/crm-catalogs-form";
import { UserRole } from "@/lib/sdk-local";
import { ArrowForward } from "@mui/icons-material";
import { Alert, Box, Button, Card, CardActions, CardContent, Stack, Typography } from "@mui/material";
import Link from "next/link";

export default function CrmCatalogsPage() {
  const { instance, user } = useAuthContext();
  if (user?.NIVEL !== UserRole.ADMIN) return <Alert severity="warning" sx={{ m: 3 }}>Acesso restrito a administradores.</Alert>;
  return <Box sx={{ p: { xs: 2, md: 3 }, height: "100%", overflow: "auto" }}><Stack spacing={3}>
    <Box><Typography variant="h5" component="h1">Cadastros auxiliares</Typography><Typography color="text.secondary">Organize os dados utilizados no CRM.</Typography></Box>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
      <Card variant="outlined"><CardContent><Typography variant="h6">Segmentos</Typography><Typography color="text.secondary">Organize os segmentos associados aos clientes.</Typography></CardContent><CardActions><Button component={Link} href={`/${instance}/customer-segments`} endIcon={<ArrowForward />}>Abrir segmentos</Button></CardActions></Card>
      {Object.entries(CRM_CATALOGS).map(([catalog, definition]) => <Card key={catalog} variant="outlined"><CardContent><Typography variant="h6">{definition.title}</Typography><Typography color="text.secondary">{definition.description}</Typography></CardContent><CardActions><Button component={Link} href={`/${instance}/crm-catalogs/${catalog}`} endIcon={<ArrowForward />}>Abrir {definition.title.toLocaleLowerCase("pt-BR")}</Button></CardActions></Card>)}
    </Box>
  </Stack></Box>;
}
