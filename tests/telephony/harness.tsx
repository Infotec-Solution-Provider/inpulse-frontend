import { useState } from "react";
import { createRoot } from "react-dom/client";
import { TelephonyProvider, useTelephony } from "../../src/lib/telephony/telephony-provider";
import { TelephonyPanelSlot } from "../../src/lib/telephony/telephony-panel";
import "./harness.css";
function Attendance({ onLeave }: { onLeave: () => void }) {
  const [page, setPage] = useState(1);
  const phone = useTelephony();
  return <main className="p-8"><h1 className="text-xl">Atendimento — página {page}</h1><button className="my-4 rounded bg-slate-300 px-4 py-2" onClick={() => setPage(page + 1)}>Navegar</button><br /><button onClick={() => void phone.dial("102", 42)}>Ligar agendamento</button><br /><button onClick={onLeave}>Ir para outra tela</button><TelephonyPanelSlot /></main>;
}
function OtherScreen({ onBack }: { onBack: () => void }) {
  return <main className="p-8"><h1 className="text-xl">Outra tela</h1><button onClick={onBack}>Voltar ao atendimento</button></main>;
}
function App() {
  const [screen, setScreen] = useState<"attendance" | "other">("attendance");
  return screen === "attendance" ? <Attendance onLeave={() => setScreen("other")} /> : <OtherScreen onBack={() => setScreen("attendance")} />;
}
createRoot(document.getElementById("root")!).render(<TelephonyProvider><App /></TelephonyProvider>);
