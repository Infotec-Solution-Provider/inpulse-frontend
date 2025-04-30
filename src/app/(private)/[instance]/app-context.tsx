"use client";
import { createContext, ReactElement, ReactNode, useContext, useEffect } from "react";

interface AppContextProps {
  modal: ReactNode;
  openModal: (modal: ReactElement) => void;
  closeModal: () => void;
}

interface AppProviderProps {
  children: ReactNode;
  modal: ReactNode | null;
  setModal: (modal: ReactNode | null) => void;
}

export const AppContext = createContext({} as AppContextProps);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

export default function AppProvider({ children, modal, setModal }: AppProviderProps) {
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
