"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportDefinition } from "./catalog";

const historyLimit = 5;
const startingReports = ["messages-per-user", "general-performance", "sales"];

function readHistory(raw: string | null): string[] {
  const value: unknown = raw ? JSON.parse(raw) : [];
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === "string"))].slice(
        0,
        historyLimit,
      )
    : [];
}

export function getReportSuggestions(reports: readonly ReportDefinition[], recentIds: string[]) {
  const byId = new Map(reports.map((report) => [report.id, report]));
  const visible = (ids: string[]) =>
    ids.flatMap((id) => {
      const report = byId.get(id);
      return report ? [report] : [];
    });

  const recent = visible(recentIds);
  if (recent.length) return { title: "Últimos abertos", reports: recent };
  const preferred = visible(startingReports);
  const rest = reports.filter((report) => !startingReports.includes(report.id));
  return { title: "Para começar", reports: [...preferred, ...rest].slice(0, 3) };
}

export function useRecentReports({
  instance,
  userId,
  pathname,
  reports,
}: {
  instance: string;
  userId: number | undefined;
  pathname: string;
  reports: readonly ReportDefinition[];
}) {
  const key =
    instance && userId !== undefined
      ? "@inpulse/ui/recent-reports:v1:" + encodeURIComponent(instance) + ":" + userId
      : null;
  const [history, setHistory] = useState<{
    key: string;
    pathname: string;
    reports: readonly ReportDefinition[];
    ids: string[];
  }>();
  const fallback = useRef(new Map<string, string[]>());

  useEffect(() => {
    if (!key) return;
    const basePath = process.env.NEXT_PUBLIC_FRONTEND_BASE_PATH || "";
    const currentPath = (
      basePath && pathname.startsWith(basePath + "/") ? pathname.slice(basePath.length) : pathname
    ).replace(/\/$/, "");
    const opened = reports.find((report) => currentPath === "/" + instance + report.href);
    let ids = fallback.current.get(key) ?? [];
    try {
      if (!fallback.current.has(key)) ids = readHistory(localStorage.getItem(key));
    } catch {
      // A malformed value or unavailable storage should never prevent navigation.
    }

    if (opened && opened.id !== ids[0]) {
      ids = [opened.id, ...ids.filter((id) => id !== opened.id)].slice(0, historyLimit);
      try {
        localStorage.setItem(key, JSON.stringify(ids));
        fallback.current.delete(key);
      } catch {
        fallback.current.set(key, ids);
      }
    }

    setHistory({ key, pathname, reports, ids });
  }, [instance, key, pathname, reports]);

  const ready =
    history?.key === key && history.pathname === pathname && history.reports === reports;
  return { ready, ids: history?.key === key ? history.ids : [] };
}
