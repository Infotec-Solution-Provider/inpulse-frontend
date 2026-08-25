export type FrontendMetricUnit = "ms" | "bytes" | "count" | "ratio";

export interface FrontendMetricTags {
  rating?: string;
  component?: string;
  interaction?: string;
  event?: string;
  endpoint?: string;
  statusClass?: string;
  initiatorType?: string;
  navigationType?: string;
  source?: string;
  errorName?: string;
  errorMessage?: string;
  errorFingerprint?: string;
  topFrame?: string;
  detailLevel?: "light" | "detailed";
}

export interface FrontendMetricInput {
  name: string;
  value: number;
  unit: FrontendMetricUnit;
  occurredAt?: string;
  route?: string;
  tags?: FrontendMetricTags;
  detailed?: boolean;
}

interface DeviceMetadata {
  browser: string;
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
  effectiveType: string | null;
  viewportWidth: number;
  viewportHeight: number;
}

interface QueuedMetric {
  name: string;
  value: number;
  unit: FrontendMetricUnit;
  occurredAt: string;
  route: string;
  tags?: FrontendMetricTags;
}

interface NavigatorWithDiagnostics extends Navigator {
  deviceMemory?: number;
  connection?: { effectiveType?: string };
}

interface PerformanceWithMemory extends Performance {
  memory?: { usedJSHeapSize?: number };
}

const MAX_BATCH_SAMPLES = 50;
const MAX_BATCH_BYTES = 60 * 1024;
const MAX_QUEUE_SAMPLES = 500;
const FLUSH_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 2_000;

function randomRatio(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return (values[0] ?? 0) / 0xffffffff;
}

