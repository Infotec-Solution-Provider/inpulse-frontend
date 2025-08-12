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
import PeopleIcon from '@mui/icons-material/People';
import ContactsIcon from '@mui/icons-material/Contacts';
import MessageIcon from '@mui/icons-material/Message';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatIcon from '@mui/icons-material/Chat';
import EventIcon from '@mui/icons-material/Event';
import ForumIcon from '@mui/icons-material/Forum';
import { UserRole } from "@in.pulse-crm/sdk";
import Link from "next/link";
import { WhatsappContext } from "./whatsapp-context";
import ThemeToggleButton from "@/lib/components/theme-toggle-button";
import { usePathname } from "next/navigation";

const monitorRoutes = [
  { title: "Agendamentos", href: "/monitor/schedules" },
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

  if (instance !== "nunes" || sectorId == 3) {
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
const reportsRoutes = [
  { title: "Conversas", href: "/reports/chats" },
  { title: "Gerador de Relatório", href: "/reports/report-generator" },
/*{ title: "Conversas sem resposta", href: "/reports/chats-without-response" },
  { title: "Mensagens por contato", href: "/reports/messages-by-contact" },
  { title: "Mensagens por usuário", href: "/reports/messages-by-user" }, */
];

/*
const toolsRoutes = [
  { title: "Mensagens em massa", href: "/tools/mass-messages" },
  { title: "Mensagens automáticas", href: "/tools/automatic-messages" },
];
*/

const MobileMenu = ({ open, onClose, user, instance, isUserAdmin, signOut }: { 
  open: boolean; 
  onClose: () => void; 
  user: any; 
  instance: string; 
  isUserAdmin: boolean; 
  signOut: () => void; 
}) => {
  const pathname = usePathname();
  const baseHref = pathname?.split("/")[1] || '';

  // Define as rotas de cadastros para o menu mobile com base no perfil do usuário
  const getMobileCrudRoutes = () => {
    const baseRoutes = [
      { title: "Clientes", href: "/customers" },
      { title: "Contatos", href: "/contacts" },
    ];

    // Admin (Supervisor) vê rotas adicionais
    if (user?.NIVEL === UserRole.ADMIN) {
      return [
        ...baseRoutes,
        { title: "Grupos Internos", href: "/internal-groups" },
      ];
    }

    // Outros perfis (Operador) veem apenas as rotas base
    return baseRoutes;
  };

  const mobileCrudRoutes = getMobileCrudRoutes();
  
  const getIconForRoute = (title: string) => {
    switch(title) {
      case 'Usuários':
        return <AppRegistrationIcon fontSize="small" />;
      case 'Clientes':
        return <PeopleIcon fontSize="small" />;
      case 'Contatos':
        return <ContactsIcon fontSize="small" />;
      case 'Mensagens prontas':
        return <MessageIcon fontSize="small" />;
      case 'Grupos Internos':
        return <GroupsIcon fontSize="small" />;
      case 'Conversas':
        return <ChatIcon fontSize="small" />;
      case 'Agendamentos':
        return <EventIcon fontSize="small" />;
      case 'Conversas Internas':
        return <ForumIcon fontSize="small" />;
      case 'Gerador de Relatório':
        return <BarChartIcon fontSize="small" />;
      default:
        return <HeadsetMicIcon fontSize="small" />;
    }
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: '85%',
          maxWidth: 320,
          bgcolor: 'background.paper',
          color: 'text.primary',
        },
      }}
      ModalProps={{
        keepMounted: true, // Melhora performance em mobile
      }}
    >
      <Box 
        role="presentation" 
        onClick={onClose} 
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        className="h-full flex flex-col"
      >
        {/* Cabeçalho */}
        <div className="bg-slate-100 dark:bg-slate-800 p-3 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mt-8">
            <Link href={`/${instance}/`} className="flex-shrink-0" onClick={onClose}>
              <div className="relative h-8 w-28">
                <Image 
                  src={HorizontalLogo} 
                  alt="Logo" 
                  fill
                  sizes="(max-width: 768px) 7rem, 8rem"
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
            {user?.NOME && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2 truncate max-w-[140px] px-2 py-1 bg-white/50 dark:bg-black/20 rounded">
                Olá, {user.NOME.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
        
        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto overscroll-contain dark:bg-slate-800">
          <List disablePadding>
            {/* Área de Atendimento */}
            <ListItem disablePadding className="mt-1">
              <Link href={`/${instance}/`} className="w-full no-underline" onClick={onClose}>
                <ListItemButton className="rounded-md mx-2 group">
                  <ListItemIcon className="min-w-[40px] text-primary-600 dark:text-primary-400">
                    <HeadsetMicIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Atendimento" 
                    primaryTypographyProps={{ 
                      fontWeight: 'medium',
                      className: 'text-gray-900 dark:text-white'
                    }} 
                  />
                </ListItemButton>
              </Link>
            </ListItem>
            
            {/* Cadastros */}
            <ListItem className="px-4 pt-4 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Cadastros
              </span>
            </ListItem>

            {(isUserAdmin 
              ? [
                  { title: 'Clientes', href: '/customers' },
                  { title: 'Contatos', href: '/contacts' },
                  ...(instance !== 'nunes' || user?.SETOR === 3 ? [{ title: 'Grupos Internos', href: '/internal-groups' }] : [])
                ]
              : mobileCrudRoutes.filter(route => route.title !== 'Usuários' || isUserAdmin)
              ).map((route) => (
                <ListItem key={route.title} disablePadding>
                  <Link 
                    href={`/${baseHref}${route.href}`} 
                    className="w-full no-underline" 
                    onClick={onClose}
                  >
                    <ListItemButton className="pl-6 group">
                      <ListItemIcon className="min-w-[40px] text-gray-600 dark:text-gray-400">
                        {getIconForRoute(route.title)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={route.title} 
                        primaryTypographyProps={{
                          className: 'text-gray-700 dark:text-gray-300',
                          fontSize: '0.9375rem'
                        }}
                      />
                    </ListItemButton>
                  </Link>
                </ListItem>
              ))}
              
              {/* Seção de Relatórios removida do mobile */}
          </List>
        </div>
        
        {/* Rodapé fixo */}
        <div className="sticky bottom-0 bg-white dark:dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700">
          <Divider />
          <ListItem disablePadding>
            <ListItemButton 
              onClick={() => {
                onClose();
                // Pequeno atraso para melhorar a experiência
                setTimeout(signOut, 300);
              }}
              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-400"
            >
              <ListItemIcon className="text-inherit min-w-[40px]">
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Sair" 
                primaryTypographyProps={{ 
                  fontWeight: 'medium',
                  className: 'text-inherit'
                }} 
              />
            </ListItemButton>
          </ListItem>
          <div className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400">
            v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
          </div>
        </div>
      </Box>
    </Drawer>
  );
};

export default function Header() {
  const { currentChat } = useContext(WhatsappContext);
  const { signOut, user, instance } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Inicialmente assume desktop para evitar hidratação no servidor
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Só executa no cliente após a hidratação
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Define o estado inicial baseado no tamanho da janela
    checkMobile();
    
    // Adiciona listener para mudanças de tamanho com debounce
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  if (isMobile && currentChat) {
    // Oculta o header quando um chat está aberto no mobile
    return null;
  }

  const isUserAdmin = user?.NIVEL === UserRole.ADMIN;

  return (
    <header className="sticky top-0 z-20 shadow-md bg-slate-200 dark:bg-slate-800 mb-2">
      <div className="flex items-center">
        <div className="mx-auto flex w-full items-center justify-between px-4 py-3 md:py-2 md:mt-0 mt-6">
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
            <Link href={`/${instance}/`} className="flex items-center">
              <div className="relative h-9 w-32 md:w-36">
                <Image 
                  src={HorizontalLogo} 
                  alt="Logo" 
                  fill
                  sizes="(max-width: 768px) 8rem, 9rem"
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          </div>
          
          {/* Menu Desktop */}
          <nav className="hidden md:block">
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

              <ThemeToggleButton />

              <IconButton className="hidden md:block">
                <NotificationsIcon className="text-gray-900 dark:text-slate-200" />
              </IconButton>

              <h1 className="truncate text-gray-900 dark:text-slate-200 mx-4 hidden md:block">
                {user?.NOME}
              </h1>
              
              <IconButton onClick={signOut} className="hidden md:block">
                <LogoutIcon className="text-gray-900 dark:text-slate-200" />
              </IconButton>
            </menu>
          </nav>
          
          {/* Ícones de notificação, tema e logout no mobile */}
          <div className="flex md:hidden gap-1 items-center">
            <ThemeToggleButton className="!p-2" />
            <IconButton size="small" aria-label="Notificações" className="text-gray-900 dark:text-slate-200">
              <NotificationsIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              aria-label="Sair" 
              onClick={signOut}
              className="text-gray-900 dark:text-slate-200"
            >
              <LogoutIcon fontSize="small" />
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
      />
    </header>
  );
}
