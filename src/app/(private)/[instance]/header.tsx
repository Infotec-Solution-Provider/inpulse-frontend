"use client";
import { AuthContext } from "@/app/auth-context";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import NotificationPreferencesModal from "@/lib/components/notification-preferences-modal";
import NotificationsDropdown from "@/lib/components/notifications-dropdown";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import ThemeToggleButton from "@/lib/components/theme-toggle-button";
import { UserRole } from "@/lib/sdk-local";
import {
  canAccessInternalGroups,
  isExternalOperator,
} from "@/lib/permissions/operator-access";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import BarChartIcon from "@mui/icons-material/BarChart";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import LogoutIcon from "@mui/icons-material/Logout";
import CampaignIcon from "@mui/icons-material/Campaign";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import MenuIcon from "@mui/icons-material/Menu";
import MonitorIcon from "@mui/icons-material/Monitor";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import HeaderNavItem from "./header-nav-item";
import { useWhatsappContext, WhatsappContext } from "./whatsapp-context";


const crudsRoutes = (
  params: Record<string, string>,
  isAdmin: boolean,
  role: UserRole | null | undefined,
) => {
  const isExternal = isExternalOperator(role);
  const arr: { title: string; href: string }[] = [];

  if (!isExternal) {
    arr.push({ title: "Clientes", href: "/customers" });
  }

  if (isAdmin) {
    arr.push({ title: "Usuários", href: "/users" });
    if (isFeatureEnabled(params, FEATURE_FLAGS.sipConfig)) {
      arr.push({ title: "Configuração SIP", href: "/sip-config" });
    }
    arr.push({ title: "Mensagens prontas", href: "/ready-messages" });
    arr.push({ title: "Resposta automática", href: "/auto-response" });
  }

  if (canAccessInternalGroups(params, role)) {
    arr.push({ title: "Grupos Internos", href: "/internal-groups" });
  }

  if (!isExternal && params["disable_contacts_crud"] !== "true") {
    arr.push({ title: "Contatos", href: "/contacts" });
  }

  return arr;
};

const aiRoutes = (params: Record<string, string>) => {
  if (!isFeatureEnabled(params, FEATURE_FLAGS.ai)) {
    return [];
  }

  return [
    ...(isFeatureEnabled(params, FEATURE_FLAGS.aiSupervisor)
      ? [{ title: "Assistente", href: "/ai-supervisor" }]
      : []),
    ...(isFeatureEnabled(params, FEATURE_FLAGS.aiAgents)
      ? [{ title: "Agentes", href: "/ai-agents" }]
      : []),
    ...(isFeatureEnabled(params, FEATURE_FLAGS.aiSettings)
      ? [{ title: "Configurações IA", href: "/ai-settings" }]
      : []),
  ];
};

const reportsRoutes = (params: Record<string, string>, instance: string) => {
  const routes = [
    { title: "Relatórios", href: "/reports/dashboard" },
  ];

  if (isFeatureEnabled(params, FEATURE_FLAGS.reportsAdvanced)) {
    routes.push(
      { title: "Dashboard de Operadores", href: "/reports/operators" },
      { title: "Metas e Indicadores", href: "/reports/goals-dashboard" },
      { title: "Equipe x Metas", href: "/reports/team-goals" },
      { title: "Origem x Qualidade", href: "/reports/lead-origin-quality" },
      { title: "Motivos de Perda", href: "/reports/lost-reasons" },
      { title: "Performance Operadores", href: "/reports/operator-performance" },
      { title: "Conversas", href: "/reports/chats" },
      //{ title: "Análise de Mailing", href: "/reports/mailing-analysis" },
      //{ title: "Régua por Carteira (Sintético) + WhatsApp", href: "/reports/regua-carteira-sintetico-whatsapp" },
    );
  }

  if (instance === "exatron") {
    routes.push({ title: "Pesquisa de Satisfação", href: "/reports/dashboard?report=satisfactionSurvey" });
  }

  if (isFeatureEnabled(params, FEATURE_FLAGS.salesReports)) {
    routes.push(
      { title: "Dashboard: Vendas", href: "/reports/sales" },
      { title: "Dashboard: WhatsApp", href: "/reports/operator-performance" },
    );
  }

/*   if (isFeatureEnabled(params, FEATURE_FLAGS.reportsDashboards)) {
    routes.push(
      //{ title: "Gerador de Relatório", href: "/reports/report-generator" },
      //{ title: "Dashboards", href: "/reports/dashboards" },
      //{ title: "Métricas", href: "/reports/metrics" },
    );
  } */

  return routes;
};

