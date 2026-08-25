import { useEffect } from "react";
import {
  frontendPerformanceCollector,
  recordFrontendPerformanceMetric,
} from "./frontend-performance";

export function useFrontendRenderMetric(component: string) {
  const started = frontendPerformanceCollector.isDetailed() ? performance.now() : null;
  useEffect(() => {
    if (started === null) return;
    recordFrontendPerformanceMetric({
      name: "render.count",
      value: 1,
      unit: "count",
      tags: { component },
      detailed: true,
    });
    recordFrontendPerformanceMetric({
      name: "render.duration",
      value: performance.now() - started,
      unit: "ms",
      tags: { component },
      detailed: true,
    });
  });
}
