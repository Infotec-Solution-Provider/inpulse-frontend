"use client";

import {
  Box,
  IconButton,
  List,
  ListItemButton,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ChevronDown, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { searchReports, type ReportDefinition } from "@/lib/reports/catalog";
import { getReportSuggestions } from "@/lib/reports/recent";
import { UiIcon } from "./icons";

export interface ReportShortcuts {
  scope: string;
  ready: boolean;
  reports: readonly ReportDefinition[];
  recentIds: string[];
}

export function ReportsNavigationEntry({
  children,
  expanded,
  instance,
  locationKey,
  shortcuts,
  onNavigate,
}: {
  children: ReactNode;
  expanded: boolean;
  instance: string;
  locationKey: string;
  shortcuts: ReportShortcuts;
  onNavigate: () => void;
}) {
  const dialogId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => setAnchor(null), [locationKey]);

  const open = Boolean(anchor);
  const searching = Boolean(query.trim());
  const suggestions = getReportSuggestions(shortcuts.reports, shortcuts.recentIds);
  const visible = searching ? searchReports(shortcuts.reports, query) : suggestions.reports;

  return (
    <Box
      sx={{ display: "flex", alignItems: "center", mx: expanded ? 1 : 0.5, mb: 0.25, minWidth: 0 }}
    >
      {children}
      <Tooltip
        title={shortcuts.ready ? "Acesso rápido a relatórios" : "Carregando relatórios…"}
        placement="right"
      >
        <span style={{ display: "inline-flex" }}>
          <IconButton
            disabled={!shortcuts.ready}
            aria-label="Acesso rápido a relatórios"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? dialogId : undefined}
            onClick={(event) => {
              setQuery("");
              setAnchor(event.currentTarget);
            }}
            sx={{
              width: expanded ? { xs: 44, lg: 36 } : 26,
              height: { xs: 44, lg: 36 },
              flexShrink: 0,
              borderRadius: "8px",
              color: open ? "var(--ip-accent)" : "var(--ip-muted)",
            }}
          >
            <UiIcon icon={ChevronDown} scale="metadata" />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "center", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        marginThreshold={12}
        slotProps={{
          paper: {
            id: dialogId,
            role: "dialog",
            "aria-modal": true,
            "aria-labelledby": dialogId + "-title",
            sx: { width: 332, maxWidth: "calc(100vw - 24px)", p: 1.5 },
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography
            id={dialogId + "-title"}
            component="h2"
            sx={{ pl: 0.5, fontSize: 14, fontWeight: 600 }}
          >
            Acesso rápido a relatórios
          </Typography>
          <IconButton
            aria-label="Fechar acesso rápido"
            size="small"
            onClick={() => setAnchor(null)}
            sx={{ width: { xs: 44, lg: 32 }, height: { xs: 44, lg: 32 } }}
          >
            <UiIcon icon={X} scale="metadata" />
          </IconButton>
        </Box>
        <TextField
          autoFocus
          fullWidth
          size="small"
          type="search"
          label="Buscar relatório"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <Search size={16} aria-hidden style={{ marginRight: 8, flexShrink: 0 }} />
              ),
            },
          }}
        />
        {!shortcuts.ready || !visible.length ? (
          <Typography
            role="status"
            sx={{ px: 0.5, py: 1.5, color: "text.secondary", fontSize: 13 }}
          >
            {!shortcuts.ready
              ? "Carregando relatórios…"
              : searching
                ? "Nenhum relatório encontrado."
                : "Nenhum relatório disponível."}
          </Typography>
        ) : (
          <>
            <Typography
              component="h3"
              id={dialogId + "-results"}
              sx={{ mt: 1.5, px: 0.5, color: "text.secondary", fontSize: 12, fontWeight: 600 }}
            >
              {searching ? "Resultados da busca" : suggestions.title}
            </Typography>
            <List
              disablePadding
              aria-labelledby={dialogId + "-results"}
              sx={{ mt: 0.5, maxHeight: "min(300px, 50dvh)", overflowY: "auto" }}
            >
              {visible.map((report) => (
                <Box key={report.id} component="li">
                  <ListItemButton
                    component={Link}
                    href={"/" + instance + report.href}
                    prefetch={false}
                    onClick={() => {
                      setAnchor(null);
                      onNavigate();
                    }}
                    sx={{ borderRadius: "8px", px: 1, minHeight: { xs: 44, lg: 36 }, fontSize: 13 }}
                  >
                    {report.title}
                  </ListItemButton>
                </Box>
              ))}
            </List>
          </>
        )}
      </Popover>
    </Box>
  );
}
