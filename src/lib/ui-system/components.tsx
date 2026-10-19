"use client";

import { Button, Chip, Drawer, IconButton } from "@mui/material";
import { SearchX, SlidersHorizontal, X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { usePilotPortal } from "./provider";

export interface OperationalPanelProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
  embedded?: boolean;
  closeLabel?: string;
}
export function OperationalPanel({
  open,
  title,
  description,
  onClose,
  width = 480,
  children,
  footer,
  headerAction,
  embedded = false,
  closeLabel,
}: OperationalPanelProps) {
  const titleId = useId();
  const descriptionId = useId();
  const container = usePilotPortal();
  const content = (
    <>
      <header className="ip-panel-header">
        <div className="min-w-0 flex-1">
          {headerAction && <div className="mb-2">{headerAction}</div>}
          <h2 id={titleId} className="ip-panel-title">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="ip-panel-description">
              {description}
            </p>
          )}
        </div>
        <IconButton
          autoFocus={embedded}
          onClick={onClose}
          aria-label={closeLabel || `Fechar ${title.toLowerCase()}`}
        >
          <X size={20} />
        </IconButton>
      </header>
      <div className="ip-panel-body">{children}</div>
      {footer && <footer className="ip-panel-footer">{footer}</footer>}
    </>
  );
  if (!open) return null;
  if (embedded)
    return (
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="ip-panel ip-panel-embedded"
        style={{ "--ip-panel-width": `${width}px` } as React.CSSProperties}
      >
        {content}
      </aside>
    );
  return (
    <Drawer
      open
      anchor="right"
      onClose={(_event, reason) => {
        if (reason !== "backdropClick") onClose();
      }}
      ModalProps={{ container }}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-modal": true,
          "aria-labelledby": titleId,
          "aria-describedby": description ? descriptionId : undefined,
          className: "ip-panel",
          sx: {
            width,
            maxWidth: "100vw",
            borderRadius: 0,
            borderLeft: "1px solid var(--ip-border)",
            backgroundImage: "none",
            "@media(max-width:1023px)": { width: "100vw" },
          },
        },
      }}
    >
      {content}
    </Drawer>
  );
}

export interface AppliedFilterChip {
  key: string;
  label: string;
  description?: string;
  onDelete: () => void;
}
export function FilterChipBar({
  items,
  onShowAll,
  maxVisible = 3,
  onClearAll,
}: {
  items: AppliedFilterChip[];
  onShowAll: () => void;
  maxVisible?: number;
  onClearAll?: () => void;
}) {
  if (!items.length) return null;
  const visible = items.slice(0, maxVisible),
    more = items.length - visible.length;
  return (
    <div className="ip-filter-chips" aria-label="Filtros aplicados">
      <SlidersHorizontal size={14} aria-hidden="true" className="ip-muted shrink-0" />
      {visible.map((item) => (
        <Chip
          key={item.key}
          label={item.label}
          title={item.description || item.label}
          aria-label={`Filtro aplicado ${item.label}. Pressione Delete para remover.`}
          onDelete={item.onDelete}
          size="small"
          deleteIcon={<X size={14} aria-hidden="true" />}
        />
      ))}
      {more > 0 && (
        <Button size="small" onClick={onShowAll}>
          +{more} filtros
        </Button>
      )}
      {onClearAll && (
        <Button size="small" color="inherit" onClick={onClearAll}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

export function MonitorEmptyState({
  title,
  description,
  onReset,
  onRefresh,
  busy = false,
}: {
  title: string;
  description: string;
  onReset?: () => void;
  onRefresh?: () => void;
  busy?: boolean;
}) {
  return (
    <div role="status" className="ip-empty-state">
      <span className="ip-empty-icon">
        <SearchX size={26} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="ip-actions">
        {onReset && (
          <Button variant="outlined" color="inherit" disabled={busy} onClick={onReset}>
            Limpar filtros
          </Button>
        )}
        {onRefresh && (
          <Button disabled={busy} onClick={onRefresh}>
            Atualizar lista
          </Button>
        )}
      </div>
    </div>
  );
}