export function normalizeTelemetryRoute(value: string): string {
  let path = value.split(/[?#]/, 1)[0] || "/unknown";
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    path = "/unknown";
  }

  const segments = path
    .split("/")
    .filter(Boolean)
    .slice(0, 12)
    .map((segment) => {
      if (/^\d+$/.test(segment)) return ":id";
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ":id";
      return segment.slice(0, 64).replace(/[^a-zA-Z0-9_.:-]/g, "_");
    });

  if (segments.length > 0 && segments[0] !== "api") segments[0] = ":instance";
  return `/${segments.join("/")}`.slice(0, 255) || "/unknown";
}

export function sanitizeTelemetryError(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value ?? "Unknown error");
  return message
    .replace(/https?:\/\/[^\s]+/gi, "[url]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/\b(?:bearer\s+)?[a-z0-9_-]{24,}\b/gi, "[secret]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[number]")
    .slice(0, 240);
}

export function telemetryErrorFingerprint(name: string, message: string, topFrame: string): string {
  const input = `${name}|${message}|${topFrame}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function browserFamily(): string {
  const ua = navigator.userAgent;
  const match = ua.match(/(Edg|Chrome|Firefox|Version)\/(\d+)/);
  if (!match) return "Unknown";
  const family = match[1] === "Version" && /Safari/.test(ua) ? "Safari" : match[1];
  return `${family || "Unknown"} ${match[2] || ""}`.trim().slice(0, 64);
}

function getDeviceMetadata(): DeviceMetadata {
  const diagnosticNavigator = navigator as NavigatorWithDiagnostics;
  return {
    browser: browserFamily(),
    hardwareConcurrency: Number.isFinite(navigator.hardwareConcurrency)
      ? navigator.hardwareConcurrency
      : null,
    deviceMemoryGb: Number.isFinite(diagnosticNavigator.deviceMemory)
      ? (diagnosticNavigator.deviceMemory ?? null)
      : null,
    effectiveType: diagnosticNavigator.connection?.effectiveType?.slice(0, 16) ?? null,
    viewportWidth: Math.max(1, Math.round(window.innerWidth)),
    viewportHeight: Math.max(1, Math.round(window.innerHeight)),
  };
}

export function shouldCollectDetailedMetrics(device: DeviceMetadata, ratio: number): boolean {
  const lowEnd =
    (device.hardwareConcurrency !== null && device.hardwareConcurrency <= 4) ||
    (device.deviceMemoryGb !== null && device.deviceMemoryGb <= 4);
  if (lowEnd) return true;
  if (device.hardwareConcurrency === null && device.deviceMemoryGb === null) return ratio < 0.25;
  return ratio < 0.1;
}

class FrontendPerformanceCollector {
  private enabled = false;
  private detailed = false;
  private token = "";
  private endpoint = "";
  private route = "/unknown";
  private queue: QueuedMetric[] = [];
  private sessionId = "";
  private startedAt = "";
  private buildId = "development";
  private device: DeviceMetadata | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private observers: PerformanceObserver[] = [];
  private flushing = false;
  private lastInteractionAt: number | null = null;
  private cleanupListeners: Array<() => void> = [];

  public isEnabled() {
    return this.enabled;
  }

  public isDetailed() {
    return this.enabled && this.detailed;
  }

  public start(options: { token: string; endpoint: string; buildId: string; route: string }) {
    if (this.enabled) {
      this.token = options.token;
      this.route = normalizeTelemetryRoute(options.route);
      return;
    }

    this.enabled = true;
    this.token = options.token;
    this.endpoint = options.endpoint.replace(/\/$/, "");
    this.buildId = options.buildId.slice(0, 64) || "development";
    this.route = normalizeTelemetryRoute(options.route);
    this.sessionId = crypto.randomUUID();
    this.startedAt = new Date().toISOString();
    this.device = getDeviceMetadata();
    this.detailed = shouldCollectDetailedMetrics(this.device, randomRatio());

    this.installObservers();
    this.installGlobalListeners();
    this.captureNavigation();
    this.captureRuntimeSnapshot();
    this.interval = setInterval(() => {
      this.captureRuntimeSnapshot();
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  public stop() {
    if (!this.enabled) return;
    void this.flush();
    this.enabled = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.cleanupListeners.forEach((cleanup) => cleanup());
    this.cleanupListeners = [];
    this.queue = [];
  }

  public setRoute(route: string) {
    const normalized = normalizeTelemetryRoute(route);
    if (normalized === this.route) return;
    if (this.lastInteractionAt !== null) {
      const duration = performance.now() - this.lastInteractionAt;
      if (duration >= 0 && duration < 10_000) {
        this.record({ name: "route_change.duration", value: duration, unit: "ms" });
      }
    }
    this.route = normalized;
    this.lastInteractionAt = null;
  }

  public record(metric: FrontendMetricInput) {
    if (!this.enabled || !Number.isFinite(metric.value)) return;
    if (metric.detailed && !this.detailed) return;
    const tags = metric.tags
      ? { ...metric.tags, detailLevel: this.detailed ? ("detailed" as const) : ("light" as const) }
      : { detailLevel: this.detailed ? ("detailed" as const) : ("light" as const) };
    this.queue.push({
      name: metric.name.slice(0, 64),
      value: metric.value,
      unit: metric.unit,
      occurredAt: metric.occurredAt ?? new Date().toISOString(),
      route: normalizeTelemetryRoute(metric.route ?? this.route),
      tags,
    });
    if (this.queue.length > MAX_QUEUE_SAMPLES)
      this.queue.splice(0, this.queue.length - MAX_QUEUE_SAMPLES);
    if (this.queue.length >= MAX_BATCH_SAMPLES) void this.flush();
  }

  public markInteraction() {
    if (this.enabled) this.lastInteractionAt = performance.now();
  }

  public async flush() {
    if (!this.enabled || this.flushing || this.queue.length === 0 || !this.device) return;
    this.flushing = true;
    const metrics = this.takeBatch();
    const started = performance.now();
    try {
      await this.send(metrics, true);
    } finally {
      this.flushing = false;
      this.record({
        name: "telemetry.flush_duration",
        value: performance.now() - started,
        unit: "ms",
        detailed: true,
      });
    }
  }

  private takeBatch(): QueuedMetric[] {
    const batch: QueuedMetric[] = [];
    while (batch.length < MAX_BATCH_SAMPLES && this.queue.length > 0) {
      const candidate = this.queue.shift();
      if (!candidate) break;
      batch.push(candidate);
      if (JSON.stringify(batch).length > MAX_BATCH_BYTES) {
        batch.pop();
        this.queue.unshift(candidate);
        break;
      }
    }
    return batch;
  }

  private async send(metrics: QueuedMetric[], allowRetry: boolean): Promise<void> {
    if (metrics.length === 0 || !this.device) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.endpoint}/api/whatsapp/frontend-performance/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: this.token },
        body: JSON.stringify({
          schemaVersion: 1,
          sessionId: this.sessionId,
          buildId: this.buildId,
          startedAt: this.startedAt,
          device: this.device,
          metrics,
        }),
        keepalive: true,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`telemetry request failed with ${response.status}`);
    } catch {
      if (allowRetry && this.enabled) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        await this.send(metrics, false);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private installObservers() {
    if (!("PerformanceObserver" in window)) return;
    const supported = PerformanceObserver.supportedEntryTypes;
    if (supported.includes("longtask")) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.record({ name: "long_task.duration", value: entry.duration, unit: "ms" });
        }
      });
      observer.observe({ type: "longtask", buffered: true });
      this.observers.push(observer);
    }

    if (this.detailed && supported.includes("resource")) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
          const endpoint = normalizeTelemetryRoute(entry.name);
          const tags = { initiatorType: entry.initiatorType.slice(0, 32), endpoint };
          this.record({
            name: "resource.duration",
            value: entry.duration,
            unit: "ms",
            tags,
            detailed: true,
          });
          if (entry.transferSize > 0) {
            this.record({
              name: "resource.transfer_bytes",
              value: entry.transferSize,
              unit: "bytes",
              tags,
              detailed: true,
            });
          }
        }
      });
      observer.observe({ type: "resource", buffered: true });
      this.observers.push(observer);
    }
  }

  private installGlobalListeners() {
    const onInteraction = () => this.markInteraction();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void this.flush();
    };
    const onError = (event: ErrorEvent) => this.captureError(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => this.captureError(event.reason);
    document.addEventListener("pointerdown", onInteraction, { capture: true, passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    this.cleanupListeners.push(
      () => document.removeEventListener("pointerdown", onInteraction, { capture: true }),
      () => document.removeEventListener("visibilitychange", onVisibility),
      () => window.removeEventListener("error", onError),
      () => window.removeEventListener("unhandledrejection", onRejection),
    );
  }

  private captureError(value: unknown) {
    const error = value instanceof Error ? value : new Error(String(value ?? "Unknown error"));
    const message = sanitizeTelemetryError(error);
    const topFrame = sanitizeTelemetryError(error.stack?.split("\n")[1]?.trim() ?? "").slice(
      0,
      180,
    );
    this.record({
      name: "error.count",
      value: 1,
      unit: "count",
      tags: {
        errorName: error.name.slice(0, 96),
        errorMessage: message,
        errorFingerprint: telemetryErrorFingerprint(error.name, message, topFrame),
        topFrame,
      },
    });
  }

  private captureNavigation() {
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (!navigation) return;
    this.record({
      name: "navigation.duration",
      value: navigation.duration,
      unit: "ms",
      tags: { navigationType: navigation.type },
    });
  }

  private captureRuntimeSnapshot() {
    if (!this.detailed) return;
    this.record({
      name: "dom.nodes",
      value: document.getElementsByTagName("*").length,
      unit: "count",
      detailed: true,
    });
    const memory = (performance as PerformanceWithMemory).memory?.usedJSHeapSize;
    if (typeof memory === "number" && Number.isFinite(memory)) {
      this.record({ name: "memory.js_heap_bytes", value: memory, unit: "bytes", detailed: true });
    }
  }
}

export const frontendPerformanceCollector = new FrontendPerformanceCollector();

export function recordFrontendPerformanceMetric(metric: FrontendMetricInput) {
  frontendPerformanceCollector.record(metric);
}

export function measureFrontendInteraction<T>(interaction: string, callback: () => T): T {
  if (!frontendPerformanceCollector.isDetailed()) return callback();
  const started = performance.now();
  try {
    return callback();
  } finally {
    recordFrontendPerformanceMetric({
      name: `interaction.${interaction}`,
      value: performance.now() - started,
      unit: "ms",
      tags: { interaction },
      detailed: true,
    });
  }
}
