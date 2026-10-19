"use client";
import { CrmDialog as Dialog } from "@/lib/ui-system/crm-dialog";
import { useCrmLeaveGuard } from "@/lib/ui-system/leave-guard";
import { useAuthContext } from "@/app/auth-context";
import { getCustomerSegmentsError } from "@/lib/customer-segments-error";
import {
  userRegistrationDraft,
  validateUserRegistration,
  type RegistrationDraft,
} from "@/lib/crm-user-registration-form";
import type {
  CrmUserRegistrationDetail,
  CrmUserRegistrationField,
} from "@/lib/sdk-local/types/crm-users.types";
import { FileDirType } from "@/lib/sdk-local";
import crmUsersService from "@/lib/services/crm-users.service";
import filesService from "@/lib/services/files.service";
import AvatarInput from "./avatar-input";
import CrmUserShiftSelector from "./crm-user-shift-selector";
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

export default function CrmUserRegistrationDialog({
  userId,
  sectors,
  onClose,
  onSaved,
}: {
  userId?: number;
  sectors: { id: number; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { instance, user, token } = useAuthContext();
  const admin = user?.NIVEL === "ADMIN";
  const [managedUserId, setManagedUserId] = useState(userId);
  const [fields, setFields] = useState<CrmUserRegistrationField[]>([]);
  const [detail, setDetail] = useState<CrmUserRegistrationDetail>();
  const [draft, setDraft] = useState<RegistrationDraft>({});
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarEpoch, setAvatarEpoch] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [associationBusy, setAssociationBusy] = useState(false);
  const [associationDirty, setAssociationDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [discard, setDiscard] = useState<"close" | "reload" | null>(null);
  const alive = useRef(true);
  const context = useRef({ instance, token, userId: user?.CODIGO });
  context.current = { instance, token, userId: user?.CODIGO };
  const loaded = useRef(false);
  const writing = useRef(false);
  const sequence = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    if (!token || !admin) return;
    const request = ++sequence.current;
    const auth = token;
    setLoading(true);
    crmUsersService.setAuth(auth);
    try {
      if (managedUserId) {
        const response = await crmUsersService.getRegistration(managedUserId, {
          token: auth,
          instance,
        });
        if (
          !alive.current ||
          request !== sequence.current ||
          context.current.instance !== instance ||
          context.current.token !== auth
        )
          return;
        if (response.data.record.CODIGO !== managedUserId)
          throw new Error("Invalid user registration");
        setDetail(response.data);
        setFields(response.data.fields);
        setDraft(userRegistrationDraft(response.data.fields, response.data));
      } else {
        const response = await crmUsersService.registrationSchema({ token: auth, instance });
        if (
          !alive.current ||
          request !== sequence.current ||
          context.current.instance !== instance ||
          context.current.token !== auth
        )
          return;
        setFields(response.data.fields);
        setDraft(userRegistrationDraft(response.data.fields));
      }
      loaded.current = true;
      setBlocked(false);
      setError("");
      setAvatar(null);
      setAvatarEpoch((value) => value + 1);
    } catch {
      if (alive.current && request === sequence.current)
        setError("Não foi possível carregar o cadastro do usuário. Tente novamente.");
    } finally {
      if (alive.current && request === sequence.current) setLoading(false);
    }
  }, [instance, token, managedUserId, admin]);
  useEffect(() => {
    if (writing.current) {
      setBlocked(true);
      setError("Sua sessão mudou durante a gravação. Recarregue o cadastro antes de continuar.");
    }
    if (!loaded.current) void load();
  }, [load]);
  const validation = validateUserRegistration(fields, draft, detail);
  const dirty =
    associationDirty ||
    Boolean(avatar) ||
    (detail ? validation.hasChanges : Object.values(draft).some(Boolean));
  useCrmLeaveGuard(dirty, saving || associationBusy, blocked);
  const close = () => {
    if (saving || associationBusy) return;
    if (dirty || blocked) setDiscard("close");
    else onClose();
  };
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (field: string, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setSuccess("");
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !token ||
      saving ||
      associationBusy ||
      loading ||
      blocked ||
      !validation.valid ||
      (!validation.hasChanges && !avatar)
    )
      return;
    const auth = token;
    writing.current = true;
    setSaving(true);
    setError("");
    setSuccess("");
    crmUsersService.setAuth(auth);
    try {
      const changes = { ...validation.changes };
      if (avatar) {
        changes.AVATAR_ID = (
          await filesService.uploadBrowserFile({
            instance,
            dirType: FileDirType.PUBLIC,
            file: avatar,
          })
        ).id;
      }
      if (!alive.current || context.current.instance !== instance || context.current.token !== auth)
        return;
      const response =
        managedUserId && detail
          ? await crmUsersService.updateRegistration(managedUserId, changes, detail.version, {
              token: auth,
              instance,
            })
          : await crmUsersService.createRegistration(changes, { token: auth, instance });
      if (!alive.current || context.current.instance !== instance || context.current.token !== auth)
        return;
      if (
        !Number.isInteger(response.data.record.CODIGO) ||
        response.data.record.CODIGO <= 0 ||
        (managedUserId && response.data.record.CODIGO !== managedUserId) ||
        !response.data.version
      )
        throw new Error("Invalid user registration confirmation");
      setDetail(response.data);
      setFields(response.data.fields);
      setDraft(userRegistrationDraft(response.data.fields, response.data));
      setAvatar(null);
      setAvatarEpoch((value) => value + 1);
      setManagedUserId(response.data.record.CODIGO);
      setSuccess(
        managedUserId
          ? "Usuário atualizado."
          : "Usuário cadastrado. Você já pode associar um expediente.",
      );
      onSaved();
    } catch (failure) {
      if (!alive.current || context.current.instance !== instance || context.current.token !== auth)
        return;
      const { status, outcome } = getCustomerSegmentsError(failure);
      const unknown = outcome === "UNKNOWN" || status === undefined || status >= 500;
      setBlocked(status === 401 || status === 409 || status === 404 || unknown);
      setError(
        status === 401
          ? "Sua sessão expirou ou mudou. Recarregue os dados antes de continuar."
          : unknown
            ? "Não foi possível confirmar a gravação. Ela pode ter sido concluída. Confira o cadastro antes de tentar novamente."
            : status === 409
              ? "O cadastro foi alterado ou o login já está em uso. Seu rascunho foi preservado. Recarregue os dados antes de continuar."
              : status === 403
                ? "Você não tem permissão para alterar este cadastro."
                : "Não foi possível salvar. Revise os campos informados.",
      );
    } finally {
      writing.current = false;
      if (alive.current) setSaving(false);
    }
  };
  if (user?.NIVEL !== "ADMIN")
    return (
      <Dialog open onClose={onClose}>
        <DialogContent>
          <Alert severity="warning">Acesso restrito a administradores.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Fechar</Button>
        </DialogActions>
      </Dialog>
    );
  const groups = [
    ...new Set(fields.filter((field) => field.name !== "AVATAR_ID").map((field) => field.group)),
  ];
  const roleLabels: Record<string, string> = {
    ADMIN: "Administrador",
    ATIVO: "Ativo",
    RECEP: "Receptivo",
    AMBOS: "Ativo e receptivo",
    EXTERNO: "Externo",
  };
  const busy = saving || associationBusy;
  return (
    <Dialog
      open
      onClose={close}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { className: "ip-crud-editor" } }}
      aria-labelledby="user-registration-title"
    >
      <Box
        component="form"
        onSubmit={save}
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          maxHeight: "calc(100dvh - 64px)",
        }}
      >
        <DialogTitle id="user-registration-title">
          {managedUserId ? `Editar usuário #${managedUserId}` : "Novo usuário"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {loading && <LinearProgress aria-label="Carregando cadastro de usuário" />}
            {error && <Alert severity={blocked ? "warning" : "error"}>{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}
            {fields.some((field) => field.name === "AVATAR_ID") && (
              <Box sx={{ pointerEvents: busy ? "none" : undefined, opacity: busy ? 0.6 : 1 }}>
                <AvatarInput
                  key={avatarEpoch}
                  initialImage={
                    typeof detail?.record.AVATAR_ID === "number" && detail.record.AVATAR_ID > 0
                      ? filesService.getFileDownloadUrl(detail.record.AVATAR_ID)
                      : null
                  }
                  onChange={setAvatar}
                />
              </Box>
            )}
            {groups.map((group) => (
              <Stack key={group} spacing={2}>
                <Typography component="h3" fontSize={14} fontWeight={600}>
                  {group}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                    gap: 2,
                  }}
                >
                  {fields
                    .filter((field) => field.group === group && field.name !== "AVATAR_ID")
                    .map((field) => {
                      const value = draft[field.name] ?? "";
                      const sector = field.name === "SETOR";
                      const select = field.type === "select" || sector;
                      const historic =
                        field.type === "select" && value && !field.options?.includes(value);
                      const unknownSector =
                        sector && value && !sectors.some((option) => String(option.id) === value);
                      const fieldError = value ? validation.errors[field.name] : undefined;
                      const helper =
                        fieldError ||
                        (field.type === "password" && managedUserId
                          ? "Deixe em branco para manter a senha atual."
                          : sector
                            ? sectors.length
                              ? "Setor utilizado nas conversas do WhatsApp."
                              : "Nenhum setor disponível para seleção. O valor atual será preservado."
                            : undefined);
                      return (
                        <TextField
                          key={field.name}
                          label={sector ? "Setor" : field.label}
                          value={value}
                          required={!managedUserId && field.requiredOnCreate}
                          select={select}
                          type={
                            field.type === "password"
                              ? "password"
                              : field.type === "date"
                                ? "date"
                                : "text"
                          }
                          disabled={busy || loading}
                          onChange={(event) => change(field.name, event.target.value)}
                          error={Boolean(fieldError)}
                          helperText={helper}
                          slotProps={{
                            inputLabel: field.type === "date" ? { shrink: true } : undefined,
                            htmlInput:
                              field.type === "number" ? { inputMode: "numeric" } : undefined,
                          }}
                        >
                          {select && [
                            <MenuItem key="empty" value="">
                              {!managedUserId && field.requiredOnCreate ? "Selecione" : "Sem valor"}
                            </MenuItem>,
                            ...(historic || unknownSector
                              ? [
                                  <MenuItem key="historic" value={value} disabled>
                                    {sector ? `Setor #${value}` : value} (histórico)
                                  </MenuItem>,
                                ]
                              : []),
                            ...(sector
                              ? sectors.map((option) => (
                                  <MenuItem key={option.id} value={String(option.id)}>
                                    {option.name} (#{option.id})
                                  </MenuItem>
                                ))
                              : (field.options ?? []).map((option) => (
                                  <MenuItem key={option} value={option}>
                                    {field.name === "NIVEL"
                                      ? (roleLabels[option] ?? option)
                                      : option === "SIM"
                                        ? "Sim"
                                        : option === "NAO"
                                          ? "Não"
                                          : option}
                                  </MenuItem>
                                ))),
                          ]}
                        </TextField>
                      );
                    })}
                </Box>
              </Stack>
            ))}
            {!loading && !fields.length && (
              <Button onClick={() => void load()}>Tentar carregar novamente</Button>
            )}
            {blocked &&
              (managedUserId ? (
                <Button
                  variant="outlined"
                  disabled={busy}
                  onClick={() => {
                    if (dirty) setDiscard("reload");
                    else void load();
                  }}
                >
                  Recarregar cadastro
                </Button>
              ) : (
                <Alert severity="warning">
                  Feche o formulário e confira a lista de usuários antes de cadastrar novamente.
                </Alert>
              ))}
            {managedUserId && (
              <>
                <Divider />
                <Typography component="h3" fontSize={14} fontWeight={600}>
                  Associações no CRM
                </Typography>
                <CrmUserShiftSelector
                  key={`${instance}:${managedUserId}`}
                  userId={managedUserId}
                  token={token ?? ""}
                  instance={instance}
                  onSaved={onSaved}
                  onBusyChange={setAssociationBusy}
                  onDirtyChange={setAssociationDirty}
                />
                <Button component={Link} href={`/${instance}/user-catalogs/user-groups`}>
                  Gerenciar grupos e membros
                </Button>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button disabled={busy} onClick={close}>
            {managedUserId ? "Concluir" : "Cancelar"}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              busy ||
              loading ||
              blocked ||
              !fields.length ||
              !validation.valid ||
              (!validation.hasChanges && !avatar)
            }
          >
            {saving ? "Salvando…" : "Salvar usuário"}
          </Button>
        </DialogActions>
      </Box>
      <Dialog
        open={Boolean(discard)}
        onClose={() => setDiscard(null)}
        aria-labelledby="discard-user-registration-title"
      >
        <DialogTitle id="discard-user-registration-title">
          {blocked ? "Conferir gravação?" : "Descartar alterações?"}
        </DialogTitle>
        <DialogContent>
          {blocked
            ? "A gravação pode ter sido concluída. Confira os dados atuais antes de tentar novamente."
            : "Há alterações que ainda não foram salvas."}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscard(null)}>Continuar editando</Button>
          <Button
            color="error"
            onClick={() => {
              const action = discard;
              setDiscard(null);
              if (action === "reload") void load();
              else onClose();
            }}
          >
            Descartar rascunho
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
