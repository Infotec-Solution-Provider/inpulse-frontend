"use client";
import Image from "next/image";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useContext, useMemo } from "react";
import { AuthContext } from "@/app/auth-context";
import { IconButton } from "@mui/material";
import { navigationItems } from "./navigation";
import HeaderNavItem from "./header-nav-item";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import MonitorIcon from "@mui/icons-material/Monitor";
import BarChartIcon from "@mui/icons-material/BarChart";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import BuildIcon from "@mui/icons-material/Build";
import { UserRole } from "@in.pulse-crm/sdk";

const monitorRoutes = [
  { title: "Atendimentos", href: "/monitor/attendances" },
  { title: "Agendamentos", href: "/monitor/schedules" },
  { title: "Usuários", href: "/monitor/users" },
];

const crudsRoutes = [
  { title: "Atendimentos", href: "/attendances" },
  { title: "Agendamentos", href: "/schedules" },
  { title: "Usuários", href: "/users" },
  { title: "Clientes", href: "/customers" },
  { title: "Contatos", href: "/contacts" },
  { title: "Templates", href: "/templates" },
  { title: "Tags", href: "/tags" },
];

const reportsRoutes = [
  { title: "Conversas", href: "/reports/chats" },
  { title: "Conversas sem resposta", href: "/reports/chats-without-response" },
  { title: "Mensagens por contato", href: "/reports/messages-by-contact" },
  { title: "Mensagens por usuário", href: "/reports/messages-by-user" },
];

const toolsRoutes = [
  { title: "Mensagens em massa", href: "/tools/mass-messages" },
  { title: "Mensagens automáticas", href: "/tools/automatic-messages" },
];

export default function Header() {
  const { signOut, user } = useContext(AuthContext);

  const isUserAdmin = user?.NIVEL === UserRole.ADMIN;

  const allowedRoutes = useMemo(() => {
    return navigationItems.filter((item) => {
      if ("allowedRoles" in item) {
        return user?.NIVEL && item.allowedRoles!.includes(user.NIVEL);
      }
      return true;
    });
  }, [user]);

  return (
    <header className="sticky top-0 z-20 shadow-2xl">
      <div className="flex items-center bg-slate-900">
        <div className="mx-auto flex w-screen items-center justify-between px-4 py-4">
          <div className="flex items-center gap-8">
            <Image src={HorizontalLogo} alt={"Logo"} height={36} />
          </div>
          <nav>
            <menu className="flex items-center gap-4 text-sm font-semibold text-slate-200">
              <HeaderNavItem title="Área de Atendimento" href="/">
                <HeadsetMicIcon />
              </HeaderNavItem>
              <HeaderNavItem title="Monitoria" routes={monitorRoutes} disabled={!isUserAdmin}>
                <MonitorIcon />
              </HeaderNavItem>
              <HeaderNavItem title="Cadastros" routes={crudsRoutes} disabled={!isUserAdmin}>
                <AppRegistrationIcon />
              </HeaderNavItem>
              <HeaderNavItem title="Relatórios" routes={reportsRoutes} disabled={!isUserAdmin}>
                <BarChartIcon />
              </HeaderNavItem>
              <HeaderNavItem title="Ferramentas" routes={toolsRoutes} disabled={!isUserAdmin}>
                <BuildIcon />
              </HeaderNavItem>
            </menu>
          </nav>
          <div className="flex items-center gap-4">
            <h1 className="truncate">{user?.NOME}</h1>
            <IconButton title="notifications" type="button">
              <NotificationsIcon />
            </IconButton>
            <IconButton title="logout" type="button" onClick={signOut}>
              <LogoutIcon />
            </IconButton>
          </div>
        </div>
      </div>
    </header>
  );
}