/*
const toolsRoutes = [
  { title: "Mensagens em massa", href: "/tools/mass-messages" },
  { title: "Mensagens automáticas", href: "/tools/automatic-messages" },
];
*/

const MobileMenu = ({
  open,
  onClose,
  instance,
  isUserAdmin,
  userRole,
  signOut,
  reportsRoutes,
}: {
  open: boolean;
  onClose: () => void;
  instance: string;
  isUserAdmin: boolean;
  userRole: UserRole | null | undefined;
  signOut: () => void;
  reportsRoutes: { title: string; href: string }[];
}) => {
  const pathname = usePathname();
  const baseHref = pathname.split("/")[1];
  const { parameters } = useWhatsappContext();
  const visibleAiRoutes = aiRoutes(parameters);
  const showMassMessages = isFeatureEnabled(parameters, FEATURE_FLAGS.massMessages);

  const availableCrudRoutes = crudsRoutes(parameters, isUserAdmin, userRole);

  const renderMenuItems = (routes: { title: string; href: string }[]) => {
    return routes.map((route) => (
      <ListItem key={route.title} disablePadding>
        <Link href={`/${baseHref}${route.href}`} className="w-full" onClick={onClose}>
          <ListItemButton>
            <ListItemText primary={route.title} />
          </ListItemButton>
        </Link>
      </ListItem>
    ));
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 280,
          bgcolor: "background.paper",
          color: "text.primary",
        },
      }}
    >
      <Box role="presentation" onClick={onClose} onKeyDown={onClose}>
        <List>
          <ListItem>
            <Link href={`/${instance}/`} className="w-full">
              <Image src={HorizontalLogo} alt="Logo" height={36} className="cursor-pointer" />
            </Link>
          </ListItem>
          <Divider />

          {/* Área de Atendimento */}
          <ListItem>
            <Link href={`/${instance}/`} className="w-full">
              <ListItemButton>
                <ListItemIcon>
                  <HeadsetMicIcon />
                </ListItemIcon>
                <ListItemText primary="Área de Atendimento" />
              </ListItemButton>
            </Link>
          </ListItem>

          {/* Monitoria */}
          {isUserAdmin && (
            <>
              <ListItem>
                <ListItemText primary="Monitoria" sx={{ pl: 2, pt: 1, fontWeight: "bold" }} />
              </ListItem>
              {renderMenuItems([
                { title: "Agendamentos", href: "/monitor/schedules" },
                { title: "Conversas", href: "/monitor/chats" },
                { title: "Conversas Internas", href: "/monitor/internal-chats" },
              ])}
            </>
          )}

          {/* Cadastros */}
          {availableCrudRoutes.length > 0 && (
            <>
              <ListItem>
                <ListItemText primary="Cadastros" sx={{ pl: 2, pt: 1, fontWeight: "bold" }} />
              </ListItem>
              {renderMenuItems(availableCrudRoutes)}
            </>
          )}

          {isUserAdmin && visibleAiRoutes.length > 0 && (
            <>
              <ListItem>
                <ListItemText primary="IA" sx={{ pl: 2, pt: 1, fontWeight: "bold" }} />
              </ListItem>
              {renderMenuItems(visibleAiRoutes)}
            </>
          )}

          {/* Relatórios */}
          {isUserAdmin && (
            <>
              {showMassMessages && (
                <>
                  <ListItem>
                    <ListItemText primary="Disparos" sx={{ pl: 2, pt: 1, fontWeight: "bold" }} />
                  </ListItem>
                  {renderMenuItems([{ title: "Mensagens em massa", href: "/tools/mass-messages" }])}
                </>
              )}

              <ListItem>
                <ListItemText primary="Relatórios" sx={{ pl: 2, pt: 1, fontWeight: "bold" }} />
              </ListItem>
              {renderMenuItems(reportsRoutes)}
            </>
          )}
          <Divider sx={{ my: 2 }} />

          {/* Logout */}
          <ListItem>
            <ListItemButton onClick={signOut}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Sair" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  );
};

