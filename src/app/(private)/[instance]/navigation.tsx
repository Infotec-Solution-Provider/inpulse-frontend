import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import MonitorIcon from "@mui/icons-material/Monitor";
import BarChartIcon from "@mui/icons-material/BarChart";
import AppRegistrationIcon from "@mui/icons-material/AppRegistration";
import BuildIcon from "@mui/icons-material/Build";
import { ReactNode } from "react";
import { UserRole } from "@in.pulse-crm/sdk";

export interface SingleNavigationRoute {
  title: string;
  href: string;
  icon: ReactNode;
  allowedRoles?: UserRole[];
}

export interface TreeNavigationRoute {
  title: string;
  routes: { title: string; href: string }[];
  allowedRoles?: UserRole[];
  icon: ReactNode;
}

export const navigationItems: Array<SingleNavigationRoute | TreeNavigationRoute> = [
  {
    title: "Área de Atendimento",
    href: "/",
    icon: <HeadsetMicIcon />,
  },
  {
    title: "Monitoria",
    routes: [
      { title: "Atendimentos", href: "/monitor/attendances" },
      { title: "Agendamentos", href: "/monitor/schedules" },
      { title: "Usuários", href: "/monitor/users" },
    ],
    allowedRoles: [UserRole.ADMIN],
    icon: <MonitorIcon />,
  },
  {
    title: "Cadastros",
    href: "/",
    routes: [
      { title: "Atendimentos", href: "/attendances" },
      { title: "Agendamentos", href: "/schedules" },
      { title: "Usuários", href: "/users" },
      { title: "Clientes", href: "/customers" },
      { title: "Contatos", href: "/contacts" },
      { title: "Templates", href: "/templates" },
      { title: "Tags", href: "/tags" },
    ],
    allowedRoles: [UserRole.ADMIN],
    icon: <AppRegistrationIcon />,
  },
  {
    title: "Relatórios",
    routes: [
      { title: "Conversas", href: "/reports/chats" },
      { title: "Conversas sem resposta", href: "/reports/chats-without-response" },
      { title: "Mensagens por contato", href: "/reports/messages-by-contact" },
      { title: "Mensagens por usuário", href: "/reports/messages-by-user" },
      { title: "Mensagens por dia/hora", href: "/reports/messages-by-day-hour" },
    ],
    allowedRoles: [UserRole.ADMIN],
    icon: <BarChartIcon />,
  },
  {
    title: "Ferramentas",
    routes: [
      { title: "Mensagens em massa", href: "/tools/mass-messages" },
      { title: "Mensagens automáticas", href: "/tools/automatic-messages" },
    ],
    allowedRoles: [UserRole.ADMIN],
    icon: <BuildIcon />,
  },
];
