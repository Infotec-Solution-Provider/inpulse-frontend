import { useEffect, useRef } from "react";
import {
  frontendPerformanceCollector,
  recordFrontendPerformanceMetric,
} from "./frontend-performance";

const RENDER_AGGREGATION_WINDOW_MS = 30_000;
const RENDER_DURATION_SAMPLE_RATE = 20;

interface RenderAggregate {
  component: string;
  count: number;
  durationCount: number;
  route: string;
  sessionId: string;
  totalDuration: number;
}

const renderAccumulators = new Set<RenderAggregate>();
let renderFlushTimer: ReturnType<typeof setTimeout> | null = null;
let renderFlushHookRegistered = false;

function flushRenderMetrics() {
  if (renderFlushTimer !== null) clearTimeout(renderFlushTimer);
  renderFlushTimer = null;
  const activeSessionId = frontendPerformanceCollector.getSessionId();
  const grouped = new Map<string, RenderAggregate>();
  for (const accumulator of renderAccumulators) {
    if (accumulator.count === 0) continue;
    const key = `${accumulator.sessionId}\u0000${accumulator.route}\u0000${accumulator.component}`;
    const aggregate = grouped.get(key) ?? {
      component: accumulator.component,
      count: 0,
      durationCount: 0,
      route: accumulator.route,
      sessionId: accumulator.sessionId,
      totalDuration: 0,
    };
    aggregate.count += accumulator.count;
    aggregate.durationCount += accumulator.durationCount;
    aggregate.totalDuration += accumulator.totalDuration;
    grouped.set(key, aggregate);
    accumulator.count = 0;
    accumulator.durationCount = 0;
    accumulator.totalDuration = 0;
  }
  for (const aggregate of grouped.values()) {
    if (!activeSessionId || aggregate.sessionId !== activeSessionId) continue;
    recordFrontendPerformanceMetric({
      name: "render.count",
      value: aggregate.count,
      unit: "count",
      route: aggregate.route,
      tags: { component: aggregate.component, source: "30s_window" },
      detailed: true,
    });
    if (aggregate.durationCount > 0) {
      recordFrontendPerformanceMetric({
        name: "render.commit_latency",
        value: aggregate.totalDuration / aggregate.durationCount,
        unit: "ms",
        route: aggregate.route,
        tags: { component: aggregate.component, source: "render_to_effect_sampled_1_in_20" },
        detailed: true,
      });
    }
  }
}

function ensureRenderFlushScheduled() {
  if (!renderFlushHookRegistered) {
    frontendPerformanceCollector.registerFlushHook(flushRenderMetrics);
    renderFlushHookRegistered = true;
  }
  renderFlushTimer ??= setTimeout(flushRenderMetrics, RENDER_AGGREGATION_WINDOW_MS);
}

export function useFrontendRenderMetric(component: string) {
  const renderSequenceRef = useRef(0);
  const accumulatorRef = useRef<RenderAggregate>({
    component,
    count: 0,
    durationCount: 0,
    route: "/unknown",
    sessionId: "",
    totalDuration: 0,
  });
  renderSequenceRef.current += 1;
  const sessionId = frontendPerformanceCollector.getSessionId();
  const detailed = frontendPerformanceCollector.isDetailed();
  const route = sessionId && detailed ? frontendPerformanceCollector.getRoute() : "/unknown";
  const shouldMeasureDuration = renderSequenceRef.current % RENDER_DURATION_SAMPLE_RATE === 1;
  const started = sessionId && detailed && shouldMeasureDuration ? performance.now() : null;
  useEffect(() => {
    if (!sessionId || !detailed) return;
    const accumulator = accumulatorRef.current;
    if (
      accumulator.count > 0 &&
      (accumulator.sessionId !== sessionId || accumulator.route !== route)
    ) {
      flushRenderMetrics();
    }
    accumulator.component = component;
    accumulator.sessionId = sessionId;
    accumulator.route = route;
    accumulator.count += 1;
    if (started !== null) {
      accumulator.durationCount += 1;
      accumulator.totalDuration += performance.now() - started;
    }
    renderAccumulators.add(accumulator);
    ensureRenderFlushScheduled();
  });
  useEffect(
    () => () => {
      const accumulator = accumulatorRef.current;
      if (accumulator.count > 0) flushRenderMetrics();
      renderAccumulators.delete(accumulator);
    },
    [],
  );
}
