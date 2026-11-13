import { createRoot } from "react-dom/client";
import "../telephony/harness.css";
import TelephoneFinishModal from "../../src/app/(private)/[instance]/(main)/(chats-menu)/telephone-finish-modal";
import { mapTelephonyScheduleToQueueItem } from "../../src/app/(private)/[instance]/(main)/(chats-menu)/telephone-dialer.types";
const state = { legacy: 0, committed: 0, before: 0 };
declare global {
  interface Window {
    finishHarness: typeof state;
  }
}
window.finishHarness = state;
const appointment = mapTelephonyScheduleToQueueItem({
  CODIGO: 41,
  CLIENTE: 3,
  CAMPANHA: 2,
  OPERADOR: 7,
  CONCLUIDO: "NAO",
  FONE1: "51999999999",
  FONE2: "51988888888",
  CLIENTE_RAZAO: "Cliente fixture",
  DT_AGENDAMENTO: "2026-11-13 10:00:00",
} as any);
createRoot(document.getElementById("root")!).render(
  <main
    style={{
      display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      padding: 16,
      background: "#f1f5f9",
      minHeight: "100vh",
    }}
  >
    <TelephoneFinishModal
      appointment={appointment}
      onConfirm={async () => {
        state.legacy++;
      }}
      onCheckConfirmation={async () => "not_confirmed"}
      beforeV2Confirm={async () => {
        state.before++;
      }}
      onV2Committed={async () => {
        state.committed++;
      }}
    />
  </main>,
);
