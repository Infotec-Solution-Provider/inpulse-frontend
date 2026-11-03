"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Add, ArrowBack } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { CrmMarketingFrame, useCrmSession } from "./shared";
import type { CrmMarketingRecord } from "@/lib/sdk-local/types/crm-marketing.types";
import type { CrmUnit } from "@/lib/sdk-local/types/crm-units.types";
import { crmError } from "@/lib/crm-marketing-form";
import { CampaignCard } from "./campaign-common";
import CampaignEditor from "./campaign-editor";

export default function CrmCampaignsPage({ create = false }: { create?: boolean }) {
  return (
    <CrmMarketingFrame title="Unidades e campanhas">
      <CampaignsPanel create={create} />
    </CrmMarketingFrame>
  );
}
function CampaignsPanel({ create }: { create: boolean }) {
  const { client, instance } = useCrmSession(),
    router = useRouter(),
    params = useSearchParams(),
    base = `/${instance}/crm-campaigns`;
  const filter = params.get("q") ?? "",
    unit = params.get("unit") ?? "",
    paused = params.get("paused") ?? "",
    page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(filter),
    [rows, setRows] = useState<CrmMarketingRecord[]>([]),
    [units, setUnits] = useState<CrmUnit[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [total, setTotal] = useState(0);
  useEffect(() => {
    let active = true;
    void client
      .units()
      .then((result) => {
        if (active) setUnits(result.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [client]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void client
      .list("campaigns", {
        page,
        perPage: 20,
        NOME: filter,
        ...(unit ? { UNIDADE: unit } : {}),
        ...(paused ? { PAUSADA: paused } : {}),
        sortBy: "NOME",
        sortDirection: "asc",
      })
      .then((result) => {
        if (active) {
          setRows(result.data);
          setTotal(result.page.totalRows);
        }
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
  }, [client, page, filter, unit, paused]);
  useEffect(() => setDraft(filter), [filter]);
  function query(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    router.replace(`${base}?${next}`, { scroll: false });
  }
  const returnTo = `${base}${params.toString() ? `?${params}` : ""}`;
  if (create)
    return (
      <Stack gap={3} sx={{ maxWidth: 900 }}>
        <Button
          component={Link}
          href={base}
          startIcon={<ArrowBack />}
          sx={{ alignSelf: "flex-start" }}
        >
          Todas as campanhas
        </Button>
        <Typography variant="h5" component="h2">
          Nova campanha
        </Typography>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
          <CampaignEditor
            onCancel={() => router.push(base)}
            onSaved={(campaign) =>
              router.push(`${base}/${campaign.CODIGO}?returnTo=${encodeURIComponent(base)}`)
            }
          />
        </Paper>
      </Stack>
    );
  return (
    <Stack gap={3} sx={{ maxWidth: 1120, minWidth: 0 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5" component="h2">
            Todas as campanhas
          </Typography>
          <Typography color="text.secondary" mt={1}>
            Localize campanhas de qualquer unidade e abra a mesma ficha de configuração.
          </Typography>
        </Box>
        <Button
          variant="contained"
          component={Link}
          href={`${base}/new`}
          startIcon={<Add />}
          sx={{ alignSelf: { sm: "flex-start" }, whiteSpace: "nowrap" }}
        >
          Nova campanha
        </Button>
      </Stack>
      <Tabs value={1} aria-label="Visão das campanhas">
        <Tab label="Por unidade" component={Link} href={`/${instance}/crm-units`} />
        <Tab label="Todas as campanhas" />
      </Tabs>
      <Stack direction={{ xs: "column", md: "row" }} gap={2} alignItems={{ md: "flex-start" }}>
        <Stack
          component="form"
          direction="row"
          gap={1}
          onSubmit={(e) => {
            e.preventDefault();
            query({ q: draft, page: "" });
          }}
          sx={{ flex: 2, minWidth: 0 }}
        >
          <TextField
            label="Buscar campanha pelo nome"
            size="small"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <Button type="submit" variant="outlined">
            Buscar
          </Button>
        </Stack>
        <TextField
          select
          label="Unidade"
          size="small"
          value={unit}
          onChange={(e) => query({ unit: e.target.value, page: "" })}
          sx={{ flex: 1, minWidth: { md: 200 } }}
        >
          <MenuItem value="">Todas as unidades</MenuItem>
          {units.map((u) => (
            <MenuItem key={u.CODIGO} value={String(u.CODIGO)}>
              {u.DESCRICAO ?? `Unidade ${u.CODIGO}`}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Situação"
          size="small"
          value={paused}
          onChange={(e) => query({ paused: e.target.value, page: "" })}
          sx={{ flex: 1, minWidth: { md: 160 } }}
        >
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="NAO">Ativas</MenuItem>
          <MenuItem value="SIM">Pausadas</MenuItem>
        </TextField>
      </Stack>
      {loading && <LinearProgress aria-label="Carregando campanhas" />}
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="body2" color="text.secondary">
        {total.toLocaleString("pt-BR")} {total === 1 ? "campanha" : "campanhas"}
      </Typography>
      <Stack gap={1.5}>
        {rows.map((row) => (
          <CampaignCard
            key={row.CODIGO}
            campaign={{ ...row, OPERATION_MODE: row.operationMode ?? null }}
            instance={instance}
            unitName={String(
              row.unitName ??
                units.find((u) => u.CODIGO === Number(row.UNIDADE))?.DESCRICAO ??
                "Sem unidade vinculada",
            )}
            returnTo={returnTo}
          />
        ))}
      </Stack>
      {!loading && !error && !rows.length && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6">Nenhuma campanha encontrada</Typography>
          <Typography color="text.secondary" mt={1}>
            Ajuste a busca ou crie uma campanha para começar.
          </Typography>
        </Paper>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Button disabled={page <= 1 || loading} onClick={() => query({ page: String(page - 1) })}>
          Anterior
        </Button>
        <Typography variant="body2">
          Página {page} de {Math.max(1, Math.ceil(total / 20))}
        </Typography>
        <Button
          disabled={page * 20 >= total || loading}
          onClick={() => query({ page: String(page + 1) })}
        >
          Próxima
        </Button>
      </Stack>
    </Stack>
  );
}
