"use client";
import Image from "next/image";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "@/app/auth-context";
import { IconButton, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Box } from "@mui/material";
import HeaderNavItem from "./header-nav-item";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import MonitorIcon from "@mui/icons-material/Monitor";
import MenuIcon from '@mui/icons-material/Menu';
import BarChartIcon from "@mui/icons-material/BarChart";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import { UserRole } from "@in.pulse-crm/sdk";
import Link from "next/link";
import { WhatsappContext } from "./whatsapp-context";
import ThemeToggleButton from "@/lib/components/theme-toggle-button";
import { usePathname } from "next/navigation";

const monitorRoutes = [
  { title: "Conversas", href: "/monitor/chats" },
  { title: "Conversas Internas", href: "/monitor/internal-chats" },
  { title: "Conversas (Novo)", href: "/monitor" },
];

const crudsRoutes = (instance: string, sectorId?: number) => {
  const arr = [
    // { title: "Atendimentos", href: "/attendances" },
    // { title: "Agendamentos", href: "/schedules" },
    { title: "Usuários", href: "/users" },
    { title: "Clientes", href: "/customers" },
    { title: "Contatos", href: "/contacts" },
    { title: "Mensagens prontas", href: "/ready-messages" },
    // { title: "Templates", href: "/templates" },
    // { title: "Tags", href: "/tags" },
  ];

  if ((instance !== "nunes" && instance !== "vollo") || sectorId == 3) {
    arr.push({ title: "Grupos Internos", href: "/internal-groups" });
  }

  return arr;
};
const userCrudRoutes = [
  // { title: "Atendimentos", href: "/attendances" },
  // { title: "Agendamentos", href: "/schedules" },
  { title: "Clientes", href: "/customers" },
  { title: "Contatos", href: "/contacts" },
];

/*
const toolsRoutes = [
  { title: "Mensagens em massa", href: "/tools/mass-messages" },
  { title: "Mensagens automáticas", href: "/tools/automatic-messages" },
];
*/

const MobileMenu = ({ open, onClose, user, instance, isUserAdmin, signOut, reportsRoutes }: {
  open: boolean;
  onClose: () => void;
  user: any;
  instance: string;
  isUserAdmin: boolean;
  signOut: () => void;
  reportsRoutes: { title: string; href: string }[];
}) => {
  const pathname = usePathname();
  const baseHref = pathname.split("/")[1];

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
          bgcolor: 'background.paper',
          color: 'text.primary',
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
                <ListItemText primary="Monitoria" sx={{ pl: 2, pt: 1, fontWeight: 'bold' }} />
              </ListItem>
              {renderMenuItems([
                { title: 'Agendamentos', href: '/monitor/schedules' },
                { title: 'Conversas', href: '/monitor/chats' },
                { title: 'Conversas Internas', href: '/monitor/internal-chats' },
              ])}
            </>
          )}

          {/* Cadastros */}
          <ListItem>
            <ListItemText primary="Cadastros" sx={{ pl: 2, pt: 1, fontWeight: 'bold' }} />
          </ListItem>
          {renderMenuItems(isUserAdmin
            ? crudsRoutes(instance, user?.SETOR)
            : userCrudRoutes
          )}

          {/* Relatórios */}
          <ListItem>
            <ListItemText primary="Relatórios" sx={{ pl: 2, pt: 1, fontWeight: 'bold' }} />
          </ListItem>
          {renderMenuItems(reportsRoutes)}

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
  const { currentChat } = useContext(WhatsappContext);
  const { signOut, user, instance } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
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
    { title: "Conversas", href: "/reports/chats" },
    ...(user?.NIVEL === UserRole.ADMIN
      ? [{ title: "Gerador de Relatório", href: "/reports/report-generator" }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-20 shadow-md">
      <div className="flex items-center">
        <div className="mx-auto flex w-screen items-center justify-between bg-slate-200 px-4 py-4 dark:bg-slate-800 md:pt-3 pt-3">
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

          <div className="hidden md:flex flex-1 justify-center">
            <nav>
              <menu className="flex items-center gap-4 text-sm font-semibold text-gray-900 dark:text-slate-200">
                <HeaderNavItem title="Área de Atendimento" href="/">
                  <HeadsetMicIcon className="text-gray-900 dark:text-slate-200" />
                </HeaderNavItem>
                <HeaderNavItem title="Monitoria" routes={monitorRoutes} disabled={!isUserAdmin}>
                  <MonitorIcon className="text-gray-900 dark:text-slate-200" />
                </HeaderNavItem>
                <HeaderNavItem
                  title="Cadastros"
                  routes={crudsRoutes(instance, user?.SETOR)}
                  disabled={!isUserAdmin}
                >
                  <AppRegistrationIcon className="text-gray-900 dark:text-slate-200" />
                </HeaderNavItem>
                <HeaderNavItem title="Cadastros" routes={userCrudRoutes} disabled={isUserAdmin}>
                  <AppRegistrationIcon className="text-gray-900 dark:text-slate-200" />
                </HeaderNavItem>
                <HeaderNavItem title="Relatórios" routes={reportsRoutes}>
                  <BarChartIcon className="text-gray-900 dark:text-slate-200" />
                </HeaderNavItem>
              </menu>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggleButton />

            <IconButton>
              <NotificationsIcon className="text-gray-900 dark:text-slate-200" />
            </IconButton>

            <h1 className="truncate text-gray-900 dark:text-slate-200 mx-4">
              {user?.NOME}
            </h1>

            <IconButton onClick={signOut}>
              <LogoutIcon className="text-gray-900 dark:text-slate-200" />
            </IconButton>
          </div>

          <div className="flex md:hidden gap-2">
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
        user={user}
        instance={instance}
        isUserAdmin={isUserAdmin}
        signOut={signOut}
        reportsRoutes={reportsRoutes}
      />
    </header>
  );
}
