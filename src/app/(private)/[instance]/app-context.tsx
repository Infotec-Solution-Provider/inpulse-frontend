"use client";
import {
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

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
  const openModal = useCallback(
    (modal: ReactElement) => {
      setModal(modal);
    },
    [setModal],
  );

  const closeModal = useCallback(() => {
    setModal(null);
  }, [setModal]);

  const value = useMemo(() => ({ modal, openModal, closeModal }), [closeModal, modal, openModal]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
