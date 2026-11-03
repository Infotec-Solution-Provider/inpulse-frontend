"use client";
import Link from "next/link";
import { ArrowForward } from "@mui/icons-material";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import type { CrmMarketingRecord } from "@/lib/sdk-local/types/crm-marketing.types";
export const cycleLabels: Record<string, string> = {
  ATIVOS: "Clientes ativos",
  INAT_R: "Inativos recentes",
  INAT_A: "Inativos antigos",
  PROSPE: "Prospecção",
};
export function campaignRole(row: CrmMarketingRecord) {
  return row.OPERATION_MODE === "audience-manual"
    ? "Público definido · geração manual"
    : (cycleLabels[String(row.TIPO)] ?? "Campanha do CRM");
}
export function CampaignStatus({ value }: { value: unknown }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={value === "NAO" ? "success" : "default"}
      label={value === "NAO" ? "Ativa" : value === "SIM" ? "Pausada" : "Situação histórica"}
    />
  );
}
export function CampaignCard({
  campaign,
  instance,
  unitName,
  returnTo,
}: {
  campaign: CrmMarketingRecord;
  instance: string;
  unitName?: string | null;
  returnTo?: string;
}) {
  const url = `/${instance}/crm-campaigns/${campaign.CODIGO}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        gap={2}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component={Link}
            href={url}
            fontWeight={700}
            sx={{
              overflowWrap: "anywhere",
              color: "text.primary",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            {String(campaign.NOME ?? "Campanha sem nome")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {unitName ? `${unitName} · ` : ""}
            {campaignRole(campaign)}
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1} justifyContent="space-between">
          <CampaignStatus value={campaign.PAUSADA} />
          <Button
            component={Link}
            href={url}
            endIcon={<ArrowForward fontSize="small" />}
            aria-label={`Abrir ${campaign.NOME ?? "campanha"}`}
          >
            Abrir
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
