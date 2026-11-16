import { createContext, useContext, type ReactNode } from "react";
import {
  AuthContext,
  WhatsappContext,
  InternalChatContext,
  internal,
  whatsapp,
  useEnvironment,
} from "../chat-send/doubles";
export { AuthContext, WhatsappContext, InternalChatContext };
export const useAuthContext = () => useContext(AuthContext),
  useWhatsappContext = () => useContext(WhatsappContext);
export const AppContext = createContext({
  modal: null,
  openModal: (_v: unknown) => {},
  closeModal: () => {},
});
export const useAppContext = () => useContext(AppContext);
export function AppProvider({ children,modal,setModal }: { children: ReactNode;modal:any;setModal:(value:any)=>void }) { return <AppContext.Provider value={{modal,openModal:setModal,closeModal:()=>setModal(null)}}>{children}</AppContext.Provider>; }
export function Passthrough({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
export function Empty() {
  return null;
}
export function WppProvider({ children }: { children: ReactNode }) {
  const env = useEnvironment();
  return (
    <WhatsappContext.Provider
      value={
        {
          ...whatsapp,
          ...env,
          loaded: true,
          parameters: { feature_telephony_dialer_enabled: new URLSearchParams(location.search).has("dialer-off") ? "false" : "true", feature_crm_customers_enabled:"true",feature_crm_campaigns_enabled:"true" },
        } as never
      }
    >
      {children}
    </WhatsappContext.Provider>
  );
}
export function InternalChatProvider({ children }: { children: ReactNode }) {
  return <InternalChatContext.Provider value={internal}>{children}</InternalChatContext.Provider>;
}
