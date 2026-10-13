import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { TelephonyProvider, useTelephony } from "../../src/lib/telephony/telephony-provider";
import { TelephonyPanelSlot } from "../../src/lib/telephony/telephony-panel";
import ConversationSidebar from "../../src/app/(private)/[instance]/(main)/(chats-menu)/conversation-sidebar";
import { UA, harness } from "./doubles";
import "./harness.css";

// Keep the real provider, browser phone and panel; only SIP and CRM are test doubles.
let registeredAgent: UA | null = null;
const start = UA.prototype.start;
UA.prototype.start = function () { registeredAgent = this; start.call(this); };
const layoutHarness = {
  tones: [] as string[],
  incoming() {
    const listeners = new Map<string, Array<(...args: any[]) => void>>();
    const session = {
      direction: "incoming", remote_identity: { uri: { user: "103" } }, ended: false,
      connection: Object.assign(new EventTarget(), { getReceivers: () => [], connectionState: "new" }),
      on(name: string, callback: (...args: any[]) => void) { listeners.set(name, [...(listeners.get(name) || []), callback]); },
      emit(name: string, data?: unknown) { for (const callback of listeners.get(name) || []) callback(data); },
      isEnded() { return this.ended; },
      terminate() { this.ended = true; this.emit("ended"); },
      answer(options: { mediaStream: MediaStream }) { harness.media = options.mediaStream; this.emit("confirmed"); },
      mute() { harness.media?.getAudioTracks().forEach(track => { track.enabled = false; }); },
      unmute() { harness.media?.getAudioTracks().forEach(track => { track.enabled = true; }); },
      sendDTMF(tone: string) { layoutHarness.tones.push(tone); },
    };
    registeredAgent?.emit("newRTCSession", { originator: "remote", session });
  },
};
declare global { interface Window { phoneLayoutHarness: typeof layoutHarness } }
window.phoneLayoutHarness = layoutHarness;

function Attendance({ onLeave }: { onLeave: () => void }) {
  const [page, setPage] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState("");
  const phone = useTelephony();
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const composer = <form aria-label="Compositor de mensagens" style={{ display: "flex", flexShrink: 0, gap: 8, padding: 12, background: "white" }} onSubmit={event => { event.preventDefault(); setSent(draft); setDraft(""); }}>
    <input aria-label="Mensagem" value={draft} onChange={event => setDraft(event.target.value)} style={{ minWidth: 0, flex: 1, border: "1px solid #94a3b8", padding: 8 }} />
    <button type="submit">Enviar mensagem</button>
  </form>;
  return <main style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <div style={{ padding: "8px 12px", flexShrink: 0, borderBottom: "1px solid #cbd5e1" }}>
      <h1 className="text-xl">Atendimento — página {page}</h1>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button onClick={() => setPage(page + 1)}>Navegar</button>
        <button onClick={() => void phone.dial("102", 42)}>Ligar agendamento</button>
        <button onClick={onLeave}>Ir para outra tela</button>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "minmax(0, 1fr)" : "24rem minmax(0, 1fr)", minHeight: 0, flex: 1, gap: mobile ? 0 : 8, padding: mobile ? 0 : 8 }}>
      <div data-testid="sidebar-container" style={{ minHeight: 0, display: mobile && chatOpen ? "none" : "block" }}>
        <ConversationSidebar
          telephony={<><TelephonyPanelSlot className="mx-3" /><section aria-label="Próxima ligação" style={{ margin: "0 12px 12px", padding: 12, border: "1px solid #cbd5e1", borderRadius: 6, background: "white" }}><h2>Próxima ligação</h2><p>Contato fictício</p><p>Campanha de teste</p></section></>}
          filters={<section aria-label="Filtros de conversas" style={{ padding: 12 }}><h2>Conversas</h2><label>Pesquisar conversa<input aria-label="Pesquisar conversa" style={{ width: "100%", border: "1px solid #94a3b8", padding: 8 }} /></label><div style={{ display: "flex", gap: 8, marginTop: 12 }}><label>Ordenar por<select aria-label="Ordenar por"><option>Última mensagem</option></select></label><label>Ordem<select aria-label="Ordem"><option>Decrescente</option></select></label></div></section>}
        >
          <div aria-label="Lista de conversas" style={{ height: "100%", overflowY: "auto" }}>
            {Array.from({ length: 40 }, (_, index) => <button key={index} style={{ display: "block", width: "100%", minHeight: 52, padding: 12, borderBottom: "1px solid #cbd5e1", textAlign: "left" }} onClick={() => setChatOpen(true)}>Conversa {index + 1}</button>)}
          </div>
        </ConversationSidebar>
      </div>
      <section aria-label="Área da conversa" style={{ display: mobile && !chatOpen ? "none" : "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        {mobile && chatOpen && <TelephonyPanelSlot className="max-h-[40%] shrink-0 overflow-y-auto p-2 md:hidden" />}
        <div style={{ minHeight: 0, flex: 1, overflowY: "auto", padding: 12 }}>
          <h2>Conversa aberta</h2><button onClick={() => setChatOpen(false)}>Voltar às conversas</button><p>{sent && `Mensagem enviada: ${sent}`}</p>
          {Array.from({ length: 12 }, (_, index) => <p key={index} style={{ marginTop: 24 }}>Mensagem fictícia {index + 1}</p>)}
        </div>
        {composer}
      </section>
    </div>
  </main>;
}
function OtherScreen({ onBack }: { onBack: () => void }) {
  return <main className="p-8"><h1 className="text-xl">Outra tela</h1><button onClick={onBack}>Voltar ao atendimento</button></main>;
}
function App() {
  const [screen, setScreen] = useState<"attendance" | "other">("attendance");
  return screen === "attendance" ? <Attendance onLeave={() => setScreen("other")} /> : <OtherScreen onBack={() => setScreen("attendance")} />;
}
createRoot(document.getElementById("root")!).render(<TelephonyProvider><App /></TelephonyProvider>);
