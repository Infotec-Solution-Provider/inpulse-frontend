"use client";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import { UiIcon } from "@/lib/ui-system";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { getCustomerSegmentsError } from "@/lib/customer-segments-error";
import type { CrmUserGroupMember, CrmUserOption } from "@/lib/sdk-local/types/crm-users.types";
import crmUsersService from "@/lib/services/crm-users.service";
import { DeleteOutline, Refresh } from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

export default function CrmUserGroupMembers({
  groupId,
  groupName,
  token,
  instance,
  onClose,
}: {
  groupId: number;
  groupName: string;
  token: string;
  instance: string;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<CrmUserGroupMember[]>([]);
  const [options, setOptions] = useState<CrmUserOption[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CrmUserOption | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [removing, setRemoving] = useState<CrmUserGroupMember | null>(null);
  const [discardClose, setDiscardClose] = useState(false);
  const close = () => {
    if (saving) return;
    if (code || selected) setDiscardClose(true);
    else onClose();
  };
  useCrmLeaveGuard(Boolean(code || selected), saving, blocked);
  const alive = useRef(true);
  const activeToken = useRef(token);
  activeToken.current = token;
  const writing = useRef(false);
  const sequence = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const load = useCallback(
    async (confirm = false) => {
      const request = ++sequence.current;
      const auth = token;
      setLoading(true);
      crmUsersService.setAuth(auth);
      try {
        const response = await crmUsersService.listMembers(groupId, { token: auth, instance });
        if (!alive.current || request !== sequence.current || activeToken.current !== auth) return;
        setMembers(response.data);
        if (confirm && !writing.current) {
          setBlocked(false);
          setError("");
          setRemoving(null);
        }
      } catch {
        if (alive.current && request === sequence.current)
          setError("Não foi possível carregar os membros. Tente novamente.");
      } finally {
        if (alive.current && request === sequence.current) setLoading(false);
      }
    },
    [groupId, token],
  );
  useEffect(() => {
    if (writing.current) {
      setBlocked(true);
      setError("Sua sessão mudou durante a gravação. Recarregue os membros antes de continuar.");
    }
    void load();
  }, [load]);
  useEffect(() => {
    let active = true;
    const auth = token;
    const timer = setTimeout(() => {
      setOptionsLoading(true);
      setOptionsError("");
      void crmUsersService
        .lookupUsers(search, { token: auth, instance })
        .then((response) => {
          if (active) setOptions(response.data.filter((user) => user.CODIGO > 0));
        })
        .catch(() => {
          if (active)
            setOptionsError("Não foi possível buscar usuários. Tente buscar pelo nome novamente.");
        })
        .finally(() => {
          if (active) setOptionsLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, token]);
  const handleError = (failure: unknown) => {
    const details = getCustomerSegmentsError(failure);
    setBlocked(
      details.status === 401 ||
        details.status === 409 ||
        details.outcome === "UNKNOWN" ||
        details.status === undefined ||
        details.status >= 500,
    );
    setError(
      details.outcome === "UNKNOWN" || details.status === undefined || details.status >= 500
        ? "Não foi possível confirmar a gravação. Ela pode ter sido concluída. Recarregue os membros antes de tentar novamente."
        : details.status === 409
          ? "O vínculo já existe, seu código está ocupado ou os dados foram alterados. Recarregue os membros."
          : "Não foi possível alterar o grupo. Revise os dados e tente novamente.",
    );
  };
  const write = async (target?: CrmUserGroupMember) => {
    const memberCode = Number(code);
    if (
      saving ||
      blocked ||
      (!target &&
        (!selected ||
          !/^[1-9]\d*$/.test(code) ||
          !Number.isSafeInteger(memberCode) ||
          memberCode > 2147483647))
    )
      return;
    const auth = token;
    writing.current = true;
    setSaving(true);
    setError("");
    crmUsersService.setAuth(auth);
    try {
      if (target)
        await crmUsersService.removeMember(
          groupId,
          target.CODIGO,
          { OPERADOR: target.OPERADOR },
          { token: auth, instance },
        );
      else
        await crmUsersService.addMember(
          groupId,
          { CODIGO: memberCode, OPERADOR: selected!.CODIGO },
          { token: auth, instance },
        );
      if (!alive.current || activeToken.current !== auth) return;
      setRemoving(null);
      if (!target) {
        setCode("");
        setSelected(null);
      }
      await load();
    } catch (failure) {
      if (alive.current && activeToken.current === auth) handleError(failure);
    } finally {
      writing.current = false;
      if (alive.current) setSaving(false);
    }
  };
  const invalidCode = code !== "" && (!/^[1-9]\d*$/.test(code) || Number(code) > 2147483647);
  return (
    <Dialog
      open
      onClose={close}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { className: "ip-crud-editor" } }}
      aria-labelledby="group-members-title"
    >
      <DialogTitle id="group-members-title">Membros · {groupName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {loading && <LinearProgress aria-label="Carregando membros" />}
          {error && <Alert severity={blocked ? "warning" : "error"}>{error}</Alert>}
          <Button
            startIcon={<Refresh />}
            disabled={saving || loading}
            onClick={() => void load(true)}
          >
            Recarregar membros
          </Button>
          <Typography variant="subtitle2">Adicionar usuário</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Código do vínculo"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={saving || blocked}
              error={invalidCode}
              helperText={
                invalidCode
                  ? "Informe um código inteiro positivo disponível."
                  : "Identifica esta associação no CRM."
              }
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
              sx={{ width: { sm: 190 } }}
            />
            <Autocomplete
              options={options}
              value={selected}
              onChange={(_, user) => setSelected(user)}
              filterOptions={(value) => value}
              onInputChange={(_, value, reason) => {
                if (reason === "input") setSearch(value);
              }}
              loading={optionsLoading}
              getOptionLabel={(user) => `${user.NOME} (#${user.CODIGO})`}
              isOptionEqualToValue={(option, value) => option.CODIGO === value.CODIGO}
              getOptionDisabled={(user) =>
                members.some((member) => member.OPERADOR === user.CODIGO)
              }
              disabled={saving || blocked}
              sx={{ flex: 1 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Usuário"
                  helperText={optionsError || "Busque por nome para encontrar um usuário."}
                  error={Boolean(optionsError)}
                />
              )}
            />
            <Button
              variant="contained"
              disabled={saving || blocked || !code || invalidCode || !selected}
              onClick={() => void write()}
            >
              Adicionar
            </Button>
          </Stack>
          <div className="ip-crud-table" style={{ overflowX: "auto" }}>
            <Table size="small" aria-label="Membros do grupo">
              <TableHead>
                <TableRow>
                  <TableCell>Código do vínculo</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Ativo</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.CODIGO}>
                    <TableCell data-label="Código do vínculo">{member.CODIGO}</TableCell>
                    <TableCell data-label="Usuário">
                      {member.OPERADOR_NOME ?? "Usuário indisponível"}{" "}
                      {member.OPERADOR !== null && `(#${member.OPERADOR})`}
                    </TableCell>
                    <TableCell data-label="Ativo">{member.OPERADOR_ATIVO ?? "—"}</TableCell>
                    <TableCell data-label="Ações">
                      <IconButton
                        color="error"
                        aria-label={`Remover membro ${member.CODIGO}`}
                        disabled={saving || blocked}
                        onClick={() => setRemoving(member)}
                      >
                        <UiIcon name="delete" scale="row" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && !members.length && (
                  <TableRow>
                    <TableCell colSpan={4}>Nenhum membro neste grupo.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={close}>
          Fechar
        </Button>
      </DialogActions>
      <Dialog
        open={Boolean(removing)}
        onClose={() => {
          if (!saving) setRemoving(null);
        }}
        aria-labelledby="group-remove-member-title"
      >
        <DialogTitle id="group-remove-member-title">Remover usuário do grupo?</DialogTitle>
        <DialogContent>
          O cadastro do usuário será preservado.
          {error && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setRemoving(null)}>
            Cancelar
          </Button>
          <Button
            color="error"
            disabled={saving || blocked}
            onClick={() => removing && void write(removing)}
          >
            Remover vínculo
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={discardClose}
        onClose={() => setDiscardClose(false)}
        aria-labelledby="discard-group-selection"
      >
        <DialogTitle id="discard-group-selection">Descartar a seleção?</DialogTitle>
        <DialogContent>
          O vínculo ainda não foi confirmado nesta tela. Confira os membros antes de tentar
          adicioná-lo novamente.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardClose(false)}>Continuar editando</Button>
          <Button color="error" onClick={onClose}>
            Descartar e fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
