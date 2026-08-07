"use client";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Tooltip } from "@mui/material";
import { ReactNode } from "react";

interface DashboardHelpTooltipProps {
  title: ReactNode;
}

export function DashboardHelpTooltip({ title }: DashboardHelpTooltipProps) {
  return (
    <Tooltip
      title={<div className="max-w-xs text-sm leading-5">{title}</div>}
      arrow
      placement="top"
      enterTouchDelay={0}
    >
      <span className="inline-flex cursor-help text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
        <InfoOutlinedIcon sx={{ fontSize: 15 }} />
      </span>
    </Tooltip>
  );
}

interface DashboardLabelWithTooltipProps {
  label: ReactNode;
  tooltip?: ReactNode;
  className?: string;
}

export function DashboardLabelWithTooltip({
  label,
  tooltip,
  className,
}: DashboardLabelWithTooltipProps) {
  return (
    <span className={className || "inline-flex items-center gap-1.5"}>
      <span>{label}</span>
      {tooltip ? <DashboardHelpTooltip title={tooltip} /> : null}
    </span>
  );
}