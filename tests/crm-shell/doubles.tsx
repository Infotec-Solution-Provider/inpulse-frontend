import { createContext, useContext, type ReactNode } from "react";
import { harness as phoneHarness } from "../telephony/doubles";
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

// Simulate a backend surviving a document reload. This fixture storage is not application persistence.
const runtimeStateKey = "crm-shell:server-runtime-state";
if (phoneHarness.runtimeEnabled) {
  const saved = sessionStorage.getItem(runtimeStateKey);
  if (saved) Object.assign(phoneHarness.runtimeState, JSON.parse(saved));
  const runtimeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await runtimeFetch(input, init);
    const target = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (target.startsWith("http://runtime.fixture/api/telephony/operator-state") && response.ok)
      sessionStorage.setItem(runtimeStateKey, JSON.stringify(phoneHarness.runtimeState));
    return response;
  };
}
export const AppContext = createContext({
  modal: null,
  openModal: (_v: unknown) => {},
  closeModal: () => {},
});
export const useAppContext = () => useContext(AppContext);
export function AppProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
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
          parameters: {
            feature_telephony_dialer_enabled: "true",
            feature_crm_customers_enabled: "true",
            feature_crm_units_campaigns_enabled: "true",
          },
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
