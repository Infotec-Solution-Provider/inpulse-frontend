import { createRoot } from "react-dom/client";
import { useState, type ReactNode } from "react";
import { createTheme, ThemeProvider, Modal } from "@mui/material";
import ChannelSessionPanel from "../../src/app/(private)/[instance]/(cruds)/channels/session-panel";
import { AppContext } from "./doubles";
import "../monitor/harness.css";

function Harness() {
  const [modal, setModal] = useState<ReactNode>(null);
  return (
    <ThemeProvider theme={createTheme()}>
      <AppContext.Provider value={{ openModal: setModal, closeModal: () => setModal(null) }}>
        <ChannelSessionPanel />
        <Modal
          open={!!modal}
          onClose={() => setModal(null)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div>{modal}</div>
        </Modal>
      </AppContext.Provider>
    </ThemeProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
