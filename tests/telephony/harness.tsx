import { useState } from "react";
import { createRoot } from "react-dom/client";
import { TelephonyProvider, useTelephony } from "../../src/lib/telephony/telephony-provider";
import "./harness.css";
function Page() {
  const [page, setPage] = useState(1);
  const phone = useTelephony();
  return <main className="p-8"><h1 className="text-xl">Atendimento — página {page}</h1><button className="my-4 rounded bg-slate-300 px-4 py-2" onClick={() => setPage(page + 1)}>Navegar</button><br /><button onClick={() => void phone.dial("102", 42)}>Ligar agendamento</button></main>;
}
createRoot(document.getElementById("root")!).render(<TelephonyProvider><Page /></TelephonyProvider>);
