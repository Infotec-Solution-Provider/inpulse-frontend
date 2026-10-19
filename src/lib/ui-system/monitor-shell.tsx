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
import { usePathname, useSearchParams } from "next/navigation";
import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getNavigationItems,
  activeNavigationPath,
  isNavigationRouteActive,
  sidebarExpandedPreference,
  sidebarStorageKey,
  type NavigationItem,
  type NavigationIcon,
} from "./navigation";
import type { ThemePreference } from "./theme-preference";
import { UiIcon } from "./icons";
import { NavigationTree } from "./navigation-tree";
import { PilotDesignProvider } from "./provider";
import { uiCssVariables } from "./tokens";

function Sidebar({
  expanded,
  mobile,
  instance,
  pathname,
  search,
  items,
  onNavigate,
  onToggle,
}: {
  expanded: boolean;
  mobile?: boolean;
  instance: string;
  pathname: string;
  search: string;
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
        <NavigationTree
          items={items}
          expanded={expanded}
          instance={instance}
          pathname={pathname}
          search={search}
          onNavigate={onNavigate}
        />
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
              <UiIcon icon={expanded ? PanelLeftClose : PanelLeftOpen} scale="toolbar" />
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
  const { preference, setPreference, theme } = useThemeContext();
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? "";
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
  const activePath = activeNavigationPath(items, pathname, instance, search);
  const pageTitle = activePath[0]?.title ?? "in.pulse";
  const ThemeIcon = themeChoices.find((choice) => choice.value === preference)?.icon ?? Monitor;
  const closeNavigation = () => setMobileOpen(false);

  return (
    <Box
      style={uiCssVariables(theme)}
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
        href="#app-main"
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
        <PilotDesignProvider style={{ flexShrink: 0 }}>
          <Sidebar
            expanded={expanded}
            instance={instance}
            pathname={pathname}
            search={search}
            items={items}
            onNavigate={closeNavigation}
            onToggle={toggleExpanded}
          />
        </PilotDesignProvider>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0 }}>
        <PilotDesignProvider style={{ height: 64, flexShrink: 0 }}>
          {" "}
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
                  <UiIcon icon={MenuIcon} scale="toolbar" />
                </IconButton>
              )}
              <Box sx={{ display: { xs: "block", sm: "none" }, minWidth: 0, maxWidth: 80 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{pageTitle}</Typography>
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
                <UiIcon
                  icon={ChevronRight}
                  scale="metadata"
                  style={{ color: "var(--ip-muted)", flexShrink: 0 }}
                />
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{pageTitle}</Typography>
              </Box>
              <Box
                component="span"
                sx={{
                  display: { xs: "none", sm: "block" },
                  bgcolor: "var(--ip-surface-muted)",
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
                  <UiIcon icon={ThemeIcon} scale="toolbar" />
                </IconButton>
              </Tooltip>
              <LazyNotificationsDropdown />
              <Divider orientation="vertical" flexItem sx={{ mx: { xs: 0.5, sm: 1 }, my: 1 }} />
              <Button
                aria-label={`Menu do usuário ${user?.NOME ?? ""}`}
                aria-haspopup="menu"
                aria-expanded={Boolean(userAnchor)}
                onClick={(event) => setUserAnchor(event.currentTarget)}
                sx={{
                  minWidth: 0,
                  px: 0.5,
                  gap: 1,
                  color: "var(--ip-text)",
                  textTransform: "none",
                }}
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
                <UiIcon icon={ChevronDown} scale="metadata" />
              </Button>
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
              search={search}
              items={items}
              onNavigate={closeNavigation}
              onToggle={toggleExpanded}
            />
          </Drawer>
          <Menu
            anchorEl={themeAnchor}
            open={Boolean(themeAnchor)}
            onClose={() => setThemeAnchor(null)}
          >
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
                <UiIcon icon={choice.icon} scale="metadata" />
                <ListItemText primary={choice.label} />
                {choice.value === preference && (
                  <UiIcon icon={Check} scale="metadata" aria-label="Selecionado" />
                )}
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
              <UiIcon icon={Settings} scale="metadata" />
              Preferências de notificações
            </MenuItem>
            <MenuItem
              onClick={() => {
                setUserAnchor(null);
                void signOut();
              }}
              sx={{ gap: 1.5, fontSize: 13 }}
            >
              <UiIcon icon={LogOut} scale="metadata" />
              Sair
            </MenuItem>
          </Menu>
          <NotificationPreferencesModal
            open={notificationSettingsOpen}
            onClose={() => setNotificationSettingsOpen(false)}
          />
        </PilotDesignProvider>
        <Box
          component="main"
          id="app-main"
          tabIndex={-1}
          sx={{ minHeight: 0, minWidth: 0, overflowY: "auto", flex: 1, outline: "none" }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
