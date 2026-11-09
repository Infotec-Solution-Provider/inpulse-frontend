"use client";
import { CrmLeaveGuardProvider } from "@/lib/ui-system/leave-guard";
import AppProvider from "@/app/(private)/[instance]/app-context";
import SocketProvider from "@/app/(private)/[instance]/socket-context";
import { ThemeProvider } from "@/app/theme-context";
import { Modal } from "@mui/material";
import { canAccessFeaturePath, featureRoute } from "@/lib/module-feature-access";
import { canAccessPrivatePathForRole } from "@/lib/permissions/operator-access";
import { usePathname, useRouter } from "next/navigation";
import { ReactElement, ReactNode, useContext, useState } from "react";
import ContactsProvider from "./(cruds)/contacts/contacts-context";
import CustomersProvider from "./(cruds)/customers/customers-context";
import ReadyMessagesProvider from "./(cruds)/ready-messages/ready-messages-context";
import { InternalChatProvider } from "./internal-context";
import WhatsappProvider from "./whatsapp-context";
import ChatProvider from "./(main)/(chat)/chat-context";
import { useWhatsappContext } from "./whatsapp-context";
import InternalGroupsProvider from "./(cruds)/internal-groups/internal-groups-context";
import { AuthContext } from "@/app/auth-context";
import { TelephonyProvider } from "@/lib/telephony/telephony-provider";
import CacheWarmup from "./cache-warmup";
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

function RouteFeatureGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, instance } = useContext(AuthContext);
  const { loaded, parameters } = useWhatsappContext();
  const routeConfig = featureRoute(pathname, instance);

  const hasRoleAccess =
    routeConfig?.segment === "/channels" || canAccessPrivatePathForRole(pathname, user?.NIVEL);

  if (!hasRoleAccess) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-300">
        Perfil sem acesso a esta funcionalidade.
      </div>
    );
  }

  if (!routeConfig) {
    return <>{children}</>;
  }

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-300">
        Carregando permissões...
      </div>
    );
  }

  const isAllowed = canAccessFeaturePath(parameters, pathname, instance);

  if (!isAllowed) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-300">
        Funcionalidade indisponível para esta instância.
      </div>
    );
  }

  return <>{children}</>;
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
          </WhatsappProvider>
        </SocketProvider>
      </AppProvider>
    </div>
  );
}
