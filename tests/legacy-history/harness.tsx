import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import LegacyChatHistoryModal from "../../src/lib/components/legacy-chat-history-modal";
import ContactsTableItem from "../../src/app/(private)/[instance]/(cruds)/contacts/(table)/table-item";
import { useHistoryChatId } from "./doubles";
function ChatHistory() {
  const [open, setOpen] = useState(true);
  const chatId = useHistoryChatId();
  return open ? <LegacyChatHistoryModal chatId={chatId} onClose={() => setOpen(false)} /> : <p>Histórico fechado</p>;
}
const contact = { id: 149, name: "Contato sintético", phone: "5511999999999", instance: "odim", customerId: 1, sectors: [] };
createRoot(document.getElementById("root")!).render(new URLSearchParams(location.search).get("mode") === "chat" ? <ChatHistory /> :
  <table><tbody><ContactsTableItem contact={contact as any} openEditModalHandler={() => {}} deleteContactHandler={() => {}} /></tbody></table>);
