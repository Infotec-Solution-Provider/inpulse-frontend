import { applyCodecPreferences } from "./audio-preferences";
import type { UA } from "jssip";
import type { RTCSessionEvent } from "jssip/lib/UA";
import type { RTCSession } from "jssip/lib/RTCSession";
import { initialPhoneState, isCallBusy, normalizeDialTarget, type PhoneState, type WebrtcConfig } from "./types";

export interface ScheduledCall { scheduleId: number; callId: string }
export interface CallPreparation { callId: string; direction: "outgoing" | "incoming"; number: string; scheduleId?: number }
export interface CallReport { callId: string; eventId: string; type: "sent" | "ringing" | "answered" | "ended" | "failed" | "rejected" | "transferred"; occurredAt: string; detail?: string; sipCallId?: string }
interface Dependencies {
  prepareCall?: (input: CallPreparation) => Promise<void>;
  reportCall?: (input: CallReport) => void;
  canAutoAnswer?: () => boolean;
  codecOrder?: () => string[];
  createAgent: (config: WebrtcConfig) => UA;
  getMicrophone: () => Promise<MediaStream>;
  createStream: () => MediaStream;
  onState: (state: PhoneState) => void;
  onAudio: (stream: MediaStream | null) => void;
  prepareSchedule?: (scheduleId: number, phone: string) => Promise<ScheduledCall>;
  reportSchedule?: (call: ScheduledCall, state: "answered" | "ended" | "failed") => void;
}

