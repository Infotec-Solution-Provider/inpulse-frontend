import { createRoot } from "react-dom/client";
import { useState, type ReactNode } from "react";
import { createTheme, ThemeProvider } from "@mui/material";
import { ToastContainer } from "react-toastify";
import StartChatModalItem from "../../src/app/(private)/[instance]/(main)/(chats-menu)/(start-chat-modal)/start-chat-modal-item";
import type { WppContact } from "../../src/lib/sdk-local";
import { AppContext } from "./doubles";

function Harness() {
  const [modal, setModal] = useState<ReactNode>(null);
  const [selected, setSelected] = useState(0);
  const [closed, setClosed] = useState(0);
  return (
    <ThemeProvider theme={createTheme()}>
      <AppContext.Provider value={{ openModal: setModal, closeModal: () => { setModal(null); setClosed((count) => count + 1); } }}>
        <StartChatModalItem
          contact={{ id: 8, instance: "fixture", name: "Contato de teste", phone: "5511999990000" } as WppContact}
          onSelect={() => setSelected((count) => count + 1)}
        />
        <div>{modal}</div>
      </AppContext.Provider>
      <output data-testid="selected">{selected}</output>
      <output data-testid="closed">{closed}</output>
      <ToastContainer autoClose={false} />
    </ThemeProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
