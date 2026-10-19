"use client";
import AppProvider from "@/app/(private)/[instance]/app-context";
import SocketProvider from "@/app/(private)/[instance]/socket-context";
import { ThemeProvider } from "@/app/theme-context";
import { Modal } from "@mui/material";
import { FEATURE_FLAGS, FeatureFlag, isFeatureEnabled } from "@/lib/feature-flags";
import { canAccessPrivatePathForRole } from "@/lib/permissions/operator-access";
import { usePathname } from "next/navigation";
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
  if (!modal) return null;
  return (
    <Modal
      open
      onClose={(_, reason) => {
        if (reason !== "backdropClick") setModal(null);
      }}
      className="flex items-center justify-center"
    >
      <div>{modal as ReactElement}</div>
    </Modal>
  );
}

const ROUTE_FEATURE_FLAGS: Array<{ segment: string; flags: FeatureFlag[] }> = [
  { segment: "/channels", flags: [FEATURE_FLAGS.whatsappSessionMonitoring] },
  { segment: "/ai-supervisor", flags: [FEATURE_FLAGS.ai, FEATURE_FLAGS.aiSupervisor] },
  { segment: "/ai-agents", flags: [FEATURE_FLAGS.ai, FEATURE_FLAGS.aiAgents] },
  { segment: "/ai-settings", flags: [FEATURE_FLAGS.ai, FEATURE_FLAGS.aiSettings] },
  { segment: "/funnel", flags: [FEATURE_FLAGS.funnels] },
  { segment: "/sip-config", flags: [FEATURE_FLAGS.sipConfig] },
  { segment: "/tools/mass-messages", flags: [FEATURE_FLAGS.massMessages] },
  { segment: "/reports/operators", flags: [FEATURE_FLAGS.reportsAdvanced] },
  { segment: "/reports/goals-dashboard", flags: [FEATURE_FLAGS.reportsAdvanced] },
  { segment: "/reports/team-goals", flags: [FEATURE_FLAGS.reportsAdvanced] },
  { segment: "/reports/lead-origin-quality", flags: [FEATURE_FLAGS.reportsAdvanced] },
  { segment: "/reports/lost-reasons", flags: [FEATURE_FLAGS.reportsAdvanced] },
  { segment: "/reports/operator-performance", flags: [FEATURE_FLAGS.reportsAdvanced] },
  { segment: "/reports/sales", flags: [FEATURE_FLAGS.salesReports] },
  { segment: "/reports/dashboards", flags: [FEATURE_FLAGS.reportsDashboards] },
  { segment: "/reports/metrics", flags: [FEATURE_FLAGS.reportsDashboards] },
  { segment: "/reports/report-generator", flags: [FEATURE_FLAGS.reportsDashboards] },
  { segment: "/reports/mailing-analysis", flags: [FEATURE_FLAGS.reportsAdvanced] },
  { segment: "/reports/regua-carteira-sintetico-whatsapp", flags: [FEATURE_FLAGS.reportsAdvanced] },
  { segment: "/reports/chats", flags: [FEATURE_FLAGS.chatExport] },
];

function RouteFeatureGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useContext(AuthContext);
  const { loaded, parameters } = useWhatsappContext();
  const routeConfig = ROUTE_FEATURE_FLAGS.find(({ segment }) => pathname.includes(segment));

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

  const isAllowed = routeConfig.flags.every((flag) => isFeatureEnabled(parameters, flag));

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
  const content = (
    <>
      <RouteFeatureGate>{children}</RouteFeatureGate>
      <AppModal modal={modal} setModal={setModal} />
    </>
  );
  return (
    <CrmQueryProvider scope={`${instance}:${user?.CODIGO ?? "anonymous"}`}>
      <MonitorShell>
        {isModernCrmPath(pathname) ? (
          <PilotDesignProvider style={{ height: "100%", minWidth: 0 }}>
            {content}
          </PilotDesignProvider>
        ) : (
          content
        )}
      </MonitorShell>
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
