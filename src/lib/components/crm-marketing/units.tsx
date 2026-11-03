"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Add, ArrowBack, ArrowForward, EditOutlined } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { CrmMarketingFrame, useCrmMutation, useCrmSession } from "./shared";
import { crmError } from "@/lib/crm-marketing-form";
import type { CrmUnitDetail, CrmUnitList } from "@/lib/sdk-local/types/crm-units.types";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { CampaignCard, cycleLabels } from "./campaign-common";
import CampaignEditor from "./campaign-editor";

export default function CrmUnitsPage({
  unitId,
  create = false,
}: {
  unitId?: number;
  create?: boolean;
}) {
  return (
    <CrmMarketingFrame title="Unidades e campanhas">
      <UnitsPanel key={unitId ?? (create ? "new" : "list")} unitId={unitId} create={create} />
    </CrmMarketingFrame>
  );
}
function UnitsPanel({ unitId, create }: { unitId?: number; create: boolean }) {
  const { client, instance } = useCrmSession(),
    mutation = useCrmMutation(),
    router = useRouter(),
    searchParams = useSearchParams();
  const base = `/${instance}/crm-units`,
    [list, setList] = useState<CrmUnitList["data"]>([]),
    [selected, setSelected] = useState<CrmUnitDetail | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(create),
    [adding, setAdding] = useState(false),
    [tab, setTab] = useState(searchParams.get("tab") === "rules" ? 1 : 0),
    [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [draft, setDraft] = useState({ name: "", recent: "", old: "" }),
    [saved, setSaved] = useState(draft),
    [reload, setReload] = useState(0);
  const version = useRef(0),
    current = useRef(client);
  current.current = client;
  const dirty = editing && JSON.stringify(draft) !== JSON.stringify(saved),
    locked = loading || mutation.busy || mutation.gate;
  useCrmLeaveGuard(dirty, mutation.busy, mutation.gate);
  useEffect(() => {
    const request = ++version.current,
      started = client;
    setLoading(true);
    setError("");
    void (unitId === undefined ? client.units() : client.unit(unitId))
      .then((result) => {
        if (request !== version.current || started !== current.current) return;
        if ("campaigns" in result) {
          const detail = result as CrmUnitDetail;
          setSelected(detail);
          if (!dirty) {
            const value = {
              name: detail.data.DESCRICAO ?? "",
              recent: String(detail.data.INATIVOS_RECENTES ?? ""),
              old: String(detail.data.INATIVOS_ANTIGOS ?? ""),
            };
            setDraft(value);
            setSaved(value);
          }
        } else setList((result as CrmUnitList).data);
      })
      .catch((f) => {
        if (request === version.current) setError(crmError(f).message);
      })
      .finally(() => {
        if (request === version.current) setLoading(false);
      });
    return () => {
      version.current++;
    };
  }, [client, unitId, reload]);
  const back = searchParams.get("returnTo"),
    returnTo = back?.startsWith(`/${instance}/crm-units`) ? back : base;
  function field(key: keyof typeof draft, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  async function save() {
    if (!draft.name.trim()) {
      mutation.setError("Informe o nome da unidade.");
      return;
    }
    if (selected) {
      const result = await mutation.write(() =>
        client.patchUnit(selected.data.CODIGO, { DESCRICAO: draft.name.trim() }, selected.data),
      );
      if (result) {
        setSaved(draft);
        setEditing(false);
        setReload((r) => r + 1);
        mutation.setSuccess("Dados da unidade atualizados.");
      }
    } else {
      const recent = Number(draft.recent),
        old = Number(draft.old);
      if (
        !/^[1-9]\d*$/.test(draft.recent) ||
        !/^[1-9]\d*$/.test(draft.old) ||
        recent >= old ||
        old > 2147483647
      ) {
        mutation.setError(
          "Informe períodos inteiros positivos. Os inativos antigos devem começar depois dos recentes.",
        );
        return;
      }
      const result = await mutation.write(() =>
        client.createUnit({
          fields: {
            DESCRICAO: draft.name.trim(),
            INATIVOS_RECENTES: recent,
            INATIVOS_ANTIGOS: old,
          },
          campaigns: [],
        }),
      );
      if (result) {
        setSaved(draft);
        router.replace(`${base}/${result.value.CODIGO}?created=1`);
      }
    }
  }
  function cancel() {
    if (dirty && !window.confirm("Descartar alterações da unidade?")) return;
    setDraft(saved);
    if (create) router.push(returnTo);
    else setEditing(false);
  }
  function switchTab(next: number) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("tab", "rules");
    else params.delete("tab");
    router.replace(`${base}/${unitId}?${params}`, { scroll: false });
  }
  const queryUrl = `${base}${search ? `?q=${encodeURIComponent(search)}` : ""}`;
  const renameReason = selected?.data.capabilities?.rename?.reasons.map((r) => r.message).join(" ");
  return (
    <Stack gap={3} sx={{ maxWidth: 1120, minWidth: 0 }}>
      {loading && <LinearProgress aria-label="Carregando unidades" />}
      {(error || mutation.error) && <Alert severity="error">{error || mutation.error}</Alert>}
      {mutation.success && <Alert severity="success">{mutation.success}</Alert>}
      {mutation.gate && (
        <Alert severity="warning">
          Confira os dados gravados antes de continuar.{" "}
          <Button
            disabled={mutation.busy}
            onClick={() => {
              mutation.reconcile();
              setReload((r) => r + 1);
            }}
          >
            Conferir unidade
          </Button>
        </Alert>
      )}
      {unitId === undefined && !create ? (
        <>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
            <Box>
              <Typography variant="h5" component="h2">
                Organize suas campanhas por unidade
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Abra uma unidade para configurar suas campanhas, públicos e operação.
              </Typography>
            </Box>
            <Button
              variant="contained"
              component={Link}
              href={`${base}/new?returnTo=${encodeURIComponent(queryUrl)}`}
              startIcon={<Add />}
              sx={{ alignSelf: { sm: "flex-start" }, whiteSpace: "nowrap" }}
            >
              Nova unidade
            </Button>
          </Stack>
          <Tabs value={0} aria-label="Visão das campanhas">
            <Tab label="Por unidade" />
            <Tab label="Todas as campanhas" component={Link} href={`/${instance}/crm-campaigns`} />
          </Tabs>
          <TextField
            label="Buscar unidade pelo nome"
            size="small"
            value={search}
            sx={{ maxWidth: 480 }}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              router.replace(`${base}${value ? `?q=${encodeURIComponent(value)}` : ""}`, {
                scroll: false,
              });
            }}
          />
          <Stack gap={1.5}>
            {list
              .filter((unit) =>
                (unit.DESCRICAO ?? "").toLocaleLowerCase().includes(search.toLocaleLowerCase()),
              )
              .map((unit) => (
                <Paper key={unit.CODIGO} variant="outlined" sx={{ p: 2 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    gap={1.5}
                    alignItems={{ sm: "center" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        component={Link}
                        href={`${base}/${unit.CODIGO}?returnTo=${encodeURIComponent(queryUrl)}`}
                        fontWeight={700}
                        sx={{
                          color: "text.primary",
                          textDecoration: "none",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {unit.DESCRICAO ?? "Unidade sem nome"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {unit.campaignCount} {unit.campaignCount === 1 ? "campanha" : "campanhas"} ·{" "}
                        {unit.campaignCount
                          ? "Ciclo de compra e campanhas por público"
                          : "Adicione a primeira campanha"}
                      </Typography>
                    </Box>
                    <Button
                      component={Link}
                      href={`${base}/${unit.CODIGO}?returnTo=${encodeURIComponent(queryUrl)}`}
                      endIcon={<ArrowForward />}
                    >
                      Abrir unidade
                    </Button>
                  </Stack>
                </Paper>
              ))}
          </Stack>
          {!loading && !list.length && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6">Crie sua primeira unidade</Typography>
              <Typography color="text.secondary" mt={1}>
                A unidade reúne campanhas relacionadas. Configure o público de cada campanha depois
                de criá-la.
              </Typography>
            </Paper>
          )}
          {!loading &&
            list.length > 0 &&
            !list.some((unit) =>
              (unit.DESCRICAO ?? "").toLocaleLowerCase().includes(search.toLocaleLowerCase()),
            ) && <Typography>Nenhuma unidade encontrada para “{search}”.</Typography>}
        </>
      ) : (
        <>
          <Button
            component={Link}
            href={returnTo}
            startIcon={<ArrowBack />}
            sx={{ alignSelf: "flex-start" }}
          >
            Unidades e campanhas
          </Button>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={2}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" component="h2" sx={{ overflowWrap: "anywhere" }}>
                {create ? "Nova unidade" : (selected?.data.DESCRICAO ?? "Unidade")}
              </Typography>
              {selected && (
                <Typography variant="body2" color="text.secondary">
                  Código {selected.data.CODIGO} · {selected.campaigns.length} campanhas
                </Typography>
              )}
            </Box>
            {!editing && selected && (
              <Button startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
                Editar dados
              </Button>
            )}
          </Stack>
          {searchParams.get("created") === "1" && !editing && (
            <Alert severity="success">
              Unidade criada. Adicione a primeira campanha para continuar.
            </Alert>
          )}
          {editing ? (
            <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, maxWidth: 760 }}>
              <Stack
                component="form"
                gap={2}
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <Typography variant="h6">
                  {create ? "Dados da unidade" : "Editar identificação"}
                </Typography>
                <TextField
                  required
                  autoFocus
                  label="Nome da unidade"
                  value={draft.name}
                  disabled={locked || Boolean(renameReason)}
                  onChange={(e) => field("name", e.target.value)}
                  inputProps={{ maxLength: 50 }}
                  helperText={renameReason}
                />
                {create && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Defina os períodos do ciclo de compra. Campanhas por público também podem ser
                      adicionadas à unidade.
                    </Typography>
                    <TextField
                      required
                      type="number"
                      label="Inativos recentes a partir de (dias)"
                      value={draft.recent}
                      disabled={locked}
                      onChange={(e) => field("recent", e.target.value)}
                      inputProps={{ min: 1, max: 2147483647 }}
                    />
                    <TextField
                      required
                      type="number"
                      label="Inativos antigos a partir de (dias)"
                      value={draft.old}
                      disabled={locked}
                      onChange={(e) => field("old", e.target.value)}
                      inputProps={{ min: 1, max: 2147483647 }}
                    />
                  </>
                )}
                {dirty && <Typography variant="caption">Alterações não salvas</Typography>}
                <Stack direction="row" gap={1} justifyContent="flex-end">
                  <Button onClick={cancel} disabled={mutation.busy}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="contained" disabled={locked || !draft.name.trim()}>
                    {mutation.busy ? "Salvando…" : create ? "Criar unidade" : "Salvar alterações"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ) : (
            selected && (
              <>
                <Tabs
                  value={tab}
                  onChange={(_, value) => switchTab(value)}
                  aria-label="Seções da unidade"
                >
                  <Tab label="Campanhas" />
                  <Tab label="Regras da unidade" />
                </Tabs>
                {tab === 0 ? (
                  <>
                    {!adding ? (
                      <>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          gap={1}
                        >
                          <Typography variant="h6">Campanhas</Typography>
                          <Button
                            startIcon={<Add />}
                            variant="contained"
                            onClick={() => setAdding(true)}
                            disabled={locked}
                          >
                            Adicionar campanha
                          </Button>
                        </Stack>
                        <Stack gap={1.5}>
                          {selected.campaigns.map((c) => (
                            <CampaignCard
                              key={c.CODIGO}
                              campaign={{
                                ...c,
                                OPERATION_MODE: selected.campaignModes?.[String(c.CODIGO)] ?? null,
                              }}
                              instance={instance}
                              returnTo={`${base}/${unitId}?returnTo=${encodeURIComponent(returnTo)}`}
                            />
                          ))}
                        </Stack>
                        {!selected.campaigns.length && (
                          <Typography color="text.secondary">
                            Nenhuma campanha nesta unidade. Adicione uma campanha e configure seu
                            público.
                          </Typography>
                        )}
                      </>
                    ) : (
                      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                        <Typography variant="h6" mb={2}>
                          Adicionar campanha
                        </Typography>
                        <CampaignEditor
                          unitId={selected.data.CODIGO}
                          unitName={selected.data.DESCRICAO}
                          usedTypes={selected.campaigns.map((c) => String(c.TIPO))}
                          onCancel={() => setAdding(false)}
                          onSaved={(c) => {
                            setAdding(false);
                            router.push(
                              `/${instance}/crm-campaigns/${c.CODIGO}?returnTo=${encodeURIComponent(`${base}/${unitId}`)}`,
                            );
                          }}
                        />
                      </Paper>
                    )}
                  </>
                ) : (
                  <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack gap={2}>
                      <Typography variant="h6">Ciclo de compra</Typography>
                      <Typography>
                        Inativos recentes: a partir de{" "}
                        {selected.data.INATIVOS_RECENTES ?? "não definido"} dias. Inativos antigos:
                        a partir de {selected.data.INATIVOS_ANTIGOS ?? "não definido"} dias.
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Os períodos existentes são preservados. A edição exige definir os efeitos
                        sobre clientes e agendamentos em andamento.
                      </Typography>
                      <Typography fontWeight={600}>Composição do ciclo</Typography>
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        {Object.entries(cycleLabels).map(([type, label]) => (
                          <Chip
                            key={type}
                            variant="outlined"
                            color={
                              selected.campaigns.some((c) => c.TIPO === type)
                                ? "success"
                                : "default"
                            }
                            label={`${label}: ${selected.campaigns.some((c) => c.TIPO === type) ? "configurada" : "a configurar"}`}
                          />
                        ))}
                      </Stack>
                      <Typography variant="body2">
                        Campanhas adicionais por público têm geração manual. Elas complementam o
                        ciclo; um cliente pode participar de campanhas diferentes. Mudanças no
                        público afetam as próximas gerações.
                      </Typography>
                      <Button
                        component={Link}
                        href={`/${instance}/crm-ordering?list=campaigns`}
                        sx={{ alignSelf: "flex-start" }}
                      >
                        Organizar prioridade global das campanhas
                      </Button>
                    </Stack>
                  </Paper>
                )}
              </>
            )
          )}
        </>
      )}
    </Stack>
  );
}
