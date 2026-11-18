"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { FEATURE_FLAGS, isFeatureEnabled } from "../feature-flags";
import usersService from "../services/users.service";
import {
  createTelephonyRuntimeClient,
  type RuntimeOperatorState,
  type TelephonyRuntimeClient,
} from "./runtime-client";
import {
  defaultAudioPreferences,
  readAudioPreferences,
  type AudioPreferences,
} from "./audio-preferences";
import { startPhoneTone, resumePhoneTone } from "./phone-tone";
import type { BrowserPhone } from "./browser-phone";
import { acquirePhoneTabLock } from "./phone-tab-lock";
import { initialPhoneState, isCallBusy, type PhoneState } from "./types";
import { TelephonyPanel } from "./telephony-panel";
import type { OperatorDashboardMetrics } from "./operator-dashboard";

interface TelephonyContextValue {
  runtime: TelephonyRuntimeClient;
  operatorState: RuntimeOperatorState | null;
  refreshOperator: () => Promise<void>;
  metrics: OperatorDashboardMetrics | null;
  /** Authenticated operator access is independent of the SIP dialer feature. */
  canAccessOperatorRuntime: boolean;
  enabled: boolean;
  audioPreferences: AudioPreferences;
  allowAutoAnswer: boolean;
  saveAudioPreferences: (preferences: AudioPreferences) => void;
  testAudio: () => void;
  transfer: (extension: string) => void;
  /** Registers a screen that shows the phone panel itself (TelephonyPanelSlot); returns the cleanup. */
  hostPanel: () => () => void;
  state: PhoneState;
  busy: boolean;
  audioBlocked: boolean;
  syncError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  dial: (number: string, scheduleId?: number) => Promise<void>;
  answer: () => Promise<void>;
  hangup: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  sendTone: (tone: string) => void;
  playAudio: () => void;
  waitForSync: () => Promise<void>;
}
const TelephonyContext = createContext<TelephonyContextValue | null>(null);
export function useOptionalTelephony() {
  return useContext(TelephonyContext);
}
export function useTelephony() {
  const context = useContext(TelephonyContext);
  if (!context) throw new Error("TelephonyProvider ausente.");
  return context;
}

export function TelephonyProvider({ children }: { children: ReactNode }) {
  const { token, instance, user } = useAuthContext();
  const { parameters } = useWhatsappContext();
  const canAccessOperatorRuntime = !!token && !!instance && !!user;
  const enabled = !!token && isFeatureEnabled(parameters, FEATURE_FLAGS.telephonyDialer);
  const identity = `${instance}:${user?.CODIGO ?? ""}`;
  return (
    <PhoneSession
      key={`${identity}:${enabled}`}
      identity={identity}
      token={token}
      enabled={enabled}
      canAccessOperatorRuntime={canAccessOperatorRuntime}
    >
      {children}
    </PhoneSession>
  );
}

