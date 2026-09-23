"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuthContext } from "@/app/auth-context";
import { useWhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { FEATURE_FLAGS, isFeatureEnabled } from "../feature-flags";
import usersService from "../services/users.service";
import customersService from "../services/customers.service";
import type { BrowserPhone } from "./browser-phone";
import { acquirePhoneTabLock } from "./phone-tab-lock";
import { initialPhoneState, isCallBusy, type PhoneState } from "./types";
import { TelephonyPanel } from "./telephony-panel";

interface TelephonyContextValue {
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
  sendTone: (tone: string) => void;
  playAudio: () => void;
  waitForSync: () => Promise<void>;
}
const TelephonyContext = createContext<TelephonyContextValue | null>(null);
export function useTelephony() {
  const context = useContext(TelephonyContext);
  if (!context) throw new Error("TelephonyProvider ausente.");
  return context;
}

export function TelephonyProvider({ children }: { children: ReactNode }) {
  const { token, instance, user } = useAuthContext();
  const { parameters } = useWhatsappContext();
  const enabled = !!token && isFeatureEnabled(parameters, FEATURE_FLAGS.telephonyDialer);
  const identity = `${instance}:${user?.CODIGO ?? ""}`;
  return <PhoneSession key={`${identity}:${enabled}`} identity={identity} token={token} enabled={enabled}>{children}</PhoneSession>;
}

function PhoneSession({ children, identity, token, enabled }: { children: ReactNode; identity: string; token: string | null; enabled: boolean }) {
  const [state, setState] = useState<PhoneState>({ ...initialPhoneState });
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const phoneRef = useRef<BrowserPhone | null>(null);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const releaseRef = useRef<(() => void) | null>(null);
  const connectingRef = useRef(false);
  const epochRef = useRef(0);
  const mountedRef = useRef(true);
  const syncRef = useRef<Promise<void>>(Promise.resolve());

  function disconnect() {
    epochRef.current++;
    connectingRef.current = false;
    phoneRef.current?.disconnect();
    phoneRef.current = null;
    releaseRef.current?.();
    releaseRef.current = null;
    if (mountedRef.current) setState(current => ({ ...current, connection: "disconnected" }));
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; disconnect(); };
    // Identity/feature changes remount this component; token refresh does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = isCallBusy(state.phase);
  useEffect(() => {
    if (!busy) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy]);

  function playAudio() {
    const audio = audioRef.current;
    if (!audio?.srcObject) return;
    void audio.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
  }

  async function connect() {
    if (!enabled || !tokenRef.current || connectingRef.current || busy) return;
    disconnect();
    const epoch = epochRef.current;
    connectingRef.current = true;
    setState(current => ({ ...current, connection: "connecting", error: null }));
    let release: (() => void) | null = null;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        throw new Error("A telefonia precisa de HTTPS e de um navegador com acesso ao microfone.");
      }
      release = await acquirePhoneTabLock(identity);
      if (epoch !== epochRef.current) { release(); return; }
      releaseRef.current = release;
      usersService.setAuth(tokenRef.current);
      const [config, { createBrowserPhone }] = await Promise.all([
        usersService.getWebrtcConfig(), import("./create-browser-phone"),
      ]);
      if (epoch !== epochRef.current) { release(); return; }
      const phone = createBrowserPhone({
        onState: next => { if (mountedRef.current) setState(next); },
        onAudio: stream => {
          const audio = audioRef.current;
          if (!audio) return;
          audio.srcObject = stream;
          if (stream) playAudio();
          else { audio.pause(); if (mountedRef.current) setAudioBlocked(false); }
        },
        prepareSchedule: async (scheduleId, number) => {
          customersService.setAuth(tokenRef.current!);
          const call = await customersService.startTelephonyScheduleCall(scheduleId, { dialedPhone: number });
          if (!call.callId) throw new Error("Falha ao registrar atendimento.");
          return { scheduleId, callId: call.callId };
        },
        reportSchedule: (call, next) => {
          const authToken = tokenRef.current;
          syncRef.current = syncRef.current.then(async () => {
            if (!authToken) return;
            customersService.setAuth(authToken);
            await customersService.reportTelephonyCall(call.scheduleId, call.callId, next);
          }).catch(() => {
            if (mountedRef.current) setSyncError("A atualização do atendimento não foi confirmada. Confira o histórico antes de finalizar. A ligação não será repetida.");
          });
        },
      });
      phoneRef.current = phone;
      setSyncError(null);
      phone.connect(config);
    } catch (error) {
      if (epoch !== epochRef.current) return;
      phoneRef.current?.disconnect();
      phoneRef.current = null;
      release?.();
      releaseRef.current = null;
      const message = error instanceof Error && !("isAxiosError" in error)
        ? error.message : "Não foi possível carregar o ramal. Peça ao administrador para conferir a configuração WebRTC e SIP.";
      setState(current => ({ ...current, connection: "error", error: message }));
    } finally {
      if (epoch === epochRef.current) connectingRef.current = false;
    }
  }

  const value: TelephonyContextValue = {
    state, busy, audioBlocked, syncError, connect, disconnect, playAudio,
    waitForSync: () => syncRef.current,
    dial: async (number, scheduleId) => {
      if (!phoneRef.current) throw new Error("Conecte a telefonia antes de ligar.");
      await phoneRef.current.dial(number, scheduleId);
    },
    answer: async () => { await phoneRef.current?.answer(); },
    hangup: () => phoneRef.current?.hangup(),
    toggleMute: () => phoneRef.current?.toggleMute(),
    sendTone: tone => phoneRef.current?.sendTone(tone),
  };
  return <TelephonyContext.Provider value={value}>
    {children}
    <audio ref={audioRef} autoPlay aria-label="Áudio da ligação" />
    {enabled && <TelephonyPanel />}
  </TelephonyContext.Provider>;
}
