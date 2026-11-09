import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import FrontendSessionGate from "../../src/lib/components/frontend-session-gate";
import FrontendVersionSwitch from "../../src/lib/components/frontend-version-switch";
import LegacyChatHistoryModal from "../../src/lib/components/legacy-chat-history-modal";
import ModuleRouteGate from "../../src/lib/components/module-route-gate";
import { CrmLeaveGuardProvider, useCrmLeaveGuard } from "../../src/lib/ui-system/leave-guard";
import "./doubles";

function Probe() {
  (window as any).flagTest.state.renders++;
  useEffect(() => { (window as any).flagTest.state.effects++; }, []);
  return <p>Módulo montado</p>;
}
function Draft() {
  const [value, setValue] = useState("");
  useCrmLeaveGuard(Boolean(value));
  return <><p>Interface {location.pathname.startsWith("/nova/") ? "nova" : "atual"}</p><label>Rascunho<input value={value} onChange={event => setValue(event.target.value)} /></label><FrontendVersionSwitch /></>;
}
function History() {
  const [open, setOpen] = useState(true);
  return open ? <LegacyChatHistoryModal chatId={41} onClose={() => setOpen(false)} /> : <p>Histórico fechado</p>;
}
createRoot(document.getElementById("root")!).render(
  new URLSearchParams(location.search).get("mode") === "history" ? <History /> :
  new URLSearchParams(location.search).get("mode") === "route"
    ? <ModuleRouteGate><Probe /></ModuleRouteGate>
    : <FrontendSessionGate><CrmLeaveGuardProvider scope="odim:23" navigate={url => location.assign(url)}><Draft /></CrmLeaveGuardProvider></FrontendSessionGate>,
);
