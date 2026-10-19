"use client";

import { IconButton, Tooltip, type IconButtonProps } from "@mui/material";
import { forwardRef, type ReactNode } from "react";
import { UiIcon } from "./icons";

export interface OperationalIconButtonProps extends Omit<IconButtonProps, "aria-label"> {
  label: string;
  tooltip?: ReactNode;
}

/** Routine actions stay quiet, while their names remain available to keyboard and screen readers. */
export const OperationalIconButton = forwardRef<HTMLButtonElement, OperationalIconButtonProps>(
  function OperationalIconButton({ label, tooltip, className, children, ...props }, ref) {
    return (
      <Tooltip title={tooltip ?? label} describeChild>
        <span className="ip-icon-action-host">
          <IconButton
            {...props}
            ref={ref}
            aria-label={label}
            className={`ip-icon-action ${className ?? ""}`}
          >
            {children}
          </IconButton>
        </span>
      </Tooltip>
    );
  },
);

export interface MonitorRefreshActionsProps {
  autoRefresh: boolean;
  busy: boolean;
  retrySeconds: number;
  onToggle: () => void;
  onRefresh: () => void;
}

export function MonitorRefreshActions({
  autoRefresh,
  busy,
  retrySeconds,
  onToggle,
  onRefresh,
}: MonitorRefreshActionsProps) {
  const toggleLabel = autoRefresh
    ? "Pausar atualização automática"
    : "Retomar atualização automática";
  return (
    <div className="ip-refresh-actions">
      {retrySeconds > 0 && (
        <span className="ip-muted ip-refresh-cooldown" aria-live="off">
          Aguarde {retrySeconds}s
        </span>
      )}
      <OperationalIconButton label={toggleLabel} onClick={onToggle}>
        <UiIcon name={autoRefresh ? "pause" : "play"} scale="toolbar" />
      </OperationalIconButton>
      <OperationalIconButton
        label={retrySeconds > 0 ? `Aguarde ${retrySeconds}s` : "Atualizar"}
        tooltip={
          retrySeconds > 0
            ? `Aguarde ${retrySeconds}s para atualizar`
            : busy
              ? "Atualizando…"
              : "Atualizar"
        }
        disabled={busy || retrySeconds > 0}
        onClick={onRefresh}
      >
        <UiIcon
          name="refresh"
          scale="toolbar"
          className={busy ? "animate-spin motion-reduce:animate-none" : ""}
        />
      </OperationalIconButton>
    </div>
  );
}
