"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowBack, EditOutlined, Pause, PlayArrow } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { crmError, crmExpected } from "@/lib/crm-marketing-form";
import type { CrmCampaignContext } from "@/lib/sdk-local/types/crm-units.types";
import { CrmMarketingFrame, useCrmMutation, useCrmSession } from "./shared";
import { CampaignStatus, campaignRole } from "./campaign-common";
import CampaignEditor from "./campaign-editor";
import { ConfigurationPanel } from "./configuration";

export default function CrmCampaignDetailPage({
  campaignId,
  initialSection = "summary",
}: {
  campaignId: number;
  initialSection?: string;
}) {
  return (
    <CrmMarketingFrame title="Ficha da campanha">
      <CampaignDetail key={campaignId} campaignId={campaignId} initialSection={initialSection} />
    </CrmMarketingFrame>
  );
}
const sections = ["summary", "audience", "team", "operation"];
function CampaignDetail({
  campaignId,
  initialSection,
}: {
  campaignId: number;
  initialSection: string;
}) {
  const { client, instance } = useCrmSession(),
    router = useRouter(),
    params = useSearchParams(),
    mutation = useCrmMutation();
  const active = sections.indexOf(params.get("section") ?? initialSection),
    section = active < 0 ? 0 : active;
  const [context, setContext] = useState<CrmCampaignContext | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [reload, setReload] = useState(0);
  const current = useRef(client);
  current.current = client;
  useEffect(() => {
    let active = true;
    const started = client;
    setLoading(true);
    setError("");
    void client
      .campaignContext(campaignId)
      .then((data) => {
        if (active && started === current.current) setContext(data);
      })
      .catch((f) => {
        if (active) setError(crmError(f).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, campaignId, reload]);
  function navigateSection(index: number) {
    const next = new URLSearchParams(params.toString());
    if (index) next.set("section", sections[index]);
    else next.delete("section");
    router.replace(`/${instance}/crm-campaigns/${campaignId}?${next}`, { scroll: false });
  }
  const campaign = context?.campaign,
    rawReturn = params.get("returnTo"),
    returnTo = rawReturn?.startsWith(`/${instance}/crm-`)
      ? rawReturn
      : context?.unit
        ? `/${instance}/crm-units/${context.unit.CODIGO}`
        : `/${instance}/crm-campaigns`;
  async function toggle() {
    if (!campaign || !context) return;
    const capability =
      campaign.PAUSADA === "SIM" ? context.capabilities.resume : context.capabilities.pause;
    if (!capability.allowed) return;
    if (
      !window.confirm(
        campaign.PAUSADA === "SIM"
          ? "Retomar esta campanha? Os agendamentos existentes serão preservados."
          : "Pausar esta campanha? Os agendamentos existentes serão preservados.",
      )
    )
      return;
    const result = await mutation.write(async () => {
      const schema = await client.schema("campaigns");
      return client.patch("campaigns", campaign.CODIGO, {
        changes: { PAUSADA: campaign.PAUSADA === "SIM" ? "NAO" : "SIM" },
        expected: crmExpected(schema.fields, campaign),
      });
    });
    if (result) {
      setReload((r) => r + 1);
      mutation.setSuccess(
        result.value.PAUSADA === "SIM" ? "Campanha pausada." : "Campanha retomada.",
      );
    }
  }
  const pauseAction =
    context && campaign
      ? campaign.PAUSADA === "SIM"
        ? context.capabilities.resume
        : context.capabilities.pause
      : null;
  return (
    <Stack gap={3} sx={{ maxWidth: 1120, minWidth: 0 }}>
      <Button
        component={Link}
        href={returnTo}
        startIcon={<ArrowBack />}
        sx={{ alignSelf: "flex-start" }}
      >
        {context?.unit
          ? `Voltar para ${context.unit.DESCRICAO ?? "unidade"}`
          : "Todas as campanhas"}
      </Button>
      {loading && <LinearProgress aria-label="Carregando campanha" />}
      {(error || mutation.error) && <Alert severity="error">{error || mutation.error}</Alert>}
      {mutation.success && <Alert severity="success">{mutation.success}</Alert>}
      {mutation.gate && (
        <Alert severity="warning">
          Confira a campanha antes de outra alteração.{" "}
          <Button
            onClick={() => {
              mutation.reconcile();
              setReload((r) => r + 1);
            }}
          >
            Conferir campanha
          </Button>
        </Alert>
      )}
      {context && campaign && (
        <>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" component="h2" sx={{ overflowWrap: "anywhere" }}>
                {String(campaign.NOME ?? "Campanha sem nome")}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {context.unit?.DESCRICAO ?? "Sem unidade vinculada"} ·{" "}
                {campaignRole({ ...campaign, OPERATION_MODE: context.operationMode })}
              </Typography>
              <Box mt={1}>
                <CampaignStatus value={campaign.PAUSADA} />
              </Box>
            </Box>
            {!editing && (
              <Button
                startIcon={<EditOutlined />}
                onClick={() => setEditing(true)}
                disabled={loading || mutation.busy || mutation.gate}
                sx={{ alignSelf: "flex-start" }}
              >
                Editar dados
              </Button>
            )}
          </Stack>
          {editing && (
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" mb={2}>
                Editar dados da campanha
              </Typography>
              <CampaignEditor
                original={campaign}
                unitName={context.unit?.DESCRICAO}
                renameReason={
                  !context.capabilities.rename.allowed
                    ? context.capabilities.rename.reasons.map((r) => r.message).join(" ")
                    : undefined
                }
                onCancel={() => {
                  setEditing(false);
                  setReload((r) => r + 1);
                }}
                onSaved={() => {
                  setEditing(false);
                  setReload((r) => r + 1);
                  mutation.setSuccess("Dados da campanha atualizados.");
                }}
              />
            </Paper>
          )}
          <Box hidden={editing}>
            <Tabs
              value={section}
              onChange={(_, next) => navigateSection(next)}
              variant="scrollable"
              allowScrollButtonsMobile
              aria-label="Seções da campanha"
            >
              {["Resumo", "Público", "Equipe", "Operação"].map((label, i) => (
                <Tab key={label} label={label} id={`campaign-detail-tab-${i}`} />
              ))}
            </Tabs>
            <Box hidden={section !== 0} role="tabpanel" aria-labelledby="campaign-detail-tab-0">
              <Stack gap={2}>
                {campaign.DESCRICAO && (
                  <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                    {String(campaign.DESCRICAO)}
                  </Typography>
                )}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  {[
                    {
                      name: "Público da campanha",
                      body: campaign.SQL_CAMPANHA
                        ? "Seleção salva. Confira os critérios e a prévia antes de gerar."
                        : "Defina quais clientes devem participar da campanha.",
                      action: "Configurar público",
                      tab: 1,
                    },
                    {
                      name: "Equipe vinculada",
                      body: "Gerencie as pessoas vinculadas. O responsável pelos novos agendamentos é escolhido em cada lote.",
                      action: "Gerenciar equipe",
                      tab: 2,
                    },
                    {
                      name: "Operação",
                      body: "Prepare um lote, revise a quantidade e escolha o responsável pelos novos agendamentos.",
                      action: "Preparar lote",
                      tab: 3,
                    },
                  ].map((item) => (
                    <Paper variant="outlined" key={item.name} sx={{ p: 2 }}>
                      <Typography fontWeight={700}>{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary" mt={1} mb={1}>
                        {item.body}
                      </Typography>
                      <Button onClick={() => navigateSection(item.tab)}>{item.action}</Button>
                    </Paper>
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Código {campaign.CODIGO}
                  {campaign.TIPO ? ` · Papel legado: ${campaign.TIPO}` : ""} · Salvar dados ou
                  público não ativa a campanha nem gera agendamentos.
                </Typography>
              </Stack>
            </Box>
            <Box hidden={section === 0}>
              <ConfigurationPanel
                onChanged={() => setReload((value) => value + 1)}
                campaignId={campaignId}
                sectionOverride={Math.max(0, section - 1)}
                hideTabs
              />
            </Box>
            {section === 3 && (
              <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack gap={1.5}>
                  <Typography variant="h6">Situação da campanha</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pausar ou retomar preserva os agendamentos existentes. A geração de novos
                    agendamentos é uma operação separada.
                  </Typography>
                  {pauseAction?.reasons.map((reason) => (
                    <Alert key={reason.code} severity="info">
                      {reason.message}
                    </Alert>
                  ))}
                  <Button
                    startIcon={campaign.PAUSADA === "SIM" ? <PlayArrow /> : <Pause />}
                    disabled={loading || mutation.busy || mutation.gate || !pauseAction?.allowed}
                    onClick={() => void toggle()}
                    variant="outlined"
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {campaign.PAUSADA === "SIM" ? "Retomar campanha" : "Pausar campanha"}
                  </Button>
                </Stack>
              </Paper>
            )}
          </Box>
        </>
      )}
    </Stack>
  );
}
