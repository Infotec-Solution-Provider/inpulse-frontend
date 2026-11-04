"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useAuthContext } from "@/app/auth-context";
import { EmailClient, addresses, emailError, states } from "./client";
import type { Content, Importer, ImporterRow, Job, Preview, Settings } from "./types";

export default function EmailPage() {
  const { token, instance, user } = useAuthContext();
  if (!token || !instance || !user)
    return <Alert severity="info">Autentique-se para acessar emails.</Alert>;
  if (user.NIVEL === "EXTERNO")
    return <Alert severity="warning">Seu perfil não permite envio de emails do CRM.</Alert>;
  return (
    <EmailWorkspace
      key={`${instance}:${token}`}
      token={token}
      instance={instance}
      isAdmin={user.NIVEL === "ADMIN"}
    />
  );
}
export function EmailWorkspace({
  token,
  instance,
  isAdmin,
}: {
  token: string;
  instance: string;
  isAdmin: boolean;
}) {
  const client = useMemo(() => new EmailClient(token, instance), [token, instance]);
  const router = useRouter(),
    pathname = usePathname(),
    searchParams = useSearchParams();
  const requestedTab = searchParams?.get("tab");
  const tab =
    requestedTab === "tracking"
      ? 1
      : requestedTab === "accounts"
        ? 2
        : requestedTab === "importer" && isAdmin
          ? 3
          : 0;
  function changeTab(next: number) {
    const query = new URLSearchParams(searchParams?.toString());
    if (next === 0) query.delete("tab");
    else query.set("tab", ["send", "tracking", "accounts", "importer"][next]);
    router.push(`${pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
  }
  const [settings, setSettings] = useState<Settings | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    client
      .settings()
      .then((value) => {
        if (mounted.current) setSettings(value);
      })
      .catch((e) => {
        if (mounted.current) setError(emailError(e));
      });
    return () => {
      mounted.current = false;
    };
  }, [client]);
  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      if (mounted.current) setError(emailError(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const sender = settings?.accounts.find((a) => a.scope === settings.mode && a.active);
  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1100, width: "100%", mx: "auto", minWidth: 0 }}>
      <Typography variant="h5">Email</Typography>
      <Typography color="text.secondary">
        Remetente:{" "}
        {sender
          ? `${sender.fromName} <${sender.fromEmail}>`
          : "Nenhuma conta ativa para o modo configurado"}
      </Typography>
      {busy && <LinearProgress />}
      {error && (
        <Alert severity="error" sx={{ my: 1 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ my: 1 }}>
          {notice}
        </Alert>
      )}
      <Tabs
        value={tab}
        onChange={(_, v) => changeTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab label="Enviar" />
        <Tab label="Acompanhar" />
        <Tab label="Contas" />
        {isAdmin && <Tab label="Importador" />}
      </Tabs>
      {tab === 0 && (
        <Composer
          client={client}
          isAdmin={isAdmin}
          busy={busy}
          run={run}
          onCreated={(job) => {
            setNotice(
              `${job.kind === "CAMPAIGN" ? "Campanha salva para revisão" : "Envio colocado na fila"}. Remetente: ${job.fromEmail}.`,
            );
            changeTab(1);
          }}
        />
      )}
      {tab === 1 && <History client={client} busy={busy} run={run} />}
      {tab === 2 && settings && (
        <Accounts
          settings={settings}
          isAdmin={isAdmin}
          busy={busy}
          run={run}
          client={client}
          onSaved={(value) => {
            setSettings(value);
            setNotice("Configuração salva.");
          }}
        />
      )}
      {tab === 3 && isAdmin && <ImporterPanel client={client} run={run} busy={busy} />}
    </Box>
  );
}
type Run = (work: () => Promise<void>) => Promise<void>;
function Composer({
  client,
  isAdmin,
  busy,
  run,
  onCreated,
}: {
  client: EmailClient;
  isAdmin: boolean;
  busy: boolean;
  run: Run;
  onCreated: (j: Job) => void;
}) {
  const [kind, setKind] = useState<"INDIVIDUAL" | "CAMPAIGN">("INDIVIDUAL"),
    [to, setTo] = useState(""),
    [cc, setCc] = useState(""),
    [bcc, setBcc] = useState(""),
    [excluded, setExcluded] = useState(""),
    [subject, setSubject] = useState(""),
    [html, setHtml] = useState(""),
    [name, setName] = useState(""),
    [testAddress, setTestAddress] = useState("");
  const [attachments, setAttachments] = useState<Content["attachments"]>([]),
    [preview, setPreview] = useState<{ view: Preview; content: Content; key: string } | null>(null),
    [previewIssue, setPreviewIssue] = useState("");
  const editor = useRef<HTMLTextAreaElement>(null);
  const content = (): Content => ({
    kind,
    name: name || subject,
    to: addresses(to),
    cc: kind === "INDIVIDUAL" ? addresses(cc) : [],
    bcc: kind === "INDIVIDUAL" ? addresses(bcc) : [],
    subject,
    html,
    attachments,
    excluded: kind === "CAMPAIGN" ? addresses(excluded) : [],
  });
  async function showPreview(test = false) {
    await run(async () => {
      const payload = test
        ? {
            ...content(),
            kind: "TEST" as const,
            to: addresses(testAddress),
            cc: [],
            bcc: [],
            excluded: [],
          }
        : content();
      const view = await client.preview(payload);
      setPreviewIssue("");
      setPreview({ view, content: payload, key: crypto.randomUUID() });
    });
  }
  function format(tag: string) {
    const input = editor.current;
    if (!input) return;
    const start = input.selectionStart,
      end = input.selectionEnd;
    setHtml(
      html.slice(0, start) +
        `<${tag}>` +
        (html.slice(start, end) || "texto") +
        `</${tag}>` +
        html.slice(end),
    );
  }
  return (
    <Stack spacing={2}>
      {isAdmin && (
        <TextField
          select
          label="Tipo de envio"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <MenuItem value="INDIVIDUAL">Individual</MenuItem>
          <MenuItem value="CAMPAIGN">Campanha</MenuItem>
        </TextField>
      )}
      {kind === "CAMPAIGN" && (
        <>
          <Alert severity="info">
            Cada destinatário recebe uma mensagem separada. Revise os endereços e exclua quem não
            deve receber.
          </Alert>
          <TextField
            label="Nome da campanha"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </>
      )}
      <TextField
        label="Para (separe por vírgula, ponto e vírgula ou linha)"
        multiline
        minRows={2}
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      {kind === "INDIVIDUAL" ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField fullWidth label="CC" value={cc} onChange={(e) => setCc(e.target.value)} />
          <TextField fullWidth label="CCO" value={bcc} onChange={(e) => setBcc(e.target.value)} />
        </Stack>
      ) : (
        <TextField
          label="Excluir endereços da campanha"
          multiline
          value={excluded}
          onChange={(e) => setExcluded(e.target.value)}
        />
      )}
      <TextField label="Assunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button onClick={() => format("strong")}>Negrito</Button>
        <Button onClick={() => format("em")}>Itálico</Button>
        <Button onClick={() => format("p")}>Parágrafo</Button>
      </Stack>
      <TextField
        label="Texto formatado (HTML)"
        helperText="Selecione um trecho para formatar. A prévia remove scripts, imagens e conteúdo não permitido."
        multiline
        minRows={8}
        inputRef={editor}
        value={html}
        onChange={(e) => setHtml(e.target.value)}
      />
      <Button component="label" disabled={busy}>
        Adicionar anexos (até 5 / total 4 MB)
        <input
          type="file"
          hidden
          multiple
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            void run(async () => {
              if (
                files.length + attachments.length > 5 ||
                files.reduce((n, f) => n + f.size, 0) +
                  attachments.reduce((n, a) => n + atob(a.content).length, 0) >
                  4_000_000 ||
                files.some((f) => f.size > 2_000_000)
              )
                throw new Error("Limite de anexos excedido");
              const added = await Promise.all(
                files.map(
                  (file) =>
                    new Promise<{ name: string; content: string }>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onerror = reject;
                      reader.onload = () =>
                        resolve({ name: file.name, content: String(reader.result).split(",")[1] });
                      reader.readAsDataURL(file);
                    }),
                ),
              );
              setAttachments((value) => [...value, ...added]);
            });
          }}
        />
      </Button>
      {attachments.map((a, i) => (
        <Stack key={i} direction="row" alignItems="center">
          <Typography sx={{ overflowWrap: "anywhere" }}>{a.name}</Typography>
          <Button onClick={() => setAttachments(attachments.filter((_, n) => n !== i))}>
            Remover
          </Button>
        </Stack>
      ))}
      <Button variant="contained" disabled={busy} onClick={() => void showPreview()}>
        Revisar prévia
      </Button>
      {kind === "CAMPAIGN" && (
        <Stack spacing={1}>
          <TextField
            label="Endereço para envio de teste"
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
          />
          <Button disabled={busy || !testAddress} onClick={() => void showPreview(true)}>
            Revisar envio de teste
          </Button>
        </Stack>
      )}
      <Dialog
        open={!!preview}
        onClose={() => {
          if (!busy) setPreview(null);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Prévia do email</DialogTitle>
        <DialogContent>
          {preview && (
            <Stack spacing={1}>
              {previewIssue && <Alert severity="error">{previewIssue}</Alert>}
              <Typography>
                Remetente: {preview.view.sender.name} &lt;{preview.view.sender.email}&gt;
              </Typography>
              <Typography>Para: {preview.view.to.join(", ")}</Typography>
              {!!preview.view.cc.length && (
                <Typography>CC: {preview.view.cc.join(", ")}</Typography>
              )}
              {!!preview.view.bcc.length && (
                <Typography>CCO: {preview.view.bcc.join(", ")}</Typography>
              )}
              <Typography>Assunto: {preview.view.subject}</Typography>
              <Typography>
                {preview.view.total} destinatário(s) principal(is); {preview.view.excluded.length}{" "}
                exclusão(ões).
              </Typography>
              <Box
                component="iframe"
                title="Conteúdo da prévia"
                sandbox=""
                referrerPolicy="no-referrer"
                srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><body>${preview.view.html}</body>`}
                sx={{ width: "100%", height: 280, border: "1px solid #ddd" }}
              />
              {preview.view.attachments.map((a, i) => (
                <Typography key={i}>
                  Anexo: {a.name} ({a.bytes} bytes)
                </Typography>
              ))}
              <Alert severity="info">
                {preview.view.kind === "CAMPAIGN"
                  ? "A campanha será salva em revisão. Inicie pelo acompanhamento após conferir os destinatários."
                  : "A confirmação coloca a mensagem na fila de envio."}
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setPreview(null)}>
            Voltar
          </Button>
          {previewIssue && (
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (preview) {
                    const view = await client.preview(preview.content);
                    setPreview({ ...preview, view });
                    setPreviewIssue("");
                  }
                })
              }
            >
              Atualizar prévia
            </Button>
          )}
          <Button
            variant="contained"
            disabled={busy || !preview}
            onClick={() =>
              void run(async () => {
                if (!preview) return;
                setPreviewIssue("");
                try {
                  const job = await client.create(preview.content, preview.view.token, preview.key);
                  setPreview(null);
                  onCreated(job);
                } catch (e) {
                  setPreviewIssue(emailError(e));
                  throw e;
                }
              })
            }
          >
            {preview?.view.kind === "CAMPAIGN" ? "Salvar campanha revisada" : "Confirmar envio"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
function Accounts({
  settings,
  isAdmin,
  busy,
  run,
  client,
  onSaved,
}: {
  settings: Settings;
  isAdmin: boolean;
  busy: boolean;
  run: Run;
  client: EmailClient;
  onSaved: (s: Settings) => void;
}) {
  const [mode, setMode] = useState(settings.mode || ""),
    [scope, setScope] = useState<"GENERAL" | "INDIVIDUAL">("INDIVIDUAL");
  const account = settings.accounts.find((a) => a.scope === scope);
  const [draft, setDraft] = useState({
    fromEmail: "",
    fromName: "",
    host: "",
    port: 587,
    username: "",
    password: "",
    active: true,
  });
  useEffect(() => {
    setDraft({
      fromEmail: account?.fromEmail || "",
      fromName: account?.fromName || "",
      host: account?.host || "",
      port: account?.port || 587,
      username: account?.username || "",
      password: "",
      active: account?.active ?? true,
    });
  }, [account]);
  function field(key: "fromEmail" | "fromName" | "host" | "username" | "password", label: string) {
    return (
      <TextField
        label={label}
        type={key === "password" ? "password" : "text"}
        autoComplete={key === "password" ? "new-password" : "off"}
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      />
    );
  }
  return (
    <Stack spacing={2}>
      {isAdmin ? (
        <>
          <Typography>Como a empresa enviará emails?</Typography>
          <TextField
            select
            label="Modo de contas"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <MenuItem value="">Escolha um modo</MenuItem>
            <MenuItem value="GENERAL">Uma conta geral compartilhada</MenuItem>
            <MenuItem value="INDIVIDUAL">Uma conta individual por usuário</MenuItem>
          </TextField>
          <Button
            disabled={busy || !mode}
            onClick={() =>
              void run(async () => onSaved(await client.configure(mode, settings.version)))
            }
          >
            Salvar modo
          </Button>
        </>
      ) : (
        <Typography>
          Modo da empresa:{" "}
          {settings.mode === "GENERAL"
            ? "Conta geral"
            : settings.mode === "INDIVIDUAL"
              ? "Contas individuais"
              : "Aguardando escolha do administrador"}
        </Typography>
      )}
      <Alert severity="info">
        O envio usa exclusivamente a conta do modo escolhido. Contas individuais pertencem ao
        usuário autenticado. Use senha de aplicativo compatível com o provedor.
      </Alert>
      {isAdmin && (
        <TextField
          select
          label="Conta a configurar"
          value={scope}
          onChange={(e) => setScope(e.target.value as typeof scope)}
        >
          <MenuItem value="GENERAL">Conta geral da empresa</MenuItem>
          <MenuItem value="INDIVIDUAL">Minha conta individual</MenuItem>
        </TextField>
      )}
      {field("fromEmail", "Email remetente")}
      {field("fromName", "Nome do remetente")}
      {field("host", "Servidor SMTP")}
      <TextField
        select
        label="Segurança SMTP"
        value={draft.port}
        onChange={(e) => setDraft({ ...draft, port: Number(e.target.value) })}
      >
        <MenuItem value={587}>STARTTLS obrigatório — porta 587</MenuItem>
        <MenuItem value={465}>TLS — porta 465</MenuItem>
      </TextField>
      {field("username", "Usuário SMTP")}
      {field("password", account ? "Nova senha (vazio preserva a atual)" : "Senha de aplicativo")}
      <FormControlLabel
        control={
          <Checkbox
            checked={draft.active}
            onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          />
        }
        label="Conta ativa"
      />
      <Button
        disabled={busy}
        variant="contained"
        onClick={() =>
          void run(async () => {
            const { password, ...rest } = draft;
            onSaved(
              await client.account({
                ...rest,
                ...(password ? { password } : {}),
                scope,
                expectedVersion: account?.version ?? 0,
              }),
            );
          })
        }
      >
        Salvar conta
      </Button>
    </Stack>
  );
}
function History({ client, busy, run }: { client: EmailClient; busy: boolean; run: Run }) {
  const [jobs, setJobs] = useState<Job[]>([]),
    [selected, setSelected] = useState<Job | null>(null);
  async function refresh() {
    setJobs(await client.jobs());
    if (selected) setSelected(await client.detail(selected.id));
  }
  useEffect(() => {
    void run(refresh);
  }, [client]); // explicit refresh avoids background sends
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        “Aceito” significa aceitação pelo SMTP. Acompanhe até 100 envios recentes. Resultados
        incertos nunca são reenviados automaticamente; confirme com o provedor antes de criar outro
        envio.
      </Alert>
      <Button disabled={busy} onClick={() => void run(refresh)}>
        Atualizar acompanhamento
      </Button>
      {jobs.map((job) => (
        <Box
          key={job.id}
          sx={{ border: "1px solid", borderColor: "divider", p: 2, overflowWrap: "anywhere" }}
        >
          <Typography>
            {job.name} — {states[job.state] || job.state}
          </Typography>
          <Typography>Remetente: {job.fromEmail}</Typography>
          <Button
            disabled={busy}
            onClick={() => void run(async () => setSelected(await client.detail(job.id)))}
          >
            Ver destinatários e ações
          </Button>
        </Box>
      ))}
      {!busy && !jobs.length && <Typography>Nenhum envio registrado.</Typography>}
      {selected && (
        <Box sx={{ border: "1px solid", borderColor: "divider", p: 2 }}>
          <Typography variant="h6">{selected.name}</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {(selected.state === "DRAFT"
              ? [["START", "Iniciar campanha"]]
              : selected.state === "RUNNING"
                ? [["PAUSE", "Pausar"]]
                : selected.state === "PAUSED"
                  ? [
                      ["RESUME", "Retomar pendentes"],
                      ["RETRY_REJECTED", "Tentar rejeitados novamente"],
                    ]
                  : selected.state === "ATTENTION"
                    ? [["RETRY_REJECTED", "Tentar rejeitados novamente"]]
                    : []
            ).map(([action, label]) => (
              <Button
                key={action}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    setSelected(await client.action(selected, action));
                    setJobs(await client.jobs());
                  })
                }
              >
                {label}
              </Button>
            ))}
          </Stack>
          <Typography variant="caption">
            Ao pausar, um envio que já iniciou pode terminar.
          </Typography>
          {selected.deliveries?.map((d) => (
            <Box key={d.id} sx={{ py: 1, overflowWrap: "anywhere" }}>
              <Typography>
                {d.recipient} — {states[d.state] || d.state} ({d.attempt} tentativa(s))
              </Typography>
              {d.errorCode && <Typography variant="caption">{d.errorCode}</Typography>}
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  );
}
function ImporterPanel({ client, busy, run }: { client: EmailClient; busy: boolean; run: Run }) {
  const [data, setData] = useState<Importer | null>(null),
    [page, setPage] = useState(1),
    [email, setEmail] = useState(""),
    [active, setActive] = useState(true),
    [original, setOriginal] = useState<ImporterRow | null>(null);
  useEffect(() => {
    void run(async () => setData(await client.importer(page)));
  }, [client, page]);
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Cadastro de endereços do importador. Este recurso não lê caixas de entrada. Os endereços são
        independentes das contas remetentes; nenhum vínculo é criado automaticamente.
      </Alert>
      {data?.reason && <Alert severity="warning">{data.reason}</Alert>}
      {data?.supported && (
        <>
          <TextField
            label="Email do importador"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputProps={{ maxLength: data.maxLength }}
          />
          <FormControlLabel
            control={<Checkbox checked={active} onChange={(e) => setActive(e.target.checked)} />}
            label="Ativo"
          />
          <Stack direction="row">
            <Button
              disabled={busy || !data.writable}
              onClick={() =>
                void run(async () => {
                  await client.saveImporter({
                    email,
                    active: active ? "S" : "N",
                    ...(original
                      ? {
                          id: original.CODIGO,
                          expected: { EMAIL: original.EMAIL, ATIVO: original.ATIVO },
                        }
                      : {}),
                  });
                  setOriginal(null);
                  setEmail("");
                  setData(await client.importer(page));
                })
              }
            >
              {original ? "Salvar alteração" : "Cadastrar endereço"}
            </Button>
            <Button
              onClick={() => {
                setOriginal(null);
                setEmail("");
                setActive(true);
              }}
            >
              Novo
            </Button>
          </Stack>
          {data.data.map((row) => (
            <Stack
              key={row.CODIGO}
              direction={{ xs: "column", sm: "row" }}
              alignItems="start"
              gap={1}
            >
              <Typography sx={{ overflowWrap: "anywhere" }}>
                {row.EMAIL} — {row.ATIVO === "S" ? "Ativo" : "Inativo"}
              </Typography>
              <Button
                disabled={busy || !data.writable}
                onClick={() => {
                  setOriginal(row);
                  setEmail(row.EMAIL);
                  setActive(row.ATIVO === "S");
                }}
              >
                Editar
              </Button>
            </Stack>
          ))}
          <Stack direction="row">
            <Button disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <Typography>Página {page}</Typography>
            <Button disabled={busy || !data.hasNext} onClick={() => setPage(page + 1)}>
              Próxima
            </Button>
            <Button
              disabled={busy}
              onClick={() => void run(async () => setData(await client.importer(page)))}
            >
              Atualizar
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
}
