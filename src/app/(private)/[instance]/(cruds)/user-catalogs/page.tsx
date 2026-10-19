"use client";
import { useAuthContext } from "@/app/auth-context";
import { CRM_USER_CATALOGS } from "@/lib/crm-user-catalogs-form";
import { ArrowForward } from "@mui/icons-material";
import { Alert, Box, Button, Card, CardActions, CardContent, Stack, Typography } from "@mui/material";
import Link from "next/link";
export default function UserCatalogsPage() {
  const { instance, user } = useAuthContext();
  if (user?.NIVEL !== "ADMIN") return <Alert severity="warning" sx={{ m: 3 }}>Acesso restrito a administradores.</Alert>;
  return <Box sx={{ p: { xs: 2, md: 3 }, height: "100%", overflow: "auto" }}><Stack spacing={3}><Box><Typography variant="h5" component="h1">Cadastros de usuários</Typography><Typography color="text.secondary">Organize a equipe e os cadastros utilizados no CRM.</Typography></Box><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>{Object.entries(CRM_USER_CATALOGS).map(([catalog, definition]) => <Card key={catalog} variant="outlined"><CardContent><Typography variant="h6">{definition.title}</Typography><Typography color="text.secondary">{definition.description}</Typography></CardContent><CardActions><Button component={Link} href={`/${instance}/user-catalogs/${catalog}`} endIcon={<ArrowForward />}>Abrir cadastro</Button></CardActions></Card>)}</Box></Stack></Box>;
}
