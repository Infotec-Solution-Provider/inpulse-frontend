import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import { Alert, Button, Chip, CircularProgress, MenuItem, TextField } from "@mui/material";
import {
  Building2,
  Server,
  ScrollText,
  History,
  Moon,
  Sun,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { PilotDesignProvider } from "../src/lib/ui-system/provider";
import { createPilotTheme } from "../src/lib/ui-system/theme";
import { readThemePreference, resolveTheme } from "../src/lib/ui-system/theme-preference";
import { api, AdminError } from "./client";
import { TenantScreen, ServerScreen, LogsScreen, AuditScreen, type ScreenProps } from "./screens";
import type { Environment, Session } from "./types";
import "./styles.css";

type Tab = "tenants" | "server" | "logs" | "audit";
const tabs = [
  { id: "tenants", label: "Tenants", icon: Building2 },
  { id: "server", label: "Servidor", icon: Server },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "audit", label: "Histórico", icon: History },
] as const;
const initialMode = () => {
  try {
    return resolveTheme(
      readThemePreference(localStorage.getItem("themePreference"), localStorage.getItem("theme")),
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
  } catch {
    return "light" as const;
  }
};

function App() {
  const [mode, setMode] = useState(initialMode);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [environment, setEnvironment] = useState<Environment>("homolog");
  const [tab, setTab] = useState<Tab>(() =>
    tabs.some((item) => item.id === location.hash.slice(1))
      ? (location.hash.slice(1) as Tab)
      : "tenants",
  );
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const accept = (value: Session) => {
    setSession(value);
    setNow(Date.now());
    setExpired(false);
    setError("");
  };
  useEffect(() => {
    let mounted = true;
    api.onUnauthorized = () => {
      if (mounted) {
        setSession(null);
        setExpired(true);
      }
    };
    api
      .session()
      .then((value) => {
        if (mounted) {
          accept(value);
          setEnvironment(
            value.environments.includes("homolog") ? "homolog" : value.environments[0],
          );
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Sessão indisponível.");
          setExpired(true);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      api.onUnauthorized = undefined;
    };
  }, []);
  const renew = async () => {
    if (!sessionRef.current || renewing) return;
    setRenewing(true);
    try {
      accept(await api.renew());
    } catch (err) {
      if (err instanceof AdminError && [401, 403].includes(err.status)) {
        setSession(null);
        setExpired(true);
      }
      setError(
        "Não foi possível renovar a sessão. Ela continua válida até o horário indicado. Se expirar com o users-service indisponível, recupere o acesso por SSH.",
      );
    } finally {
      setRenewing(false);
    }
  };
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      void renew();
    }, 5 * 60_000);
    return () => clearInterval(timer);
  }, [session?.expiresAt]);
  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (sessionRef.current && new Date(sessionRef.current.expiresAt).getTime() <= current) {
        setSession(null);
        setExpired(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  const canLeave = () => {
    if (busy) {
      setError("Aguarde ou confira o resultado da operação antes de mudar o destino.");
      return false;
    }
    return (
      !dirty || window.confirm("Há alterações não salvas. Descartar o rascunho e mudar de destino?")
    );
  };
  const navigate = (next: Tab) => {
    if (next !== tab && canLeave()) {
      setDirty(false);
      setBusy(false);
      setTab(next);
      history.replaceState(null, "", `#${next}`);
    }
  };
  const logout = async () => {
    if (!canLeave()) return;
    try {
      await api.logout();
      setSession(null);
      setExpired(true);
      setError("Sessão administrativa encerrada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível encerrar a sessão.");
    }
  };
  const props: ScreenProps | null = session
    ? { environment, actorId: session.actor.userId, onDirty: setDirty, onBusy: setBusy, canLeave }
    : null;
  const remaining = session
    ? Math.min(30, Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - now) / 60_000)))
    : 0;
  return (
    <ThemeProvider theme={createPilotTheme(mode)}>
      <PilotDesignProvider>
        <div className="admin-app">
          <header className="admin-topbar">
            <div className="admin-brand">
              <ShieldCheck size={24} color="var(--ip-accent)" />
              <span>
                in.pulse <small>Administração</small>
              </span>
            </div>
            <div className="admin-session">
              {session && (
                <>
                  <span>{session.actor.name} · infotec</span>
                  <Chip size="small" variant="outlined" label={`Sessão: ${remaining} min`} />
                  <Button size="small" onClick={() => void renew()} disabled={renewing}>
                    {renewing ? "Renovando…" : "Renovar sessão"}
                  </Button>
                </>
              )}
              <Button
                size="small"
                aria-label="Alternar tema"
                onClick={() => setMode((value) => (value === "light" ? "dark" : "light"))}
              >
                {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
              {session && (
                <Button size="small" startIcon={<LogOut size={15} />} onClick={() => void logout()}>
                  Sair
                </Button>
              )}
            </div>
          </header>
          {loading ? (
            <div className="admin-empty">
              <CircularProgress aria-label="Verificando sessão administrativa" />
            </div>
          ) : !session || expired ? (
            <div className="admin-session-gate admin-card">
              <h1>Acesso administrativo</h1>
              <Alert severity="warning">
                {error ||
                  "Abra a administração pelo menu do CRM com um usuário administrador do tenant infotec."}
              </Alert>
              <p>
                Se o serviço de autenticação estiver indisponível após a expiração da sessão, o
                acesso de recuperação é por SSH.
              </p>
              <Button component="a" href="/infotec" variant="contained">
                Voltar ao CRM infotec
              </Button>
              <Button
                onClick={() => {
                  setLoading(true);
                  api
                    .session()
                    .then(accept)
                    .catch((err) =>
                      setError(err instanceof Error ? err.message : "Sessão indisponível."),
                    )
                    .finally(() => setLoading(false));
                }}
              >
                Conferir sessão
              </Button>
            </div>
          ) : (
            <div className="admin-layout">
              <nav className="admin-nav" aria-label="Administração">
                <div>
                  {tabs.map((item) => (
                    <button
                      key={item.id}
                      aria-current={tab === item.id ? "page" : undefined}
                      onClick={() => navigate(item.id)}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </button>
                  ))}
                  <p>
                    Console independente dos processos da aplicação.
                    <br />
                    Alterações e ações são registradas no histórico.
                  </p>
                </div>
              </nav>
              <main className="admin-main">
                <div className="admin-toolbar" style={{ marginBottom: 22 }}>
                  <TextField
                    select
                    label="Ambiente de destino"
                    size="small"
                    value={environment}
                    onChange={(event) => {
                      if (canLeave()) {
                        setDirty(false);
                        setBusy(false);
                        setEnvironment(event.target.value as Environment);
                      }
                    }}
                  >
                    {session.environments.map((env) => (
                      <MenuItem key={env} value={env}>
                        {env === "production" ? "Produção" : "Homologação"}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Chip
                    color={environment === "production" ? "warning" : "default"}
                    variant="outlined"
                    label={
                      environment === "production" ? "Produção · alterações reais" : "Homologação"
                    }
                  />
                  <span className="admin-metadata">Salvar e aplicar são ações separadas.</span>
                </div>
                {error && (
                  <Alert sx={{ mb: 2 }} severity="warning" onClose={() => setError("")}>
                    {error}
                  </Alert>
                )}
                {props && (
                  <React.Fragment key={`${session.actor.userId}:${environment}:${tab}`}>
                    {tab === "tenants" ? (
                      <TenantScreen {...props} />
                    ) : tab === "server" ? (
                      <ServerScreen {...props} />
                    ) : tab === "logs" ? (
                      <LogsScreen environment={environment} />
                    ) : (
                      <AuditScreen environment={environment} />
                    )}
                  </React.Fragment>
                )}
              </main>
            </div>
          )}
        </div>
      </PilotDesignProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
