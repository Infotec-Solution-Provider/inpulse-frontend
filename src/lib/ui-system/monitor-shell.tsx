"use client";

import { AuthContext } from "@/app/auth-context";
import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { useThemeContext } from "@/app/theme-context";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import LazyNotificationsDropdown from "@/lib/components/lazy-notifications-dropdown";
import NotificationPreferencesModal from "@/lib/components/notification-preferences-modal";
import {
  Avatar,
  Box,
  Button,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import {
  AudioLines,
  Blocks,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  Headset,
  LogOut,
  Megaphone,
  Menu as MenuIcon,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RadioTower,
  Settings,
  Sparkles,
  Sun,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getNavigationItems,
  isNavigationRouteActive,
  sidebarExpandedPreference,
  sidebarStorageKey,
  type NavigationItem,
  type NavigationIcon,
} from "./navigation";
import type { ThemePreference } from "./theme-preference";

const navigationIcons: Record<NavigationIcon, typeof Headset> = {
  headset: Headset,
  monitor: AudioLines,
  channels: RadioTower,
  records: Blocks,
  pipelines: Workflow,
  ai: Sparkles,
  campaign: Megaphone,
  reports: ChartNoAxesCombined,
  news: Sparkles,
};

function NavigationEntry({
  item,
  expanded,
  instance,
  pathname,
  onNavigate,
}: {
  item: NavigationItem;
  expanded: boolean;
  instance: string;
  pathname: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const Icon = navigationIcons[item.icon];
  const active = item.href
    ? isNavigationRouteActive(pathname, instance, item.href)
    : item.routes?.some((route) => isNavigationRouteActive(pathname, instance, route.href));
  const commonSx = {
    minHeight: { xs: 44, lg: 36 },
    px: expanded ? 1.5 : 1.25,
    py: 0.75,
    mx: 1,
    mb: 0.5,
    borderRadius: "8px",
    color: active ? "var(--ip-accent)" : "var(--ip-muted)",
    "&.Mui-selected": { bgcolor: "var(--ip-accent-soft)", color: "var(--ip-accent)" },
    "&.Mui-selected:hover": { bgcolor: "var(--ip-accent-soft)" },
    "&:hover": { bgcolor: "var(--ip-surface-muted)", color: "var(--ip-text)" },
    "&.Mui-focusVisible": { outline: "2px solid var(--ip-accent)", outlineOffset: -2 },
  };
  const contents = (
    <>
      <ListItemIcon sx={{ minWidth: expanded ? 30 : 20, color: "inherit" }}>
        <Icon size={18} strokeWidth={1.7} aria-hidden />
      </ListItemIcon>
      {expanded && (
        <ListItemText
          primary={item.title}
          primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 600 : 500 }}
          sx={{ m: 0, whiteSpace: "nowrap" }}
        />
      )}
      {expanded && item.routes && (
        <ChevronDown
          size={14}
          aria-hidden
          style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 120ms" }}
        />
      )}
    </>
  );
  return (
    <>
      <Tooltip title={expanded ? "" : item.title} placement="right">
        {item.href ? (
          <ListItemButton
            component={Link}
            href={`/${instance}${item.href}`}
            onClick={onNavigate}
            selected={active}
            aria-label={expanded ? undefined : item.title}
            aria-current={active ? "page" : undefined}
            sx={commonSx}
          >
            {contents}
          </ListItemButton>
        ) : (
          <ListItemButton
            selected={active}
            onClick={(event) =>
              expanded ? setOpen((value) => !value) : setAnchor(event.currentTarget)
            }
            aria-label={expanded ? undefined : item.title}
            aria-expanded={expanded ? open : Boolean(anchor)}
            aria-haspopup={expanded ? undefined : "menu"}
            sx={commonSx}
          >
            {contents}
          </ListItemButton>
        )}
      </Tooltip>
      {item.routes && (
        <>
          <Collapse in={expanded && open} unmountOnExit>
            <List component="div" disablePadding sx={{ mb: 1 }}>
              {item.routes.map((route) => (
                <ListItemButton
                  key={route.title}
                  component={Link}
                  href={`/${instance}${route.href}`}
                  onClick={onNavigate}
                  selected={isNavigationRouteActive(pathname, instance, route.href)}
                  aria-current={
                    isNavigationRouteActive(pathname, instance, route.href) ? "page" : undefined
                  }
                  sx={{
                    ...commonSx,
                    ml: 3.25,
                    pl: 2,
                    borderLeft: "1px solid var(--ip-border)",
                    borderRadius: "0 8px 8px 0",
                  }}
                >
                  <ListItemText
                    primary={route.title}
                    primaryTypographyProps={{ fontSize: 12, lineHeight: 1.4 }}
                    sx={{ m: 0 }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
          <Menu
            anchorEl={anchor}
            open={!expanded && Boolean(anchor)}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            slotProps={{ paper: { sx: { minWidth: 240 } } }}
          >
            <Typography
              sx={{ px: 2, py: 1, fontSize: 12, color: "text.secondary", fontWeight: 600 }}
            >
              {item.title}
            </Typography>
            {item.routes.map((route) => (
              <MenuItem
                key={route.title}
                component={Link}
                href={`/${instance}${route.href}`}
                selected={isNavigationRouteActive(pathname, instance, route.href)}
                onClick={() => {
                  setAnchor(null);
                  onNavigate();
                }}
                sx={{ fontSize: 13, minHeight: 36 }}
              >
                {route.title}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </>
  );
}

function Sidebar({
  expanded,
  mobile,
  instance,
  pathname,
  items,
  onNavigate,
  onToggle,
}: {
  expanded: boolean;
  mobile?: boolean;
  instance: string;
  pathname: string;
  items: NavigationItem[];
  onNavigate: () => void;
  onToggle: () => void;
}) {
  return (
    <Box
      sx={{
        width: expanded ? 240 : 64,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "var(--ip-surface)",
        borderRight: "1px solid var(--ip-border)",
      }}
    >
      <Box
        sx={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: expanded ? "flex-start" : "center",
          px: expanded ? 2.5 : 0,
          flexShrink: 0,
        }}
      >
        <Link
          href={`/${instance}/`}
          onClick={onNavigate}
          aria-label="in.pulse — Área de Atendimento"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <Image
            src={HorizontalLogo}
            alt="in.pulse"
            width={32}
            height={32}
            style={{ objectFit: "contain", width: 32, height: 32 }}
            priority
          />
          {expanded && (
            <Typography
              component="span"
              sx={{
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: "-0.045em",
                color: "var(--ip-text)",
              }}
            >
              in<span style={{ color: "var(--ip-accent)" }}>.</span>pulse
            </Typography>
          )}
        </Link>
      </Box>
      <Box
        component="nav"
        aria-label="Navegação principal"
        sx={{ minHeight: 0, overflowY: "auto", flex: 1, pt: 2 }}
      >
        {expanded && (
          <Typography
            component="p"
            sx={{
              m: 0,
              px: 2.5,
              mb: 1.5,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--ip-muted)",
            }}
          >
            Área de trabalho
          </Typography>
        )}
        <List disablePadding>
          {items.map((item) => (
            <NavigationEntry
              key={item.title}
              item={item}
              expanded={expanded}
              instance={instance}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </List>
      </Box>
      {!mobile && (
        <Box
          sx={{
            p: 1,
            borderTop: "1px solid var(--ip-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: expanded ? "space-between" : "center",
            minHeight: 56,
          }}
        >
          {expanded && (
            <Typography variant="caption" noWrap sx={{ pl: 1.5, color: "var(--ip-muted)" }}>
              {instance}
            </Typography>
          )}
          <Tooltip title={expanded ? "Recolher navegação" : "Expandir navegação"}>
            <IconButton
              aria-label={expanded ? "Recolher navegação" : "Expandir navegação"}
              aria-expanded={expanded}
              onClick={onToggle}
              size="small"
            >
              {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

const themeChoices: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/** Page chrome lives below persistent chat and phone providers. */
export default function MonitorShell({ children }: { children: ReactNode }) {
  const { instance, user, signOut } = useContext(AuthContext);
  const { parameters } = useContext(WhatsappContext);
  const { preference, setPreference } = useThemeContext();
  const pathname = usePathname();
  const desktop = useMediaQuery("(min-width:1024px)");
  const wide = useMediaQuery("(min-width:1280px)");
  const [expanded, setExpanded] = useState(false);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeAnchor, setThemeAnchor] = useState<HTMLElement | null>(null);
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const storageKey = user && instance ? sidebarStorageKey(instance, user.CODIGO) : null;
  const items = useMemo(
    () => getNavigationItems(parameters, user?.NIVEL, instance),
    [parameters, user?.NIVEL, instance],
  );

  useEffect(() => {
    if (!storageKey) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(storageKey);
    } catch {
      /* Optional browser preference. */
    }
    setExpanded(sidebarExpandedPreference(saved, window.innerWidth));
    setLoadedScope(storageKey);
  }, [storageKey, wide]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, desktop]);
  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (storageKey && loadedScope === storageKey) {
      try {
        localStorage.setItem(storageKey, next ? "expanded" : "compact");
      } catch {
        /* Keep controls functional without storage. */
      }
    }
  };
  const ThemeIcon = themeChoices.find((choice) => choice.value === preference)?.icon ?? Monitor;
  const closeNavigation = () => setMobileOpen(false);

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        minWidth: 0,
        height: "100%",
        color: "var(--ip-text)",
        bgcolor: "var(--ip-bg)",
        overflow: "hidden",
      }}
    >
      <a
        href="#monitor-main"
        className="ip-skip-link"
        style={{
          position: "absolute",
          top: -100,
          left: 16,
          zIndex: 1600,
          padding: "8px 12px",
          background: "var(--ip-accent)",
          color: "var(--ip-on-accent)",
          borderRadius: 8,
        }}
        onFocus={(event) => {
          event.currentTarget.style.top = "12px";
        }}
        onBlur={(event) => {
          event.currentTarget.style.top = "-100px";
        }}
      >
        Ir para o conteúdo
      </a>
      {desktop && (
        <Sidebar
          expanded={expanded}
          instance={instance}
          pathname={pathname}
          items={items}
          onNavigate={closeNavigation}
          onToggle={toggleExpanded}
        />
      )}
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0 }}>
        <Box
          component="header"
          sx={{
            minHeight: 64,
            height: 64,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 2, md: 3 },
            gap: 1,
            borderBottom: "1px solid var(--ip-border)",
            bgcolor: "var(--ip-surface)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, gap: 1.5 }}>
            {!desktop && (
              <IconButton
                edge="start"
                aria-label="Abrir navegação"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon size={20} />
              </IconButton>
            )}
            <Box sx={{ display: { xs: "block", sm: "none" }, minWidth: 0, maxWidth: 80 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Monitoria</Typography>
              <Typography
                noWrap
                title={`Instância: ${instance}`}
                sx={{ fontSize: 10, color: "var(--ip-muted)" }}
              >
                {instance}
              </Typography>
            </Box>
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                minWidth: 0,
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  display: { xs: "none", sm: "block" },
                  color: "var(--ip-muted)",
                  fontSize: 12,
                }}
              >
                Área de trabalho
              </Typography>
              <ChevronRight
                size={12}
                aria-hidden
                style={{ color: "var(--ip-muted)", flexShrink: 0 }}
              />
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Monitoria</Typography>
            </Box>
            <Box
              component="span"
              sx={{
                display: { xs: "none", sm: "block" },
                border: "1px solid var(--ip-border)",
                borderRadius: "6px",
                px: 1,
                py: 0.375,
                color: "var(--ip-muted)",
                fontSize: 11,
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={`Instância: ${instance}`}
            >
              {instance}
            </Box>
          </Box>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: { xs: 0, sm: 0.5 }, flexShrink: 0 }}
          >
            <Tooltip title="Preferência de tema">
              <IconButton
                aria-label="Preferência de tema"
                aria-haspopup="menu"
                aria-expanded={Boolean(themeAnchor)}
                onClick={(event) => setThemeAnchor(event.currentTarget)}
              >
                <ThemeIcon size={18} strokeWidth={1.7} />
              </IconButton>
            </Tooltip>
            <LazyNotificationsDropdown />
            <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.5, sm: 1 }, my: 1 }} />
            <Button
              aria-label={`Menu do usuário ${user?.NOME ?? ""}`}
              aria-haspopup="menu"
              aria-expanded={Boolean(userAnchor)}
              onClick={(event) => setUserAnchor(event.currentTarget)}
              sx={{ minWidth: 0, px: 0.5, gap: 1, color: "var(--ip-text)", textTransform: "none" }}
            >
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: 11,
                  fontWeight: 600,
                  bgcolor: "var(--ip-accent-soft)",
                  color: "var(--ip-accent)",
                }}
              >
                {user?.NOME?.trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((value) => value[0])
                  .join("") || "U"}
              </Avatar>
              <Typography
                noWrap
                sx={{ display: { xs: "none", md: "block" }, fontSize: 12, maxWidth: 140 }}
              >
                {user?.NOME}
              </Typography>
              <ChevronDown size={12} aria-hidden />
            </Button>
          </Box>
        </Box>
        <Box
          component="main"
          id="monitor-main"
          tabIndex={-1}
          sx={{ minHeight: 0, minWidth: 0, overflowY: "auto", flex: 1, outline: "none" }}
        >
          {children}
        </Box>
      </Box>
      <Drawer
        anchor="left"
        open={!desktop && mobileOpen}
        onClose={closeNavigation}
        slotProps={{ paper: { sx: { width: "min(240px, calc(100vw - 48px))" } } }}
      >
        <Sidebar
          mobile
          expanded
          instance={instance}
          pathname={pathname}
          items={items}
          onNavigate={closeNavigation}
          onToggle={toggleExpanded}
        />
      </Drawer>
      <Menu anchorEl={themeAnchor} open={Boolean(themeAnchor)} onClose={() => setThemeAnchor(null)}>
        <Typography sx={{ px: 2, py: 1, fontSize: 12, color: "text.secondary" }}>
          Aparência
        </Typography>
        {themeChoices.map((choice) => (
          <MenuItem
            key={choice.value}
            selected={choice.value === preference}
            onClick={() => {
              setPreference(choice.value);
              setThemeAnchor(null);
            }}
            sx={{ minWidth: 180, gap: 1.5 }}
          >
            <choice.icon size={16} aria-hidden />
            <ListItemText primary={choice.label} />
            {choice.value === preference && <Check size={16} aria-label="Selecionado" />}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        anchorEl={userAnchor}
        open={Boolean(userAnchor)}
        onClose={() => setUserAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 240, maxWidth: "calc(100vw - 32px)" } } }}
      >
        <Box sx={{ px: 2, py: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
            {user?.NOME}
          </Typography>
          <Typography noWrap variant="caption" color="text.secondary">
            Instância: {instance}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setUserAnchor(null);
            setNotificationSettingsOpen(true);
          }}
          sx={{ gap: 1.5, fontSize: 13 }}
        >
          <Settings size={16} aria-hidden />
          Preferências de notificações
        </MenuItem>
        <MenuItem
          onClick={() => {
            setUserAnchor(null);
            void signOut();
          }}
          sx={{ gap: 1.5, fontSize: 13 }}
        >
          <LogOut size={16} aria-hidden />
          Sair
        </MenuItem>
      </Menu>
      <NotificationPreferencesModal
        open={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
      />
    </Box>
  );
}
