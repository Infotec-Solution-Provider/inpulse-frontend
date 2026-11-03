"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import Link from "next/link";
import { CrmMarketingFrame, useCrmMutation, useCrmSession } from "./shared";
import { crmError } from "@/lib/crm-marketing-form";
import {
  crmCampaignTypes,
  type CrmCampaignType,
  type CrmUnit,
  type CrmUnitDetail,
  type CrmUnitList,
} from "@/lib/sdk-local/types/crm-units.types";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";

type DraftCampaign = { TIPO: CrmCampaignType; CODIGO: string; NOME: string; MAX_RESPOSTA: string };
type Draft = {
  CODIGO: string;
  DESCRICAO: string;
  INATIVOS_RECENTES: string;
  INATIVOS_ANTIGOS: string;
  campaigns: DraftCampaign[];
};
const empty = (): Draft => ({
  CODIGO: "",
  DESCRICAO: "",
  INATIVOS_RECENTES: "",
  INATIVOS_ANTIGOS: "",
  campaigns: [],
});
export default function CrmUnitsPage() {
  return (
    <CrmMarketingFrame title="Unidades">
      <UnitsPanel />
    </CrmMarketingFrame>
  );
}
function UnitsPanel() {
  const { client, instance } = useCrmSession(),
    mutation = useCrmMutation();
  const [list, setList] = useState<CrmUnitList["data"]>([]),
    [selected, setSelected] = useState<CrmUnitDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [dirty, setDirty] = useState(false),
    [add, setAdd] = useState<DraftCampaign | null>(null);
  const sequence = useRef(0),
    alive = useRef(true);
  const locked = loading || mutation.busy || mutation.gate;
  useCrmLeaveGuard(dirty, mutation.busy, mutation.gate);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      sequence.current++;
    };
  }, []);
  async function load(id?: number) {
    const version = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const result = await client.units();
      const detail =
        id === undefined || !result.data.some((u) => u.CODIGO === id)
          ? null
          : await client.unit(id);
      if (!alive.current || version !== sequence.current) return;
      setList(result.data);
      setSelected(detail);
      setDraft(
        detail
          ? {
              ...empty(),
              ...Object.fromEntries(
                Object.entries(detail.data).map(([k, v]) => [k, v == null ? "" : String(v)]),
              ),
            }
          : null,
      );
      setAdd(null);
      setDirty(false);
      mutation.reconcile();
    } catch (failure) {
      if (alive.current && version === sequence.current) setError(crmError(failure).message);
    } finally {
      if (alive.current && version === sequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [instance]); // Token renewal preserves drafts; the frame remounts on tenant/user changes.
  function change(key: keyof Omit<Draft, "campaigns">, value: string) {
    setDraft((d) => d && { ...d, [key]: value });
    setDirty(true);
  }
  function number(value: string) {
    if (!/^[1-9]\d*$/.test(value) || Number(value) > 2147483647)
      throw new Error("Informe códigos, limites e períodos inteiros positivos.");
    return Number(value);
  }
  function campaign(c: DraftCampaign) {
    if (!c.NOME.trim()) throw new Error("Informe o nome de cada campanha.");
    return {
      CODIGO: number(c.CODIGO),
      NOME: c.NOME.trim(),
      TIPO: c.TIPO,
      MAX_RESPOSTA: number(c.MAX_RESPOSTA),
      PAUSADA: "SIM",
    };
  }
  async function save() {
    if (!draft) return;
    try {
      if (!draft.DESCRICAO.trim()) throw new Error("Informe a descrição da unidade.");
      if (selected) {
        const result = await mutation.write(() =>
          client.patchUnit(
            selected.data.CODIGO,
            { DESCRICAO: draft.DESCRICAO.trim() },
            selected.data,
          ),
        );
        if (result) {
          await load(selected.data.CODIGO);
          mutation.setSuccess("Unidade atualizada.");
        }
      } else {
        const fields: CrmUnit = {
          CODIGO: number(draft.CODIGO),
          DESCRICAO: draft.DESCRICAO.trim(),
          INATIVOS_RECENTES: number(draft.INATIVOS_RECENTES),
          INATIVOS_ANTIGOS: number(draft.INATIVOS_ANTIGOS),
        };
        if (fields.INATIVOS_RECENTES! >= fields.INATIVOS_ANTIGOS!)
          throw new Error("O início dos inativos antigos deve ser maior que o dos recentes.");
        const campaigns = draft.campaigns.map(campaign);
        if (new Set(campaigns.map((c) => c.CODIGO)).size !== campaigns.length)
          throw new Error("Use códigos diferentes para cada campanha.");
        const result = await mutation.write(() => client.createUnit({ fields, campaigns }));
        if (result) {
          await load(result.value.CODIGO);
          mutation.setSuccess("Unidade e campanhas gravadas. As novas campanhas estão pausadas.");
        }
      }
    } catch (failure) {
      mutation.setError((failure as Error).message);
    }
  }
  async function include() {
    if (!selected || !add) return;
    try {
      const payload = { ...campaign(add), UNIDADE: selected.data.CODIGO };
      const result = await mutation.write(() => client.create("campaigns", payload));
      if (result) {
        await load(selected.data.CODIGO);
        mutation.setSuccess("Campanha incluída e pausada.");
      }
    } catch (failure) {
      mutation.setError((failure as Error).message);
    }
  }
  function campaignEditor(c: DraftCampaign, update: (next: DraftCampaign) => void) {
    return (
      <Stack key={c.TIPO} gap={1} sx={{ border: 1, borderColor: "divider", p: 2, borderRadius: 1 }}>
        <Typography fontWeight={600}>{c.TIPO}</Typography>
        <TextField
          label={`Código ${c.TIPO}`}
          value={c.CODIGO}
          onChange={(e) => update({ ...c, CODIGO: e.target.value })}
          disabled={locked}
        />
        <TextField
          label={`Nome ${c.TIPO}`}
          value={c.NOME}
          onChange={(e) => update({ ...c, NOME: e.target.value })}
          disabled={locked}
          inputProps={{ maxLength: 150 }}
        />
        <TextField
          label={`Limite de respostas ${c.TIPO}`}
          value={c.MAX_RESPOSTA}
          onChange={(e) => update({ ...c, MAX_RESPOSTA: e.target.value })}
          disabled={locked}
        />
      </Stack>
    );
  }
  return (
    <Stack gap={2} sx={{ maxWidth: 1050 }}>
      <Alert severity="info">
        O nome identifica a campanha; o tipo mantém a regra de público. Novas campanhas são criadas
        pausadas. Composições incompletas não podem ser ativadas até a definição da distribuição e
        recompra.
      </Alert>
      {(error || mutation.error) && <Alert severity="error">{error || mutation.error}</Alert>}
      {mutation.success && <Alert severity="success">{mutation.success}</Alert>}
      {mutation.gate && (
        <Alert severity="warning">
          Confira os dados antes de gravar novamente. O rascunho foi mantido.
        </Alert>
      )}
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button
          disabled={locked || dirty}
          onClick={() => {
            setSelected(null);
            setDraft(empty());
            setAdd(null);
          }}
        >
          Nova unidade
        </Button>
        <Button
          disabled={mutation.busy}
          onClick={() => {
            if (!dirty || window.confirm("Descartar o rascunho e conferir os dados gravados?"))
              void load(
                selected?.data.CODIGO ??
                  (draft?.CODIGO && /^\d+$/.test(draft.CODIGO) ? Number(draft.CODIGO) : undefined),
              );
          }}
        >
          Recarregar unidades
        </Button>
        <Button component={Link} href={`/${instance}/crm-campaigns`}>
          Editar campanhas e situação
        </Button>
        <Button component={Link} href={`/${instance}/crm-ordering`}>
          Organizar prioridades
        </Button>
      </Stack>
      {loading && <LinearProgress aria-label="Carregando unidades" />}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "280px minmax(0,1fr)" },
          gap: 3,
        }}
      >
        <Stack gap={1}>
          {list.map((unit) => (
            <Button
              sx={{ justifyContent: "start", textAlign: "left" }}
              key={unit.CODIGO}
              disabled={locked || dirty}
              variant={selected?.data.CODIGO === unit.CODIGO ? "contained" : "outlined"}
              onClick={() => void load(unit.CODIGO)}
            >
              {unit.CODIGO} · {unit.DESCRICAO ?? "Sem descrição"} ({unit.campaignCount})
            </Button>
          ))}
          {!loading && !list.length && <Typography>Nenhuma unidade cadastrada.</Typography>}
        </Stack>
        {draft && (
          <Stack gap={2}>
            <Typography variant="h6">{selected ? "Editar unidade" : "Nova unidade"}</Typography>
            <TextField
              label="Código da unidade"
              value={draft.CODIGO}
              disabled={Boolean(selected) || locked}
              onChange={(e) => change("CODIGO", e.target.value)}
            />
            <TextField
              label="Descrição da unidade"
              value={draft.DESCRICAO}
              disabled={locked}
              onChange={(e) => change("DESCRICAO", e.target.value)}
              inputProps={{ maxLength: 50 }}
            />
            <TextField
              label="Inativos recentes a partir de (dias)"
              value={draft.INATIVOS_RECENTES}
              disabled={Boolean(selected) || locked}
              onChange={(e) => change("INATIVOS_RECENTES", e.target.value)}
            />
            <TextField
              label="Inativos antigos a partir de (dias)"
              value={draft.INATIVOS_ANTIGOS}
              disabled={Boolean(selected) || locked}
              onChange={(e) => change("INATIVOS_ANTIGOS", e.target.value)}
            />
            {!selected && (
              <>
                <Typography>
                  Campanhas iniciais: {draft.campaigns.length}. Escolha somente os tipos
                  necessários.
                </Typography>
                {crmCampaignTypes.map((type) => (
                  <Box key={type}>
                    <FormControlLabel
                      label={`Incluir ${type}`}
                      control={
                        <Checkbox
                          checked={draft.campaigns.some((c) => c.TIPO === type)}
                          disabled={locked}
                          onChange={(_, checked) => {
                            setDirty(true);
                            setDraft(
                              (d) =>
                                d && {
                                  ...d,
                                  campaigns: checked
                                    ? [
                                        ...d.campaigns,
                                        { TIPO: type, CODIGO: "", NOME: "", MAX_RESPOSTA: "300" },
                                      ]
                                    : d.campaigns.filter((c) => c.TIPO !== type),
                                },
                            );
                          }}
                        />
                      }
                    />
                    {draft.campaigns
                      .filter((c) => c.TIPO === type)
                      .map((c) =>
                        campaignEditor(c, (next) => {
                          setDirty(true);
                          setDraft(
                            (d) =>
                              d && {
                                ...d,
                                campaigns: d.campaigns.map((old) =>
                                  old.TIPO === type ? next : old,
                                ),
                              },
                          );
                        }),
                      )}
                  </Box>
                ))}
              </>
            )}
            <Button
              variant="contained"
              disabled={locked || Boolean(add)}
              onClick={() => void save()}
            >
              Salvar unidade
            </Button>
            {selected && (
              <>
                <Typography variant="h6">Campanhas desta unidade</Typography>
                <Typography variant="caption">
                  Períodos existentes são preservados. A alteração da regra e a exclusão de
                  campanhas vinculadas dependem da definição de redistribuição.
                </Typography>
                {selected.campaigns.map((c) => (
                  <Stack key={c.CODIGO} gap={1} sx={{ border: 1, borderColor: "divider", p: 2 }}>
                    <Typography>
                      {c.CODIGO} · {c.NOME} · {c.TIPO} ·{" "}
                      {c.PAUSADA === "SIM"
                        ? "Pausada"
                        : c.PAUSADA === "NAO"
                          ? "Ativa"
                          : "Situação legada"}
                    </Typography>
                    <Button
                      component={Link}
                      href={`/${instance}/crm-campaigns/${c.CODIGO}/configure`}
                    >
                      Configurar público de {c.NOME}
                    </Button>
                  </Stack>
                ))}
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {crmCampaignTypes
                    .filter((t) => !selected.campaigns.some((c) => c.TIPO === t))
                    .map((t) => (
                      <Button
                        key={t}
                        disabled={locked || dirty}
                        onClick={() => {
                          setAdd({ TIPO: t, CODIGO: "", NOME: "", MAX_RESPOSTA: "300" });
                          setDirty(true);
                        }}
                      >
                        Adicionar {t}
                      </Button>
                    ))}
                </Stack>
                {add && (
                  <>
                    {campaignEditor(add, (next) => {
                      setAdd(next);
                      setDirty(true);
                    })}
                    <Button disabled={locked} onClick={() => void include()}>
                      Salvar nova campanha
                    </Button>
                    <Button
                      disabled={mutation.busy}
                      onClick={() => {
                        setAdd(null);
                        setDirty(false);
                      }}
                    >
                      Cancelar campanha
                    </Button>
                  </>
                )}
              </>
            )}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
