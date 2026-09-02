"use client";

import { useReportWebVitals } from "next/web-vitals";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  frontendPerformanceCollector,
  recordFrontendPerformanceMetric,
} from "./frontend-performance";

const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  "development";

interface FrontendPerformanceProviderProps {
  enabled: boolean;
  token: string;
  endpoint: string;
}

function WebVitalsReporter({ sessionId }: { sessionId: string }) {
  const reportWebVital = useCallback((metric: { name: string; value: number; rating?: string }) => {
    if (frontendPerformanceCollector.getSessionId() !== sessionId) return;
    const name = metric.name.toLowerCase();
    if (!["inp", "lcp", "cls", "fcp", "ttfb"].includes(name)) return;
    recordFrontendPerformanceMetric({
      name: `web_vital.${name}`,
      value: metric.value,
      unit: name === "cls" ? "ratio" : "ms",
      tags: metric.rating ? { rating: metric.rating } : undefined,
    });
  }, [sessionId]);

  useReportWebVitals(reportWebVital);
  return null;
}

export default function FrontendPerformanceProvider({
  enabled,
  token,
  endpoint,
}: FrontendPerformanceProviderProps) {
  const pathname = usePathname();
  const [reporterSessionId, setReporterSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      frontendPerformanceCollector.stop();
      setReporterSessionId(null);
      return;
    }
    frontendPerformanceCollector.start({ token, endpoint, buildId: BUILD_ID, route: pathname });
    setReporterSessionId(frontendPerformanceCollector.getSessionId());
  }, [enabled, endpoint, token]);

  useEffect(() => () => frontendPerformanceCollector.stop(), []);

  useEffect(() => {
    if (enabled) frontendPerformanceCollector.setRoute(pathname);
  }, [enabled, pathname]);

  return enabled &&
    token &&
    reporterSessionId &&
    frontendPerformanceCollector.isDocumentMetricsOwner(reporterSessionId) ? (
    <WebVitalsReporter key={reporterSessionId} sessionId={reporterSessionId} />
  ) : null;
}
