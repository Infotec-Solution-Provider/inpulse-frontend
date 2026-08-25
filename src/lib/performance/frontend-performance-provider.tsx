"use client";

import { useReportWebVitals } from "next/web-vitals";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import {
  frontendPerformanceCollector,
  recordFrontendPerformanceMetric,
} from "./frontend-performance";

const BUILD_ID =
  process.env["NEXT_PUBLIC_BUILD_SHA"] ||
  process.env["NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA"] ||
  "development";

interface FrontendPerformanceProviderProps {
  enabled: boolean;
  token: string;
  endpoint: string;
}

export default function FrontendPerformanceProvider({
  enabled,
  token,
  endpoint,
}: FrontendPerformanceProviderProps) {
  const pathname = usePathname();
  const reportWebVital = useCallback((metric: { name: string; value: number; rating?: string }) => {
    const name = metric.name.toLowerCase();
    if (!["inp", "lcp", "cls", "fcp", "ttfb"].includes(name)) return;
    recordFrontendPerformanceMetric({
      name: `web_vital.${name}`,
      value: metric.value,
      unit: name === "cls" ? "ratio" : "ms",
      tags: metric.rating ? { rating: metric.rating } : undefined,
    });
  }, []);

  useReportWebVitals(reportWebVital);

  useEffect(() => {
    if (!enabled || !token) {
      frontendPerformanceCollector.stop();
      return;
    }
    frontendPerformanceCollector.start({ token, endpoint, buildId: BUILD_ID, route: pathname });
    return () => frontendPerformanceCollector.stop();
  }, [enabled, endpoint, token]);

  useEffect(() => {
    if (enabled) frontendPerformanceCollector.setRoute(pathname);
  }, [enabled, pathname]);

  return null;
}