function PhoneSession({
  children,
  identity,
  token,
  enabled,
  canAccessOperatorRuntime,
}: {
  children: ReactNode;
  identity: string;
  token: string | null;
  enabled: boolean;
  canAccessOperatorRuntime: boolean;
}) {
  const [state, setState] = useState<PhoneState>({ ...initialPhoneState });
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [operatorState, setOperatorState] = useState<RuntimeOperatorState | null>(null);
  const [metrics, setMetrics] = useState<OperatorDashboardMetrics | null>(null);
  const operatorStateRef = useRef(operatorState);
  operatorStateRef.current = operatorState;
  const audioRef = useRef<HTMLAudioElement>(null);
  const toneRef = useRef<HTMLAudioElement>(null);
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>({
    ...defaultAudioPreferences,
  });
  const [allowAutoAnswer, setAllowAutoAnswer] = useState(false);
  const preferencesRef = useRef(audioPreferences);
  preferencesRef.current = audioPreferences;
  const phoneRef = useRef<BrowserPhone | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const releaseRef = useRef<(() => void) | null>(null);
  const connectingRef = useRef(false);
  const epochRef = useRef(0);
  const mountedRef = useRef(true);
  const runtimeRef = useRef<ReturnType<typeof createTelephonyRuntimeClient> | null>(null);
  const webSessionRef = useRef<string | null>(null);
  if (!runtimeRef.current)
    runtimeRef.current = createTelephonyRuntimeClient({
      identity,
      getToken: () => tokenRef.current,
      onSyncError: (message) => {
        if (mountedRef.current) setSyncError(message);
      },
      onOperatorState: (next) => {
        operatorStateRef.current = next;
        if (mountedRef.current) setOperatorState(next);
      },
    });
  async function refreshOperator() {
    await runtimeRef.current!.refreshState();
  }
  useEffect(() => {
    if (!canAccessOperatorRuntime || !operatorState?.enabled) return;
    let cancelled = false;
    const run = () => {
      void runtimeRef
        .current!.metrics()
        .then((next) => {
          if (!cancelled) setMetrics(next);
        })
        .catch(() => {
          if (!cancelled) setMetrics(null);
        });
    };
    run();
    const timer = setInterval(run, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [canAccessOperatorRuntime, operatorState?.enabled, operatorState?.version, state.phase]);
  useEffect(() => {
    if (!canAccessOperatorRuntime) return;
    let cancelled = false;
    const run = () => {
      void runtimeRef
        .current!.refreshState()
        .then((next) => {
          if (!cancelled && next.enabled) {
            void runtimeRef.current!.waitForSync().catch(() => {});
            if (webSessionRef.current)
              void runtimeRef.current!.session("heartbeat", webSessionRef.current).catch(() => {});
          }
        })
        .catch(() => {});
    };
    run();
    const timer = setInterval(run, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [canAccessOperatorRuntime]);
  function saveAudioPreferences(preferences: AudioPreferences) {
    if (isCallBusy(state.phase)) return;
    try {
      localStorage.setItem(`inpulse:phone-audio:${identity}`, JSON.stringify(preferences));
      setAudioPreferences(preferences);
    } catch {
      setSyncError("Não foi possível salvar as preferências neste navegador.");
    }
  }
  function testAudio() {
    if (isCallBusy(state.phase)) return;
    try {
      const audio = new Audio();
      const stop = startPhoneTone(audio, preferencesRef.current, false, () =>
        setAudioBlocked(true),
      );
      setTimeout(stop, 800);
    } catch {
      setAudioBlocked(true);
    }
  }
  useEffect(() => {
    setAudioPreferences(readAudioPreferences(identity));
  }, [identity]);
  useEffect(() => {
    const audio = toneRef.current;
    const incoming = state.phase === "incoming" && audioPreferences.ringEnabled;
    const outgoing =
      ["dialing", "ringing"].includes(state.phase) && audioPreferences.dialToneEnabled;
    if (!audio || (!incoming && !outgoing)) return;
    try {
      return startPhoneTone(audio, audioPreferences, incoming, () => setAudioBlocked(true));
    } catch {
      setAudioBlocked(true);
    }
  }, [state.phase, audioPreferences]);

  function disconnect() {
    if (webSessionRef.current) {
      void runtimeRef.current?.session("disconnect", webSessionRef.current).catch(() => {});
      webSessionRef.current = null;
    }
    epochRef.current++;
    connectingRef.current = false;
    phoneRef.current?.disconnect();
    phoneRef.current = null;
    releaseRef.current?.();
    releaseRef.current = null;
    if (mountedRef.current) setState((current) => ({ ...current, connection: "disconnected" }));
  }

  useEffect(() => {
    mountedRef.current = true;
    runtimeRef.current!.activate();
    return () => {
      mountedRef.current = false;
      disconnect();
      runtimeRef.current?.dispose();
    };
    // Identity/feature changes remount this component; token refresh does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Screens hosting the panel (the attendance area). Elsewhere the panel appears only during a call.
  const [panelHosts, setPanelHosts] = useState(0);
  const hostPanel = useCallback(() => {
    setPanelHosts((count) => count + 1);
    return () => setPanelHosts((count) => count - 1);
  }, []);

  const busy = isCallBusy(state.phase);
  useEffect(() => {
    if (!busy) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  function playAudio() {
    const audio = audioRef.current?.srcObject ? audioRef.current : toneRef.current;
    if (!audio?.srcObject) return;
    void (audio === toneRef.current ? resumePhoneTone(audio) : audio.play())
      .then(() => setAudioBlocked(false))
      .catch(() => setAudioBlocked(true));
  }

  async function connect() {
    if (!enabled || !tokenRef.current || connectingRef.current || busy) return;
    disconnect();
    const epoch = epochRef.current;
    connectingRef.current = true;
    setState((current) => ({ ...current, connection: "connecting", error: null }));
    let release: (() => void) | null = null;
    try {
      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        !window.RTCPeerConnection
      ) {
        throw new Error("A telefonia precisa de HTTPS e de um navegador com acesso ao microfone.");
      }
      release = await acquirePhoneTabLock(identity);
      if (epoch !== epochRef.current) {
        release();
        return;
      }
      releaseRef.current = release;
      usersService.setAuth(tokenRef.current);
      const [config, { createBrowserPhone }] = await Promise.all([
        usersService.getWebrtcConfig(),
        import("./create-browser-phone"),
      ]);
      if (epoch !== epochRef.current) {
        release();
        return;
      }
      setAllowAutoAnswer(config.allowAutoAnswer ?? false);
      await runtimeRef.current!.refreshState().catch(() => {
        setSyncError(
          "Estado do CRM indisponível. Chamadas recebidas terão sincronização pendente.",
        );
      });
      const phone = createBrowserPhone(
        {
          onState: (next) => {
            if (
              next.connection === "ready" &&
              !webSessionRef.current &&
              operatorStateRef.current?.enabled
            ) {
              webSessionRef.current = crypto.randomUUID();
              void runtimeRef.current!.session("connect", webSessionRef.current).catch(() => {});
            }
            if (next.connection !== "ready" && webSessionRef.current) {
              void runtimeRef.current!.session("disconnect", webSessionRef.current).catch(() => {});
              webSessionRef.current = null;
            }
            if (mountedRef.current) setState(next);
          },
          onAudio: (stream) => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.srcObject = stream;
            if (stream) {
              audio.volume = preferencesRef.current.outputVolume;
              if ("setSinkId" in audio)
                void audio
                  .setSinkId(preferencesRef.current.outputId)
                  .then(playAudio)
                  .catch(() =>
                    setSyncError(
                      "A saída de áudio selecionada não está disponível. Escolha outro aparelho.",
                    ),
                  );
              else playAudio();
            } else {
              audio.pause();
              if (mountedRef.current) setAudioBlocked(false);
            }
          },
          prepareCall: (input) => runtimeRef.current!.prepareCall(input),
          reportCall: (input) => runtimeRef.current!.reportCall(input),
          canAutoAnswer: () =>
            preferencesRef.current.autoAnswer &&
            !!operatorStateRef.current &&
            (!operatorStateRef.current.enabled || operatorStateRef.current.state === "available"),
          codecOrder: () => preferencesRef.current.codecOrder,
        },
        () => preferencesRef.current,
      );
      phoneRef.current = phone;
      setSyncError(null);
      phone.connect(config);
    } catch (error) {
      if (epoch !== epochRef.current) return;
      phoneRef.current?.disconnect();
      phoneRef.current = null;
      release?.();
      releaseRef.current = null;
      const message =
        error instanceof Error && !("isAxiosError" in error)
          ? error.message
          : "Não foi possível carregar o ramal. Peça ao administrador para conferir a configuração WebRTC e SIP.";
      setState((current) => ({ ...current, connection: "error", error: message }));
    } finally {
      if (epoch === epochRef.current) connectingRef.current = false;
    }
  }

  const value: TelephonyContextValue = {
    runtime: runtimeRef.current!,
    operatorState,
    refreshOperator,
    metrics,
    canAccessOperatorRuntime,
    enabled,
    hostPanel,
    state,
    busy,
    audioBlocked,
    syncError,
    connect,
    disconnect,
    playAudio,
    audioPreferences,
    allowAutoAnswer,
    saveAudioPreferences,
    testAudio,
    transfer: (extension) => phoneRef.current?.transfer(extension),
    waitForSync: () => runtimeRef.current!.waitForSync(),
    dial: async (number, scheduleId) => {
      if (!phoneRef.current) throw new Error("Conecte a telefonia antes de ligar.");
      await phoneRef.current.dial(number, scheduleId);
    },
    answer: async () => {
      if (operatorStateRef.current?.enabled && operatorStateRef.current.state === "paused")
        await runtimeRef.current!.commandPause("resume", undefined, true);
      await phoneRef.current?.answer();
    },
    hangup: () => phoneRef.current?.hangup(),
    toggleMute: () => phoneRef.current?.toggleMute(),
    toggleHold: () => phoneRef.current?.toggleHold(),
    sendTone: (tone) => phoneRef.current?.sendTone(tone),
  };
  return (
    <TelephonyContext.Provider value={value}>
      {children}
      <audio ref={audioRef} autoPlay aria-label="Áudio da ligação" />
      <audio ref={toneRef} aria-label="Toque do telefone" />
      {/* Outside the attendance area the phone stays out of the way, except to answer or end a call. */}
      {enabled && panelHosts === 0 && busy && <TelephonyPanel placement="floating" />}
    </TelephonyContext.Provider>
  );
}
