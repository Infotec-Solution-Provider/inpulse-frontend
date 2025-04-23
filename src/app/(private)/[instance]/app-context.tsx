"use client";
import { createContext, ReactElement, ReactNode, useEffect, useState } from "react";

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

  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        modal,
        openModal,
        closeModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
