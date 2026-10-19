"use client";
import { crmError } from "@/lib/crm-marketing-form";
import type {
  CrmCampaignMember,
  CrmCampaignMemberOption,
} from "@/lib/sdk-local/types/crm-marketing.types";
import { Add, DeleteOutline, Refresh } from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useCrmSession } from "./shared";

export default function CampaignMembers({ campaignId }: { campaignId: number }) {
  const { client } = useCrmSession();
  const [members, setMembers] = useState<CrmCampaignMember[]>([]),
    [code, setCode] = useState(""),
    [selected, setSelected] = useState<CrmCampaignMemberOption | null>(null),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [options, setOptions] = useState<CrmCampaignMemberOption[]>([]),
    [optionsLoading, setOptionsLoading] = useState(false),
    [optionsError, setOptionsError] = useState(""),
    [hasNext, setHasNext] = useState(false),
    [optionRetry, setOptionRetry] = useState(0),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [removing, setRemoving] = useState<CrmCampaignMember | null>(null);
  const current = useRef(client),
    alive = useRef(true),
    writing = useRef(false),
    epoch = useRef(0),
    sequence = useRef(0);
  current.current = client;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      sequence.current += 1;
    };
  }, []);
  const load = useCallback(
    async (confirm = false) => {
      if (confirm && writing.current) return;
      const request = ++sequence.current,
        started = client,
        readEpoch = epoch.current;
      setLoading(true);
      try {
        const response = await started.campaignMembers(campaignId);
        if (!alive.current || started !== current.current || request !== sequence.current) return;
        setMembers(response.data);
        if (confirm && !writing.current && readEpoch === epoch.current) {
          setBlocked(false);
          setError("");
          setRemoving(null);
          setSuccess("Vínculos recarregados. Confira os dados antes de continuar.");
        }
      } catch (failure) {
        if (alive.current && started === current.current && request === sequence.current) {
          setError(crmError(failure).message);
          setBlocked(true);
        }
      } finally {
        if (alive.current && started === current.current && request === sequence.current)
          setLoading(false);
      }
    },
    [client, campaignId],
  );
  useEffect(() => {
    if (writing.current) {
      setBlocked(true);
      setError("Sua sessão mudou durante a gravação. Recarregue os vínculos antes de continuar.");
      return;
    }
    void load();
  }, [load]);
  useEffect(() => {
    let active = true;
    if (!open || busy || blocked) return;
    const timer = setTimeout(async () => {
      setOptionsLoading(true);
      setOptionsError("");
      try {
        const response = await client.campaignMemberOptions(campaignId, search, page);
        if (!active) return;
        const rows = response.data.filter((item) => item.CODIGO > 0 && item.ATIVO === "SIM");
        setOptions((old) =>
          page === 1
            ? rows
            : [...old, ...rows.filter((row) => !old.some((item) => item.CODIGO === row.CODIGO))],
        );
        setHasNext(response.page.hasNext);
      } catch {
        if (active) {
          setOptionsError("Não foi possível buscar usuários ativos. Tente novamente.");
          setHasNext(false);
        }
      } finally {
        if (active) setOptionsLoading(false);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [client, campaignId, open, search, page, optionRetry, busy, blocked]);
  const invalidCode =
    Boolean(code) &&
    (!/^[1-9]\d*$/.test(code) || !Number.isSafeInteger(Number(code)) || Number(code) > 2147483647);
  const duplicate =
    Boolean(code && members.some((item) => item.CODIGO === Number(code))) ||
    Boolean(selected && members.some((item) => item.OPERADOR === selected.CODIGO));
  const mutate = async (target?: CrmCampaignMember) => {
    if (
      writing.current ||
      blocked ||
      loading ||
      (!target && (!selected || !code || invalidCode || duplicate)) ||
      (target && !target.writable)
    )
      return;
    writing.current = true;
    epoch.current += 1;
    setBusy(true);
    setError("");
    setSuccess("");
    const started = client;
    try {
      if (target)
        await started.removeCampaignMember(campaignId, target.CODIGO, {
          CAMPANHA: campaignId,
          OPERADOR: target.OPERADOR,
        });
      else
        await started.addCampaignMember(campaignId, {
          CODIGO: Number(code),
          OPERADOR: selected!.CODIGO,
        });
      epoch.current += 1;
      if (!alive.current) return;
      if (started !== current.current) {
        setBlocked(true);
        setError("Sua sessão mudou durante a gravação. Recarregue os vínculos antes de continuar.");
        return;
      }
      setRemoving(null);
      if (!target) {
        setCode("");
        setSelected(null);
        setSearch("");
        setPage(1);
      }
      setSuccess(
        target ? "Vínculo removido. O usuário foi preservado." : "Usuário vinculado à campanha.",
      );
      await load();
    } catch (failure) {
      epoch.current += 1;
      if (alive.current) {
        const detail = crmError(failure);
        const reconcile =
          detail.reconcile ||
          detail.status === 401 ||
          detail.status === 404 ||
          started !== current.current;
        setBlocked(reconcile);
        setError(
          detail.status === 409
            ? "O vínculo já existe, o código está ocupado ou os dados mudaram. Recarregue os vínculos e confira antes de continuar."
            : detail.message,
        );
      }
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void mutate();
  };
  const disabled = busy || loading || blocked;
  return (
    <Paper
      component="section"
      aria-labelledby="campaign-members-title"
      variant="outlined"
      sx={{ p: { xs: 2, md: 3 } }}
    >
      <Stack gap={2}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={1} justifyContent="space-between">
          <Box>
            <Typography id="campaign-members-title" variant="h6">
              Usuários vinculados à campanha
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mantenha os vínculos usados no CRM. A geração continua usando o usuário escolhido em
              cada lote.
            </Typography>
          </Box>
          <Button
            startIcon={<Refresh />}
            disabled={busy || loading}
            onClick={() => void load(true)}
          >
            Recarregar vínculos
          </Button>
        </Stack>
        {loading && <LinearProgress aria-label="Carregando vínculos da campanha" />}
        {error && (
          <Alert severity={blocked ? "warning" : "error"}>
            {error}
            {blocked && " Confira a lista antes de enviar outra alteração."}
          </Alert>
        )}
        {success && <Alert severity="success">{success}</Alert>}
        <Box
          component="form"
          onSubmit={submit}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(150px,1fr) minmax(220px,2fr) auto" },
            gap: 2,
            alignItems: "start",
          }}
        >
          <TextField
            label="Código do vínculo"
            value={code}
            disabled={disabled}
            onChange={(event) => setCode(event.target.value)}
            error={invalidCode}
            helperText={
              invalidCode
                ? "Informe um inteiro positivo até 2147483647."
                : "Informe o código do vínculo utilizado no CRM."
            }
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
          />
          <Autocomplete<CrmCampaignMemberOption>
            open={open}
            onOpen={() => {
              setOpen(true);
              setPage(1);
            }}
            onClose={() => setOpen(false)}
            disabled={disabled}
            value={selected}
            options={
              selected && !options.some((row) => row.CODIGO === selected.CODIGO)
                ? [selected, ...options]
                : options
            }
            loading={optionsLoading}
            filterOptions={(rows) => rows}
            getOptionLabel={(row) => `${row.NOME ?? "Usuário"} (#${row.CODIGO})`}
            isOptionEqualToValue={(a, b) => a.CODIGO === b.CODIGO}
            getOptionDisabled={(row) => members.some((member) => member.OPERADOR === row.CODIGO)}
            onChange={(_, row) => setSelected(row)}
            onInputChange={(_, text, reason) => {
              if (reason === "input") {
                setSearch(text);
                setPage(1);
              }
            }}
            clearText="Limpar usuário"
            openText="Abrir usuários"
            closeText="Fechar usuários"
            noOptionsText={optionsError || "Nenhum usuário ativo encontrado."}
            slots={{
              paper: (props) => (
                <Paper {...props}>
                  {props.children}
                  {hasNext && !optionsError && (
                    <Button
                      fullWidth
                      disabled={optionsLoading}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Carregar mais usuários
                    </Button>
                  )}
                  {optionsError && (
                    <Button
                      fullWidth
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setOptionRetry((value) => value + 1)}
                    >
                      Tentar busca novamente
                    </Button>
                  )}
                </Paper>
              ),
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Usuário ativo para vincular"
                error={Boolean(optionsError)}
                helperText={
                  optionsError ||
                  "Busque pelo nome ou código. Somente usuários ativos podem ser vinculados."
                }
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {optionsLoading && <CircularProgress size={16} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={<Add />}
            disabled={disabled || !selected || !code || invalidCode || duplicate}
          >
            Vincular usuário
          </Button>
        </Box>
        {duplicate && (
          <Alert severity="info">Este código ou usuário já aparece nos vínculos da campanha.</Alert>
        )}
        <TableContainer sx={{ maxHeight: 360 }}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead>
              <TableRow>
                <TableCell>Código do vínculo</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell>Situação</TableCell>
                <TableCell>Ação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((item) => (
                <TableRow key={item.CODIGO}>
                  <TableCell>{item.CODIGO}</TableCell>
                  <TableCell>
                    {item.OPERADOR_NOME ??
                      (item.OPERADOR == null
                        ? "Sem usuário (histórico)"
                        : `Usuário #${item.OPERADOR} (histórico)`)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        item.OPERADOR_ATIVO === "SIM"
                          ? "Ativo"
                          : item.OPERADOR_ATIVO === "NAO"
                            ? "Inativo"
                            : "Histórico"
                      }
                      color={item.OPERADOR_ATIVO === "SIM" ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip
                      title={
                        item.writable
                          ? "Remover somente o vínculo"
                          : "Vínculo histórico ou duplicado sem remoção segura"
                      }
                    >
                      <span>
                        <IconButton
                          aria-label={`Remover vínculo ${item.CODIGO}`}
                          disabled={disabled || !item.writable}
                          onClick={() => setRemoving(item)}
                        >
                          <DeleteOutline />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!members.length && !loading && (
                <TableRow>
                  <TableCell colSpan={4}>Nenhum usuário vinculado a esta campanha.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Dialog
          open={Boolean(removing)}
          onClose={() => {
            if (!busy) setRemoving(null);
          }}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Remover vínculo da campanha?</DialogTitle>
          <DialogContent>
            <Typography>
              {removing?.OPERADOR_NOME ?? `Usuário #${removing?.OPERADOR ?? "—"}`}
            </Typography>
            <Typography sx={{ mt: 1 }}>
              Esta ação remove somente o vínculo com a campanha e preserva o cadastro do usuário e
              as agendas existentes.
            </Typography>
            {blocked && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Recarregue os vínculos para conferir o resultado antes de outra alteração.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button disabled={busy} onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            {blocked ? (
              <Button disabled={busy || loading} onClick={() => void load(true)}>
                Conferir vínculos
              </Button>
            ) : (
              <Button
                color="error"
                disabled={busy || loading}
                onClick={() => void mutate(removing!)}
              >
                Remover vínculo
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Stack>
    </Paper>
  );
}
