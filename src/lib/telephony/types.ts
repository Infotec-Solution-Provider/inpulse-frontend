export interface WebrtcConfig {
  websocketUrl: string;
  domain: string;
  extension: string;
  uri: string;
  authorizationUser: string;
  password: string;
  iceServers: RTCIceServer[];
  allowAutoAnswer?: boolean;
}

export type CallPhase = "idle" | "preparing" | "dialing" | "ringing" | "incoming" | "active" | "ended" | "failed";
export interface PhoneState {
  connection: "disconnected" | "connecting" | "ready" | "error";
  phase: CallPhase;
  number: string;
  extension: string;
  muted: boolean;
  error: string | null;
  startedAt: string | null;
  answeredAt?: string | null;
  endedAt: string | null;
  scheduleId: number | null;
  callId?: string | null;
  transferPending?: boolean;
}

export const initialPhoneState: PhoneState = {
  connection: "disconnected", phase: "idle", number: "", extension: "", muted: false,
  error: null, startedAt: null, answeredAt: null, endedAt: null, scheduleId: null, callId: null, transferPending: false,
};

export function isCallBusy(phase: CallPhase) {
  return ["preparing", "dialing", "ringing", "incoming", "active"].includes(phase);
}

export const callPhaseLabels: Record<CallPhase, string> = {
  idle: "Sem ligação", preparing: "Preparando microfone", dialing: "Ligando",
  ringing: "Chamando", incoming: "Chamada recebida", active: "Em conversa",
  ended: "Ligação encerrada", failed: "Ligação não completada",
};

export function normalizeDialTarget(value: string): string {
  const number = value.replace(/[\s().-]/g, "");
  if (!/^\+?[0-9*#]{1,32}$/.test(number)) throw new Error("Informe um telefone ou ramal válido.");
  return number;
}