export class BrowserPhone {
  private agent: UA | null = null;
  private session: RTCSession | null = null;
  private localStream: MediaStream | null = null;
  private config: WebrtcConfig | null = null;
  private scheduledCall: ScheduledCall | null = null;
  private attempt = 0;
  private callId: string | null = null;
  private transferTimer: ReturnType<typeof setTimeout> | null = null;
  private state: PhoneState = { ...initialPhoneState };
  private registrationTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly deps: Dependencies) {}

  private report(type: CallReport["type"], detail?: string, callId = this.callId) {
    if (callId) this.deps.reportCall?.({ callId, eventId: crypto.randomUUID(), type, occurredAt: new Date().toISOString(), ...(detail ? { detail } : {}) });
  }

  private update(patch: Partial<PhoneState>) {
    this.state = { ...this.state, ...patch };
    this.deps.onState(this.state);
  }

  connect(config: WebrtcConfig) {
    this.disconnect();
    this.config = config;
    const agent = this.deps.createAgent(config);
    this.agent = agent;
    this.update({ ...initialPhoneState, connection: "connecting", extension: config.extension });
    const clearTimer = () => {
      if (this.registrationTimer) clearTimeout(this.registrationTimer);
      this.registrationTimer = null;
    };
    agent.on("registered", () => {
      if (this.agent !== agent) return;
      clearTimer();
      this.update({ connection: "ready", error: null });
    });
    agent.on("registrationFailed", () => {
      if (this.agent !== agent) return;
      clearTimer();
      this.update({ connection: "error", error: "Não foi possível registrar o ramal. Confira a configuração com o administrador." });
    });
    agent.on("unregistered", () => {
      if (this.agent === agent) this.update({ connection: "error", error: "O ramal perdeu o registro. Reconecte a telefonia." });
    });
    agent.on("disconnected", () => {
      if (this.agent === agent) this.update({ connection: "error", error: "Conexão com a telefonia perdida. Nenhuma chamada será repetida automaticamente." });
    });
    agent.on("newRTCSession", (event: RTCSessionEvent) => {
      if (this.agent !== agent) return;
      if (event.originator === "remote") {
        const callId = crypto.randomUUID();
        const number = event.session.remote_identity.uri.user || "Número desconhecido";
        // Runtime client queues incoming preparation before events; receiving is preserved while offline.
        void this.deps.prepareCall?.({ callId, direction: "incoming", number }).catch(() => {});
        this.report("ringing", undefined, callId);
        if (isCallBusy(this.state.phase)) { this.report("rejected", "busy", callId); event.session.terminate({ status_code: 486 }); return; }
        this.callId = callId;
        this.scheduledCall = null;
        this.update({ phase: "incoming", number: event.session.remote_identity.uri.user || "Número desconhecido", scheduleId: null, callId, transferPending: false, startedAt: new Date().toISOString(), answeredAt: null, endedAt: null, error: null, muted: false });
      }
      this.bindSession(event.session);
      if (event.originator === "remote" && this.config?.allowAutoAnswer && this.deps.canAutoAnswer?.()) void this.answer();
    });
    this.registrationTimer = setTimeout(() => {
      if (this.agent === agent && !agent.isRegistered()) {
        this.update({ connection: "error", error: "O ramal não registrou. Verifique o endereço WSS, certificado e credenciais." });
      }
    }, 20_000);
    agent.start();
  }

  async dial(value: string, scheduleId?: number) {
    const number = normalizeDialTarget(value);
    if (!this.agent?.isRegistered() || !this.config) throw new Error("Conecte a telefonia antes de ligar.");
    if (isCallBusy(this.state.phase)) throw new Error("Já existe uma ligação em andamento.");
    const attempt = ++this.attempt;
    this.scheduledCall = null;
    const callId = crypto.randomUUID();
    this.callId = null;
    this.update({ phase: "preparing", callId: null, transferPending: false, number, scheduleId: scheduleId ?? null, startedAt: null, answeredAt: null, endedAt: null, error: null, muted: false });
    let preparingSchedule = false;
    try {
      const stream = await this.deps.getMicrophone();
      if (attempt !== this.attempt) { stream.getTracks().forEach(track => track.stop()); return; }
      this.localStream = stream;
      this.callId = callId;
      this.update({ callId });
      if (this.deps.prepareCall) {
        preparingSchedule = true;
        await this.deps.prepareCall({ callId, direction: "outgoing", number, ...(scheduleId !== undefined ? { scheduleId } : {}) });
        preparingSchedule = false;
        if (attempt !== this.attempt) { this.report("failed", "cancelled_before_sent", callId); return; }
      } else if (scheduleId !== undefined && this.deps.prepareSchedule) {
        preparingSchedule = true;
        const prepared = await this.deps.prepareSchedule(scheduleId, number);
        preparingSchedule = false;
        if (attempt !== this.attempt) { this.deps.reportSchedule?.(prepared, "failed"); return; }
        this.scheduledCall = prepared;
      }
      if (!this.agent?.isRegistered() || !this.config) throw new Error("O ramal perdeu a conexão antes da discagem.");
      this.update({ phase: "dialing", startedAt: new Date().toISOString() });
      const session = this.agent.call(`sip:${number.replace(/#/g, "%23")}@${this.config.domain}`, {
        mediaStream: stream, mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers: this.config.iceServers },
      });
      // JsSIP emits newRTCSession synchronously; the fallback also supports adapters.
      if (!this.session && !session.isEnded()) this.bindSession(session);
    } catch (error) {
      if (attempt !== this.attempt) return;
      const message = error instanceof Error && error.name === "NotAllowedError"
        ? "Permita o acesso ao microfone para ligar."
        : preparingSchedule
          ? "Não foi possível confirmar o início do atendimento no CRM. Nenhuma chamada foi enviada."
          : "Não foi possível iniciar a ligação. Confira o microfone e a conexão do ramal.";
      this.complete("failed", message);
      throw new Error(message);
    }
  }

  async answer() {
    const session = this.session;
    if (!session || this.state.phase !== "incoming" || !this.config) return;
    const attempt = ++this.attempt;
    this.update({ phase: "preparing" });
    try {
      const stream = await this.deps.getMicrophone();
      if (attempt !== this.attempt || this.session !== session || session.isEnded()) {
        stream.getTracks().forEach(track => track.stop()); return;
      }
      this.localStream = stream;
      session.answer({ mediaStream: stream, mediaConstraints: { audio: true, video: false }, pcConfig: { iceServers: this.config.iceServers } });
    } catch {
      if (attempt !== this.attempt || this.session !== session) return;
      this.hangup();
      this.update({ phase: "failed", error: "Não foi possível acessar o microfone para atender." });
    }
  }

  private bindSession(session: RTCSession) {
    if (this.session === session) return;
    this.session = session;
    const current = () => this.session === session;
    const attachAudio = (connection: RTCPeerConnection) => {
      const remote = this.deps.createStream();
      const addTrack = (track: MediaStreamTrack) => {
        if (!current() || track.kind !== "audio") return;
        if (!remote.getTracks().some(item => item.id === track.id)) remote.addTrack(track);
        this.deps.onAudio(remote);
      };
      connection.getReceivers().forEach(receiver => { if (receiver.track) addTrack(receiver.track); });
      connection.addEventListener("track", event => addTrack(event.track));
      connection.addEventListener("connectionstatechange", () => {
        if (current() && connection.connectionState === "failed") {
          this.complete("failed", "A conexão de áudio falhou. Verifique a rede e a configuração ICE/TURN.");
        }
      });
    };
    session.on("peerconnection", ({ peerconnection }) => attachAudio(peerconnection));
    if (session.connection) attachAudio(session.connection);
    session.on("connecting", () => { if (current() && session.connection) applyCodecPreferences(session.connection, this.deps.codecOrder?.() ?? []); });
    session.on("sending", () => { if (current()) this.report("sent"); });
    session.on("progress", () => { if (current() && session.direction === "outgoing" && this.state.phase === "dialing") { this.update({ phase: "ringing" }); this.report("ringing"); } });
    session.on("confirmed", () => {
      if (!current()) return;
      const answeredAt = new Date().toISOString();
      this.update({ phase: "active", startedAt: this.state.startedAt || answeredAt, answeredAt });
      this.report("answered");
      if (this.scheduledCall) this.deps.reportSchedule?.(this.scheduledCall, "answered");
    });
    session.on("ended", () => { if (current()) this.complete("ended"); });
    session.on("failed", () => { if (current()) this.complete("failed", "A ligação não foi completada ou foi recusada."); });
  }

  private complete(phase: "ended" | "failed", error: string | null = null, report = true) {
    this.attempt++;
    const session = this.session;
    this.session = null;
    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;
    this.deps.onAudio(null);
    if (report) this.report(phase);
    if (this.transferTimer) clearTimeout(this.transferTimer);
    this.transferTimer = null;
    if (this.scheduledCall) this.deps.reportSchedule?.(this.scheduledCall, phase);
    this.scheduledCall = null;
    this.update({ phase, error, muted: false, transferPending: false, held: false, holdPending: false, endedAt: new Date().toISOString() });
    if (phase === "failed") {
      try { if (session && !session.isEnded()) session.terminate(); } catch { /* Already released media. */ }
    }
  }

  hangup() {
    if (!isCallBusy(this.state.phase)) return;
    const session = this.session;
    if (this.state.phase === "incoming") this.report("rejected", "operator");
    this.complete("ended");
    try { if (session && !session.isEnded()) session.terminate(); } catch { /* Media is already released; never redial. */ }
  }

  transfer(value: string) {
    const target = value.trim();
    const session = this.session;
    if (!session || this.state.phase !== "active" || !this.config || this.state.transferPending || this.state.holdPending) throw new Error("Aguarde uma conversa ativa para transferir.");
    if (!/^[0-9]{1,16}$/.test(target) || target === this.config.extension || target === this.state.number) throw new Error("Informe outro ramal interno válido.");
    this.update({ transferPending: true, error: null });
    const failed = () => {
      if (this.session !== session) return;
      if (this.transferTimer) clearTimeout(this.transferTimer);
      this.transferTimer = null;
      this.update({ transferPending: false, error: "A transferência não foi confirmada. A ligação permanece disponível." });
    };
    this.transferTimer = setTimeout(failed, 30_000);
    try {
      session.refer(`sip:${target}@${this.config.domain}`, { eventHandlers: {
        // A successful REFER response only accepts the request. NOTIFY accepted confirms the destination.
        requestFailed: failed, failed,
        accepted: () => {
          if (this.session !== session) return;
          this.report("transferred", target);
          this.complete("ended", null, false);
          try { if (!session.isEnded()) session.terminate(); } catch { /* Released already. */ }
        },
      } });
    } catch { failed(); }
  }

  toggleMute() {
    if (!this.session || this.state.phase !== "active") return;
    const muted = !this.state.muted;
    if (muted) this.session.mute({ audio: true });
    else this.session.unmute({ audio: true });
    this.update({ muted });
  }

  toggleHold() {
    const session = this.session;
    if (!session || this.state.phase !== "active" || this.state.holdPending || this.state.transferPending) return;
    const held = Boolean(this.state.held);
    this.update({ holdPending: true, error: null });
    const confirmed = () => {
      if (this.session === session) this.update({ held: !held, holdPending: false });
    };
    try {
      if (held ? session.unhold({}, confirmed) : session.hold({}, confirmed)) return;
    } catch {
      // A mid-dialog SIP request can be rejected before renegotiation starts.
    }
    if (this.session === session) {
      this.update({ holdPending: false, error: "Não foi possível alterar a espera. Tente novamente com a ligação ativa." });
    }
  }

  sendTone(tone: string) {
    if (this.state.phase === "active" && /^[0-9*#]$/.test(tone)) this.session?.sendDTMF(tone);
  }

  disconnect() {
    this.hangup();
    this.attempt++;
    const agent = this.agent;
    this.agent = null;
    this.config = null;
    if (this.registrationTimer) clearTimeout(this.registrationTimer);
    this.registrationTimer = null;
    agent?.stop();
    this.update({ connection: "disconnected" });
  }
}
