"use client";
import { CrmLeaveGuardProvider } from "@/lib/ui-system/leave-guard";
import AppProvider from "@/app/(private)/[instance]/app-context";
import SocketProvider from "@/app/(private)/[instance]/socket-context";
import { ThemeProvider } from "@/app/theme-context";
import { Modal } from "@mui/material";
import RouteFeatureGate from "@/lib/components/module-route-gate";
import { usePathname, useRouter } from "next/navigation";
import { ReactElement, ReactNode, useContext, useState } from "react";
import ContactsProvider from "./(cruds)/contacts/contacts-context";
import CustomersProvider from "./(cruds)/customers/customers-context";
import ReadyMessagesProvider from "./(cruds)/ready-messages/ready-messages-context";
import { InternalChatProvider } from "./internal-context";
import WhatsappProvider from "./whatsapp-context";
import ChatProvider from "./(main)/(chat)/chat-context";
import InternalGroupsProvider from "./(cruds)/internal-groups/internal-groups-context";
import { AuthContext } from "@/app/auth-context";
import { TelephonyProvider } from "@/lib/telephony/telephony-provider";
import CacheWarmup from "./cache-warmup";
import FrontendSessionGate from "@/lib/components/frontend-session-gate";
import { CrmQueryProvider, PilotDesignProvider } from "@/lib/ui-system";
import MonitorShell from "@/lib/ui-system/monitor-shell";
import { isModernCrmPath } from "@/lib/ui-system/navigation";

interface AppLayoutProps {
  children: ReactNode;
}

function AppModal({
  modal,
  setModal,
}: {
  modal: ReactNode;
  setModal: (value: ReactNode | null) => void;
}) {
  const modern = isModernCrmPath(usePathname());
  if (!modal) return null;
  return (
    <Modal
      open
      onClose={(_, reason) => {
        if (reason !== "backdropClick") setModal(null);
      }}
      className="flex items-center justify-center"
    >
      <div className={modern ? "ip-crud-modal-host" : undefined}>{modal as ReactElement}</div>
    </Modal>
  );
}

function AppFrame({
  children,
  modal,
  setModal,
}: AppLayoutProps & { modal: ReactNode; setModal: (value: ReactNode | null) => void }) {
  const pathname = usePathname();
  const { instance, user } = useContext(AuthContext);
  const router = useRouter();
  const content = (
    <>
      <RouteFeatureGate>{children}</RouteFeatureGate>
      <AppModal modal={modal} setModal={setModal} />
    </>
  );
  return (
    <CrmQueryProvider scope={`${instance}:${user?.CODIGO ?? "anonymous"}`}>
      <CrmLeaveGuardProvider
        scope={`${instance}:${user?.CODIGO ?? "anonymous"}`}
        navigate={(url) => router.push(url)}
      >
        <MonitorShell>
          {isModernCrmPath(pathname) ? (
            <PilotDesignProvider style={{ height: "100%", minWidth: 0 }}>
              {content}
            </PilotDesignProvider>
          ) : (
            content
          )}
        </MonitorShell>
      </CrmLeaveGuardProvider>
    </CrmQueryProvider>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [modal, setModal] = useState<ReactNode>(null);

  return (
    <div className="box-border h-[100dvh] w-full overflow-hidden md:w-screen">
      <AppProvider modal={modal} setModal={setModal}>
        <SocketProvider>
          <WhatsappProvider>
            <FrontendSessionGate>
            <CacheWarmup />
            <ContactsProvider>
              <InternalChatProvider>
                <InternalGroupsProvider>
                  <ReadyMessagesProvider>
                    <CustomersProvider>
                      <ThemeProvider>
                        {/* Accepted sends and active calls outlive either page chrome. */}
                        <ChatProvider>
                          <TelephonyProvider>
                            <AppFrame modal={modal} setModal={setModal}>
                              {children}
                            </AppFrame>
                          </TelephonyProvider>
                        </ChatProvider>
                      </ThemeProvider>
                    </CustomersProvider>
                  </ReadyMessagesProvider>
                </InternalGroupsProvider>
              </InternalChatProvider>
            </ContactsProvider>
            </FrontendSessionGate>
          </WhatsappProvider>
        </SocketProvider>
      </AppProvider>
    </div>
  );
}
