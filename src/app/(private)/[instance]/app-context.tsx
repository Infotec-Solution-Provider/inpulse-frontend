import { Modal } from "@mui/material";
import { createContext, ReactElement, ReactNode, useState } from "react";

interface AppContextProps {
  modal: ReactNode;
  openModal: (modal: ReactElement) => void;
  closeModal: () => void;
}

export const AppContext = createContext({} as AppContextProps);

export default function AppProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ReactElement | null>(null);

  const openModal = (modal: ReactElement) => {
    setModal(modal);
  };

  const closeModal = () => {
    setModal(null);
  };

  return (
    <AppContext.Provider
      value={{
        modal,
        openModal,
        closeModal,
      }}
    >
      {children}
      {modal && (
        <Modal open={!!modal} onClose={closeModal} className="flex items-center justify-center">
          {modal}
        </Modal>
      )}
    </AppContext.Provider>
  );
}
