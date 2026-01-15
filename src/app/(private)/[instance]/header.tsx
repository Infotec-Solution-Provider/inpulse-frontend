"use client";
import { AuthContext } from "@/app/auth-context";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import NotificationsDropdown from "@/lib/components/notifications-dropdown";
import ThemeToggleButton from "@/lib/components/theme-toggle-button";
import { UserRole } from "@in.pulse-crm/sdk";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import BarChartIcon from "@mui/icons-material/BarChart";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import MonitorIcon from "@mui/icons-material/Monitor";
import NotificationsIcon from "@mui/icons-material/Notifications";
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

const crudsRoutes = (params: Record<string, string>, isAdmin: boolean) => {
  const arr = [{ title: "Clientes", href: "/customers" }];

  if (isAdmin) {
    arr.push({ title: "Usuários", href: "/users" });
    arr.push({ title: "Mensagens prontas", href: "/ready-messages" });
    arr.push({ title: "Resposta automática", href: "/auto-response" });
  }

  if (params["disable_internal_groups"] !== "true") {
    arr.push({ title: "Grupos Internos", href: "/internal-groups" });
  }

  if (params["disable_contacts_crud"] !== "true") {
    arr.push({ title: "Contatos", href: "/contacts" });
  }

  return arr;
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
  signOut,
  reportsRoutes,
}: {
  open: boolean;
  onClose: () => void;
  instance: string;
  isUserAdmin: boolean;
  signOut: () => void;
  reportsRoutes: { title: string; href: string }[];
}) => {
  const pathname = usePathname();
  const baseHref = pathname.split("/")[1];
  const { parameters } = useWhatsappContext();

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
          <ListItem>
            <ListItemText primary="Cadastros" sx={{ pl: 2, pt: 1, fontWeight: "bold" }} />
          </ListItem>
          {renderMenuItems(crudsRoutes(parameters, isUserAdmin))}

          {/* Relatórios */}
          {isUserAdmin && (
            <>
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
  const { currentChat, parameters } = useContext(WhatsappContext);
  const { signOut, user, instance } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  const reportsRoutes = [
    { title: "Relatórios", href: "/reports/dashboard" },
    { title: "Conversas", href: "/reports/chats" },
    ...(user?.NIVEL === UserRole.ADMIN
      ? [{ title: "Gerador de Relatório", href: "/reports/report-generator" }]
      : []),
  ];

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
                <HeaderNavItem title="Monitoria" href="/monitor" disabled={!isUserAdmin}>
                  <MonitorIcon className="text-gray-900 dark:text-slate-200" />
                </HeaderNavItem>
                <HeaderNavItem title="Cadastros" routes={crudsRoutes(parameters, isUserAdmin)}>
                  <AppRegistrationIcon className="text-gray-900 dark:text-slate-200" />
                </HeaderNavItem>
                {isUserAdmin && (
                  <HeaderNavItem title="Relatórios" routes={reportsRoutes}>
                    <BarChartIcon className="text-gray-900 dark:text-slate-200" />
                  </HeaderNavItem>
                )}
              </menu>
            </nav>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggleButton />

            <NotificationsDropdown />

            <h1 className="mx-4 truncate text-gray-900 dark:text-slate-200">{user?.NOME}</h1>

            <IconButton onClick={signOut}>
              <LogoutIcon className="text-gray-900 dark:text-slate-200" />
            </IconButton>
          </div>

          <div className="flex gap-2 md:hidden">
            <IconButton>
              <NotificationsIcon className="text-gray-900 dark:text-slate-200" />
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
        signOut={signOut}
        reportsRoutes={reportsRoutes}
      />
    </header>
  );
}
