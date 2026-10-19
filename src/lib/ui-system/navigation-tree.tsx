"use client";

import {
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import {
  AudioLines,
  Blocks,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Headset,
  Megaphone,
  RadioTower,
  Sparkles,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { UiIcon } from "./icons";
import { activeNavigationPath, type NavigationIcon, type NavigationItem } from "./navigation";

const icons: Record<NavigationIcon, typeof Headset> = {
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
type Props = {
  items: NavigationItem[];
  expanded: boolean;
  instance: string;
  pathname: string;
  search?: string;
  onNavigate: () => void;
};

export function NavigationTree({
  items,
  expanded,
  instance,
  pathname,
  search = "",
  onNavigate,
}: Props) {
  const active = useMemo(
    () => activeNavigationPath(items, pathname, instance, search),
    [items, pathname, instance, search],
  );
  const activeIds = active.map((item) => item.id);
  return (
    <List disablePadding>
      {items.map((item) => (
        <Entry
          key={item.id}
          item={item}
          expanded={expanded}
          instance={instance}
          onNavigate={onNavigate}
          activeIds={activeIds}
          locationKey={`${pathname}?${search}`}
        />
      ))}
    </List>
  );
}

function Entry({
  item,
  expanded,
  instance,
  onNavigate,
  activeIds,
  locationKey,
  depth = 0,
}: {
  item: NavigationItem;
  expanded: boolean;
  instance: string;
  onNavigate: () => void;
  activeIds: string[];
  locationKey: string;
  depth?: number;
}) {
  const active = activeIds.includes(item.id),
    selected = activeIds.at(-1) === item.id;
  const [open, setOpen] = useState(active);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [trail, setTrail] = useState<NavigationItem[]>([]);
  const menuList = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    if (!anchor) return;
    menuList.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [anchor, trail.length]);
  useEffect(() => {
    if (active) setOpen(true);
    setAnchor(null);
    setTrail([]);
  }, [locationKey, active]);
  const Icon = item.icon ? icons[item.icon] : Blocks;
  const groupId = `navigation-${item.id}`;
  const sx = {
    minHeight: { xs: 44, lg: 36 },
    mx: 1,
    mb: 0.25,
    py: 0.75,
    px: expanded ? 1.5 : 1.25,
    ml: expanded ? 1 + depth * 1.5 : 1,
    borderRadius: "8px",
    minWidth: 0,
    color: active ? "var(--ip-text)" : "var(--ip-muted)",
    "&.Mui-selected, &.Mui-selected:hover": {
      bgcolor: "var(--ip-accent-soft)",
      color: "var(--ip-accent)",
      boxShadow: "inset 3px 0 0 var(--ip-accent)",
    },
    "&:hover": { bgcolor: "var(--ip-surface-muted)", color: "var(--ip-text)" },
    "&:active": { bgcolor: "var(--ip-pressed)" },
  };
  const content = (
    <>
      {depth === 0 && (
        <ListItemIcon sx={{ minWidth: expanded ? 30 : 20, color: "inherit" }}>
          <UiIcon icon={Icon} scale="navigation" />
        </ListItemIcon>
      )}
      {expanded && (
        <ListItemText
          primary={item.title}
          primaryTypographyProps={{ fontSize: depth ? 12 : 13, fontWeight: active ? 600 : 500 }}
          sx={{ m: 0 }}
        />
      )}
      {expanded && item.kind === "group" && (
        <UiIcon icon={open ? ChevronDown : ChevronRight} scale="metadata" />
      )}
    </>
  );
  const current = trail.at(-1) ?? item;
  return (
    <>
      <Tooltip title={expanded ? "" : item.title} placement="right">
        {item.kind === "link" ? (
          <ListItemButton
            component={Link}
            href={`/${instance}${item.href}`}
            onClick={onNavigate}
            selected={selected}
            aria-label={expanded ? undefined : item.title}
            aria-current={selected ? "page" : undefined}
            sx={sx}
          >
            {content}
          </ListItemButton>
        ) : (
          <ListItemButton
            onClick={(event) =>
              expanded ? setOpen((value) => !value) : setAnchor(event.currentTarget)
            }
            aria-label={expanded ? undefined : item.title}
            aria-expanded={expanded ? open : Boolean(anchor)}
            aria-controls={expanded && open ? groupId : undefined}
            aria-haspopup={expanded ? undefined : "menu"}
            sx={sx}
          >
            {content}
          </ListItemButton>
        )}
      </Tooltip>
      {item.kind === "group" && (
        <>
          <Collapse in={expanded && open} timeout={160} unmountOnExit>
            <List component="div" id={groupId} disablePadding>
              {item.routes.map((child) => (
                <Entry
                  key={child.id}
                  item={child}
                  expanded
                  instance={instance}
                  onNavigate={onNavigate}
                  activeIds={activeIds}
                  locationKey={locationKey}
                  depth={depth + 1}
                />
              ))}
            </List>
          </Collapse>
          <Menu
            anchorEl={anchor}
            open={!expanded && Boolean(anchor)}
            onClose={() => {
              setAnchor(null);
              setTrail([]);
            }}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            slotProps={{
              paper: { sx: { width: 260, maxWidth: "calc(100vw - 24px)" } },
              list: { ref: menuList, "aria-label": current.title },
            }}
          >
            {trail.length > 0 && (
              <MenuItem onClick={() => setTrail((value) => value.slice(0, -1))}>
                <UiIcon icon={ChevronLeft} scale="metadata" />
                <Box component="span" ml={1}>
                  Voltar para {trail.length > 1 ? trail[trail.length - 2].title : item.title}
                </Box>
              </MenuItem>
            )}
            <Box
              component="li"
              sx={{ px: 2, py: 1, fontSize: 12, fontWeight: 600, color: "text.secondary" }}
            >
              {current.title}
            </Box>
            {current.kind === "group" &&
              current.routes.map((child) =>
                child.kind === "link" ? (
                  <MenuItem
                    key={child.id}
                    component={Link}
                    href={`/${instance}${child.href}`}
                    selected={activeIds.at(-1) === child.id}
                    aria-current={activeIds.at(-1) === child.id ? "page" : undefined}
                    onClick={() => {
                      setAnchor(null);
                      setTrail([]);
                      onNavigate();
                    }}
                    sx={{ minHeight: 44, fontSize: 13 }}
                  >
                    {child.title}
                  </MenuItem>
                ) : (
                  <MenuItem
                    key={child.id}
                    onClick={() => setTrail((value) => [...value, child])}
                    sx={{ minHeight: 44, fontSize: 13, justifyContent: "space-between" }}
                  >
                    {child.title}
                    <UiIcon icon={ChevronRight} scale="metadata" />
                  </MenuItem>
                ),
              )}
          </Menu>
        </>
      )}
    </>
  );
}