export default function Header() {
  const renderStartedAt = Date.now();
  const { currentChat, parameters } = useContext(WhatsappContext);
  const { signOut, user, instance } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);


  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  if (isMobile && currentChat) {
    // Oculta o header quando um chat está aberto no mobile
    return null;
  }

  const isUserAdmin = user?.NIVEL === UserRole.ADMIN;
  const isExternal = isExternalOperator(user?.NIVEL);

  const availableCrudRoutes = crudsRoutes(parameters, isUserAdmin, user?.NIVEL);
  const visibleAiRoutes = aiRoutes(parameters);
  const visibleReportsRoutes = reportsRoutes(parameters, instance);
  const showFunnels = !isExternal && isFeatureEnabled(parameters, FEATURE_FLAGS.funnels);
  const showMassMessages = isFeatureEnabled(parameters, FEATURE_FLAGS.massMessages);
  const showAiMenu = isUserAdmin && visibleAiRoutes.length > 0;
  const showReportsMenu = isUserAdmin && visibleReportsRoutes.length > 0;

  return (
    <header className="sticky top-0 z-20 shadow-md">
      <div className="flex items-center">
        <div className="mx-auto flex w-screen items-center justify-between bg-slate-200 px-4 py-4 pt-3 dark:bg-slate-800 md:pt-3">
          <div className="flex items-center gap-4">
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                className="mr-2"
              >
                <MenuIcon className="text-gray-900 dark:text-slate-200" />
              </IconButton>
            )}
            <Link href={`/${instance}/`}>
              <Image src={HorizontalLogo} alt="Logo" height={36} className="cursor-pointer" />
            </Link>
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <nav>
              <menu className="flex items-center gap-4 text-sm font-semibold text-gray-900 dark:text-slate-200">
                <HeaderNavItem title="Área de Atendimento" href="/">
                  <HeadsetMicIcon className="text-gray-900 dark:text-slate-200" />
                </HeaderNavItem>
                {!isExternal && (
                  <HeaderNavItem title="Monitoria" href="/monitor" disabled={!isUserAdmin}>
                    <MonitorIcon className="text-gray-900 dark:text-slate-200" />
                  </HeaderNavItem>
                )}
                {availableCrudRoutes.length > 0 && (
                  <HeaderNavItem title="Cadastros" routes={availableCrudRoutes}>
                    <AppRegistrationIcon className="text-gray-900 dark:text-slate-200" />
                  </HeaderNavItem>
                )}
                {showFunnels && (
                  <HeaderNavItem title="Pipelines" href="/funnel">
                    <FilterAltIcon className="text-gray-900 dark:text-slate-200" />
                  </HeaderNavItem>
                )}
                {showAiMenu && (
                  <HeaderNavItem title="IA" routes={visibleAiRoutes}>
                    <AutoAwesomeIcon className="text-gray-900 dark:text-slate-200" />
                  </HeaderNavItem>
                )}
                {isUserAdmin && showMassMessages && (
                  <HeaderNavItem title="Disparos" href="/tools/mass-messages">
                    <CampaignIcon className="text-gray-900 dark:text-slate-200" />
                  </HeaderNavItem>
                )}
                {showReportsMenu && (
                  <HeaderNavItem title="Relatórios" routes={visibleReportsRoutes}>
                    <BarChartIcon className="text-gray-900 dark:text-slate-200" />
                  </HeaderNavItem>
                )}
              </menu>
            </nav>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggleButton />

            <NotificationsDropdown />

            <IconButton
              color="inherit"
              aria-label="configurações de notificações"
              onClick={() => setNotificationSettingsOpen(true)}
            >
              <SettingsIcon className="text-gray-900 dark:text-slate-200" />
            </IconButton>

            <h1 className="mx-4 truncate text-gray-900 dark:text-slate-200">{user?.NOME}</h1>

            <IconButton onClick={signOut}>
              <LogoutIcon className="text-gray-900 dark:text-slate-200" />
            </IconButton>
          </div>

          <div className="flex gap-2 md:hidden">
            <IconButton>
              <NotificationsIcon className="text-gray-900 dark:text-slate-200" />
            </IconButton>
            <IconButton onClick={() => setNotificationSettingsOpen(true)}>
              <SettingsIcon className="text-gray-900 dark:text-slate-200" />
            </IconButton>
            <IconButton onClick={signOut}>
              <LogoutIcon className="text-gray-900 dark:text-slate-200" />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Menu Mobile */}
      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        instance={instance}
        isUserAdmin={isUserAdmin}
        userRole={user?.NIVEL}
        signOut={signOut}
        reportsRoutes={visibleReportsRoutes}
      />

      <NotificationPreferencesModal
        open={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
      />
    </header>
  );
}
