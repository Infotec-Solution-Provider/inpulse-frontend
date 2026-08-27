import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

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
  errorFingerprint?: string;
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

interface PendingInteraction {
  generation: number;
  name: string;
  sessionId: string;
  startedAt: number;
  route: string;
  visibilitySequence: number;
  tags?: FrontendMetricTags;
}

interface TelemetryEnvelope {
  buildId: string;
  device: DeviceMetadata;
  endpoint: string;
  generation: number;
  sessionId: string;
  startedAt: string;
  token: string;
}

interface ResourceTelemetryAggregate {
  count: number;
  endpoint: string;
  initiatorType: string;
  route: string;
  totalDuration: number;
  totalTransferBytes: number;
}

interface LongTaskTelemetrySample {
  duration: number;
  route: string;
}

interface NavigatorWithDiagnostics extends Navigator {
  deviceMemory?: number;
  connection?: { effectiveType?: string };
}

interface PerformanceWithMemory extends Performance {
  memory?: { usedJSHeapSize?: number };
}

type TimedAxiosRequestConfig = InternalAxiosRequestConfig;

interface MeasuredFetchContext {
  endpoint: string;
  route: string;
  sessionId: string;
  startedAt: number;
  statusClass: string;
}

interface AxiosRequestContext {
  route: string;
  sessionId: string;
  startedAt: number;
}

const measuredFetchContexts = new WeakMap<Response, MeasuredFetchContext>();

const MAX_BATCH_SAMPLES = 50;
const MAX_BATCH_BYTES = 60 * 1024;
const MAX_QUEUE_SAMPLES = 150;
const FLUSH_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 2_000;
const INTERACTION_TIMEOUT_MS = 30_000;
const FRAME_SAMPLE_DURATION_MS = 1_000;
const JANK_FRAME_THRESHOLD_MS = 50;
const EVENT_LOOP_PROBE_DELAY_MS = 100;
const DOCUMENT_STARTUP_CAPTURE_MAX_DELAY_MS = 60_000;
const SESSION_ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1_000;
// Keep each 30-second diagnostic window below the single 50-sample transport
// budget, leaving room for interactions, API calls, renders and socket bursts.
const LONG_TASK_SAMPLE_LIMIT = 8;
const MAX_RESOURCE_AGGREGATES = 5;
const ESSENTIAL_METRIC_NAMES = new Set([
  "navigation.duration",
  "error.count",
  "web_vital.inp",
  "web_vital.lcp",
  "web_vital.cls",
  "web_vital.fcp",
  "web_vital.ttfb",
]);
const SAFE_ERROR_NAMES = new Set([
  "AbortError",
  "AggregateError",
  "AxiosError",
  "DOMException",
  "Error",
  "EvalError",
  "NetworkError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
]);
const SAFE_TELEMETRY_ROUTE_SEGMENTS = new Set([
  ":id",
  ":instance",
  ":value",
  "api",
  "audio",
  "ai",
  "ai-agents",
  "ai-settings",
  "ai-supervisor",
  "agents",
  "audience",
  "auth",
  "auth-batches",
  "beacon",
  "auto-response",
  "auto-response-rules",
  "browser-resource",
  "channels",
  "chat",
  "chats",
  "cities",
  "clients",
  "config",
  "copy",
  "css",
  "contact-requests",
  "contacts",
  "customer",
  "customers",
  "dashboard",
  "dashboards",
  "details",
  "execute-report-sql",
  "execute",
  "export",
  "export-report-sql",
  "fetch",
  "files",
  "filters",
  "finish",
  "flows",
  "full",
  "funnel",
  "generated",
  "geo",
  "goals-dashboard",
  "internal",
  "internal-groups",
  "iframe",
  "img",
  "instances",
  "items",
  "knowledge",
  "layout",
  "lead-origin-quality",
  "login",
  "link",
  "logs",
  "lost-reasons",
  "mailing-analysis",
  "marketing",
  "mass-messages",
  "messages",
  "metric-tables",
  "metrics",
  "monitor",
  "navigation",
  "new",
  "next",
  "notification-preferences",
  "notifications",
  "operator-performance",
  "operators",
  "other",
  "parameters",
  "preview",
  "public",
  "qr",
  "query",
  "read",
  "ready-messages",
  "regua-carteira-sintetico-whatsapp",
  "report-generator",
  "reports",
  "reports-history",
  "reset-qr",
  "restart",
  "retry",
  "sales",
  "save",
  "script",
  "sector",
  "sectors",
  "session",
  "session-monitor",
  "sessions",
  "sip-config",
  "states",
  "stream",
  "supervisor-chat",
  "team-goals",
  "templates",
  "tenant-config",
  "tools",
  "usage",
  "users",
  "video",
  "wallets",
  "whatsapp",
  "whatsapp-senders",
  "xmlhttprequest",
]);

function randomRatio(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return (values[0] ?? 0) / 0xffffffff;
}

export function normalizeTelemetryRoute(value: string, trustedInstance?: string): string {
  let path = value.split(/[?#]/, 1)[0] || "/unknown";
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    path = "/unknown";
  }

  const rawSegments = path.split("/").filter(Boolean).slice(0, 12);
  const isApiRoute = rawSegments[0]?.toLowerCase() === "api";
  const normalizedTrustedInstance = trustedInstance?.toLowerCase();
  const segments = rawSegments.map((segment, index) => {
    if (!isApiRoute && index === 0) return ":instance";
    let decodedSegment = segment;
    try {
      decodedSegment = decodeURIComponent(segment);
    } catch {
      // Invalid escapes are treated as an unknown value below.
    }
    if (
      normalizedTrustedInstance &&
      (segment.toLowerCase() === normalizedTrustedInstance ||
        decodedSegment.toLowerCase() === normalizedTrustedInstance)
    ) {
      return ":instance";
    }
    if (/^\d+$/.test(segment)) return ":id";
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return ":id";
    const normalized = segment
      .slice(0, 64)
      .replace(/[^a-zA-Z0-9_.:-]/g, "_")
      .toLowerCase();
    return SAFE_TELEMETRY_ROUTE_SEGMENTS.has(normalized) ? normalized : ":value";
  });

  return `/${segments.join("/")}`.slice(0, 255) || "/unknown";
}

function extractTelemetryInstance(value: string): string {
  let path = value.split(/[?#]/, 1)[0] || "";
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    return "";
  }
  const firstSegment = path.split("/").filter(Boolean)[0] ?? "";
  if (!firstSegment || firstSegment.toLowerCase() === "api") return "";
  try {
    return decodeURIComponent(firstSegment).slice(0, 64);
  } catch {
    return firstSegment.slice(0, 64);
  }
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

export function createTelemetryErrorTags(value: unknown): FrontendMetricTags {
  const error = value instanceof Error ? value : new Error(String(value ?? "Unknown error"));
  const topFrame = sanitizeTelemetryError(error.stack?.split("\n")[1]?.trim() ?? "").slice(0, 180);
  const errorName = SAFE_ERROR_NAMES.has(error.name) ? error.name : "Error";
  return {
    errorName,
    // Do not make the fingerprint depend on the exception message: even after
    // common redactions it can contain customer names or message fragments.
    errorFingerprint: telemetryErrorFingerprint(errorName, "", topFrame),
  };
}

export function normalizeTelemetryResourceEndpoint(
  value: string,
  initiatorType: string,
  trustedInstance?: string,
): string {
  const normalized = normalizeTelemetryRoute(value, trustedInstance);
  if (normalized.startsWith("/api/")) return normalized;
  const resourceType = initiatorType
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 32);
  return `/api/browser-resource/${resourceType || "other"}`;
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

export function normalizeTelemetryTotalPerMinute(total: number, windowMs: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(windowMs) || windowMs <= 0) return 0;
  return total * (60_000 / windowMs);
}

export function summarizeTelemetryFrames(frameCount: number, jankCount: number, elapsedMs: number) {
  const safeFrameCount = Math.max(0, frameCount);
  const elapsedSeconds = Math.max(elapsedMs / 1_000, 0.001);
  return {
    frameRate: safeFrameCount / elapsedSeconds,
    jankRatio: safeFrameCount > 0 ? Math.max(0, jankCount) / safeFrameCount : 0,
  };
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
  private pendingInteractions = new Map<string, PendingInteraction>();
  private scheduledInteractionCancellations = new Map<string, () => void>();
  private interactionSequence = 0;
  private longTaskTotalMs = 0;
  private longTaskSamples: LongTaskTelemetrySample[] = [];
  private longTaskSeenCount = 0;
  private longTaskRandomState = 0;
  private longTaskWindowStartedAt = 0;
  private sessionPerformanceStartedAt = 0;
  private droppedSamples = 0;
  private frameSampling = false;
  private frameAnimationId: number | null = null;
  private axiosRequestInterceptor: number | null = null;
  private axiosResponseInterceptor: number | null = null;
  private axiosRequestStarts = new WeakMap<object, AxiosRequestContext>();
  private visibilitySequence = 0;
  private reportedWebVitals = new Set<string>();
  private generation = 0;
  private activeAbortControllers = new Set<AbortController>();
  private resourceAggregates = new Map<string, ResourceTelemetryAggregate>();
  private trustedInstance = "";
  private lastRawRoute = "/unknown";
  private sessionStartedWallTime = 0;
  private documentMetricsClaimed = false;
  private documentMetricsOwnerSessionId = "";
  private flushHooks = new Set<() => void>();

  public isEnabled() {
    return this.enabled;
  }

  public isDetailed() {
    return this.enabled && this.detailed;
  }

  public getSessionId(): string | null {
    return this.enabled ? this.sessionId : null;
  }

  public getRoute(): string {
    return this.route;
  }

  public normalizeRoute(value: string): string {
    return normalizeTelemetryRoute(value, this.trustedInstance);
  }

  public isDocumentMetricsOwner(sessionId: string): boolean {
    return this.documentMetricsOwnerSessionId === sessionId;
  }

  public registerFlushHook(callback: () => void): () => void {
    this.flushHooks.add(callback);
    return () => this.flushHooks.delete(callback);
  }

  public start(options: { token: string; endpoint: string; buildId: string; route: string }) {
    if (this.enabled) {
      this.token = options.token;
      this.lastRawRoute = options.route;
      this.trustedInstance = extractTelemetryInstance(options.route) || this.trustedInstance;
      this.route = this.normalizeRoute(options.route);
      return;
    }

    this.generation += 1;
    this.enabled = true;
    this.token = options.token;
    this.endpoint = options.endpoint.replace(/\/$/, "");
    this.buildId = options.buildId.slice(0, 64) || "development";
    this.lastRawRoute = options.route;
    this.trustedInstance = extractTelemetryInstance(options.route);
    this.route = this.normalizeRoute(options.route);
    this.sessionId = crypto.randomUUID();
    this.startedAt = new Date().toISOString();
    this.sessionStartedWallTime = Date.now();
    this.device = getDeviceMetadata();
    this.detailed = shouldCollectDetailedMetrics(this.device, randomRatio());
    const sessionStartedAt = performance.now();
    if (!this.documentMetricsClaimed) {
      this.documentMetricsClaimed = true;
      if (sessionStartedAt <= DOCUMENT_STARTUP_CAPTURE_MAX_DELAY_MS) {
        this.documentMetricsOwnerSessionId = this.sessionId;
      }
    }
    this.sessionPerformanceStartedAt = this.isDocumentMetricsOwner(this.sessionId)
      ? 0
      : sessionStartedAt;
    this.longTaskWindowStartedAt = this.sessionPerformanceStartedAt;
    this.longTaskTotalMs = 0;
    this.longTaskSamples = [];
    this.longTaskSeenCount = 0;
    this.longTaskRandomState = Date.now() >>> 0;
    this.lastInteractionAt = null;

    this.installObservers();
    this.installGlobalListeners();
    this.installDefaultAxiosInstrumentation();
    if (this.isDocumentMetricsOwner(this.sessionId)) this.captureNavigation();
    this.interval = setInterval(() => {
      if (Date.now() - this.sessionStartedWallTime >= SESSION_ROTATION_INTERVAL_MS) {
        this.rotateSession();
        return;
      }
      this.runFlushHooks();
      this.captureRuntimeSnapshot();
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  public stop() {
    if (!this.enabled) return;
    this.runFlushHooks();
    this.drainObserverRecords();
    this.captureLongTaskWindow(true);
    this.captureResourceWindow();
    this.finalizePendingBatches();
    this.generation += 1;
    this.enabled = false;
    this.flushing = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.cleanupListeners.forEach((cleanup) => cleanup());
    this.cleanupListeners = [];
    if (this.frameAnimationId !== null) cancelAnimationFrame(this.frameAnimationId);
    this.frameAnimationId = null;
    this.frameSampling = false;
    this.pendingInteractions.clear();
    for (const cancel of this.scheduledInteractionCancellations.values()) cancel();
    this.scheduledInteractionCancellations.clear();
    this.reportedWebVitals.clear();
    this.axiosRequestStarts = new WeakMap<object, AxiosRequestContext>();
    this.longTaskTotalMs = 0;
    this.longTaskSamples = [];
    this.longTaskSeenCount = 0;
    this.lastInteractionAt = null;
    this.droppedSamples = 0;
    this.resourceAggregates.clear();
    if (this.axiosRequestInterceptor !== null) {
      axios.interceptors.request.eject(this.axiosRequestInterceptor);
      this.axiosRequestInterceptor = null;
    }
    if (this.axiosResponseInterceptor !== null) {
      axios.interceptors.response.eject(this.axiosResponseInterceptor);
      this.axiosResponseInterceptor = null;
    }
    this.queue = [];
  }

  public setRoute(route: string) {
    this.lastRawRoute = route;
    const normalized = this.normalizeRoute(route);
    if (normalized === this.route) return;
    this.runFlushHooks();
    this.drainObserverRecords();
    this.captureLongTaskWindow(true);
    this.captureResourceWindow();
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
    const metricName = metric.name.slice(0, 64);
    if (metricName.startsWith("web_vital.")) {
      if (this.reportedWebVitals.has(metricName)) return;
      this.reportedWebVitals.add(metricName);
    }
    const tags = metric.tags
      ? { ...metric.tags, detailLevel: this.detailed ? ("detailed" as const) : ("light" as const) }
      : { detailLevel: this.detailed ? ("detailed" as const) : ("light" as const) };
    const queuedMetric: QueuedMetric = {
      name: metricName,
      value: metric.value,
      unit: metric.unit,
      occurredAt: metric.occurredAt ?? new Date().toISOString(),
      route: this.normalizeRoute(metric.route ?? this.route),
      tags,
    };
    if (this.queue.length >= MAX_QUEUE_SAMPLES) {
      if (!ESSENTIAL_METRIC_NAMES.has(metricName)) {
        this.droppedSamples += 1;
        return;
      }
      // Essential metrics are rare; only they pay the bounded scan needed to
      // evict a diagnostic sample. Saturated hot paths stay O(1).
      const removableIndex = this.queue.findIndex(
        (queued) => !ESSENTIAL_METRIC_NAMES.has(queued.name),
      );
      if (removableIndex >= 0) {
        this.queue.splice(removableIndex, 1);
      } else {
        this.queue.shift();
      }
      this.droppedSamples += 1;
    }
    this.queue.push(queuedMetric);
  }

  public markInteraction() {
    if (this.enabled) this.lastInteractionAt = performance.now();
  }

  public startInteraction(interaction: string, tags?: FrontendMetricTags): string | null {
    if (!this.isDetailed()) return null;
    const normalizedName = interaction
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, "_")
      .slice(0, 48);
    if (!normalizedName) return null;

    this.prunePendingInteractions();
    const token = `${++this.interactionSequence}`;
    this.pendingInteractions.set(token, {
      generation: this.generation,
      name: normalizedName,
      sessionId: this.sessionId,
      startedAt: performance.now(),
      route: this.route,
      visibilitySequence: this.visibilitySequence,
      tags,
    });
    return token;
  }

  public completeInteractionAfterPaint(token: string | null, shouldRecord?: () => boolean) {
    if (!token) return;
    const pending = this.pendingInteractions.get(token);
    if (!pending) return;
    this.pendingInteractions.delete(token);

    if (document.visibilityState !== "visible" || typeof requestAnimationFrame !== "function") {
      return;
    }

    let completed = false;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;
    let fallback: number | null = null;
    const cancel = () => {
      if (completed) return;
      completed = true;
      if (fallback !== null) window.clearTimeout(fallback);
      if (firstFrame !== null) cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
      this.scheduledInteractionCancellations.delete(token);
    };
    const finish = () => {
      if (completed) return;
      completed = true;
      if (fallback !== null) window.clearTimeout(fallback);
      if (firstFrame !== null) cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
      this.scheduledInteractionCancellations.delete(token);
      if (
        !this.enabled ||
        pending.generation !== this.generation ||
        pending.sessionId !== this.sessionId ||
        document.visibilityState !== "visible" ||
        pending.visibilitySequence !== this.visibilitySequence
      ) {
        return;
      }
      if (shouldRecord) {
        try {
          if (!shouldRecord()) return;
        } catch {
          return;
        }
      }
      const duration = performance.now() - pending.startedAt;
      if (duration < 0 || duration > INTERACTION_TIMEOUT_MS) return;
      this.record({
        name: `interaction.${pending.name}`,
        value: duration,
        unit: "ms",
        route: pending.route,
        tags: { ...pending.tags, interaction: pending.name },
        detailed: true,
      });
    };
    fallback = window.setTimeout(cancel, INTERACTION_TIMEOUT_MS);
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(finish);
    });
    this.scheduledInteractionCancellations.set(token, cancel);
  }

  public cancelInteraction(token: string | null) {
    if (!token) return;
    const wasPending = this.pendingInteractions.delete(token);
    if (wasPending) return;
    this.scheduledInteractionCancellations.get(token)?.();
  }

  public async flush() {
    if (!this.enabled || this.flushing || this.queue.length === 0 || !this.device) return;
    const envelope: TelemetryEnvelope = {
      buildId: this.buildId,
      device: { ...this.device },
      endpoint: this.endpoint,
      generation: this.generation,
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      token: this.token,
    };
    this.flushing = true;
    const metrics = this.takeBatch();
    const batchId = crypto.randomUUID();
    const started = performance.now();
    try {
      await this.send(metrics, envelope, batchId, true);
    } finally {
      if (envelope.generation !== this.generation) return;
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
    if (this.droppedSamples > 0) {
      batch.push({
        name: "telemetry.dropped_samples",
        value: this.droppedSamples,
        unit: "count",
        occurredAt: new Date().toISOString(),
        route: this.route,
        tags: { detailLevel: this.detailed ? "detailed" : "light" },
      });
      this.droppedSamples = 0;
    }
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

  private async send(
    metrics: QueuedMetric[],
    envelope: TelemetryEnvelope,
    batchId: string,
    allowRetry: boolean,
    detached = false,
  ): Promise<void> {
    if (metrics.length === 0) return;
    const controller = new AbortController();
    this.activeAbortControllers.add(controller);
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(
        `${envelope.endpoint}/api/whatsapp/frontend-performance/batches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: envelope.token },
          body: JSON.stringify({
            schemaVersion: 1,
            batchId,
            sessionId: envelope.sessionId,
            buildId: envelope.buildId,
            startedAt: envelope.startedAt,
            device: envelope.device,
            metrics,
          }),
          keepalive: true,
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error(`telemetry request failed with ${response.status}`);
    } catch {
      if (
        allowRetry &&
        (detached || (this.enabled && envelope.generation === this.generation))
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        if (detached || (this.enabled && envelope.generation === this.generation)) {
          await this.send(metrics, envelope, batchId, false, detached);
        }
      }
    } finally {
      clearTimeout(timeout);
      this.activeAbortControllers.delete(controller);
    }
  }

  private finalizePendingBatches(unloading = false) {
    if ((this.queue.length === 0 && this.droppedSamples === 0) || !this.device) return;
    const envelope: TelemetryEnvelope = {
      buildId: this.buildId,
      device: { ...this.device },
      endpoint: this.endpoint,
      generation: this.generation,
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      token: this.token,
    };
    if (unloading) {
      if (this.queue.length > MAX_BATCH_SAMPLES - 1) {
        this.droppedSamples += this.queue.length - (MAX_BATCH_SAMPLES - 1);
        this.queue = this.queue.slice(0, MAX_BATCH_SAMPLES - 1);
      }
      const metrics = this.takeBatch();
      if (metrics.length > 0) {
        void this.send(metrics, envelope, crypto.randomUUID(), true, true);
      }
      return;
    }

    const batches: QueuedMetric[][] = [];
    while (this.queue.length > 0 || this.droppedSamples > 0) {
      const metrics = this.takeBatch();
      if (metrics.length === 0) break;
      batches.push(metrics);
    }
    void (async () => {
      for (const metrics of batches) {
        await this.send(metrics, envelope, crypto.randomUUID(), true, true);
      }
    })();
  }

  private installObservers() {
    if (!("PerformanceObserver" in window)) return;
    const generation = this.generation;
    const supported = PerformanceObserver.supportedEntryTypes;
    if (supported.includes("longtask")) {
      const observer = new PerformanceObserver((list) => {
        if (generation !== this.generation) return;
        this.processPerformanceEntries(list.getEntries());
      });
      observer.observe({ type: "longtask", buffered: true });
      this.observers.push(observer);
    }

    if (this.detailed && supported.includes("resource")) {
      const observer = new PerformanceObserver((list) => {
        if (generation !== this.generation) return;
        this.processPerformanceEntries(list.getEntries());
      });
      // Replaying every resource fetched before the feature flag was resolved
      // creates avoidable startup work. Navigation/Web Vitals already cover
      // that phase; resource diagnostics begin with the active session.
      observer.observe({ type: "resource" });
      this.observers.push(observer);
    }
  }

  private installGlobalListeners() {
    const onInteraction = () => this.markInteraction();
    const onKeyboardInteraction = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") this.markInteraction();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        this.visibilitySequence += 1;
        this.pendingInteractions.clear();
        for (const cancel of this.scheduledInteractionCancellations.values()) cancel();
        this.scheduledInteractionCancellations.clear();
        if (this.frameAnimationId !== null) cancelAnimationFrame(this.frameAnimationId);
        this.frameAnimationId = null;
        this.frameSampling = false;
        this.runFlushHooks();
        this.drainObserverRecords();
        this.captureLongTaskWindow(true);
        this.captureResourceWindow();
        void this.flush();
      }
    };
    const onPageHide = () => {
      this.runFlushHooks();
      this.drainObserverRecords();
      this.captureLongTaskWindow(true);
      this.captureResourceWindow();
      this.finalizePendingBatches(true);
    };
    const onError = (event: ErrorEvent) => this.captureError(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => this.captureError(event.reason);
    document.addEventListener("pointerdown", onInteraction, { capture: true, passive: true });
    document.addEventListener("keydown", onKeyboardInteraction, { capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    this.cleanupListeners.push(
      () => document.removeEventListener("pointerdown", onInteraction, { capture: true }),
      () => document.removeEventListener("keydown", onKeyboardInteraction, { capture: true }),
      () => document.removeEventListener("visibilitychange", onVisibility),
      () => window.removeEventListener("pagehide", onPageHide),
      () => window.removeEventListener("error", onError),
      () => window.removeEventListener("unhandledrejection", onRejection),
    );
  }

  private installDefaultAxiosInstrumentation() {
    if (!this.detailed || this.axiosRequestInterceptor !== null) return;
    this.axiosRequestInterceptor = axios.interceptors.request.use((config) => {
      const sessionId = this.getSessionId();
      if (sessionId) {
        this.axiosRequestStarts.set(config, {
          route: this.route,
          sessionId,
          startedAt: performance.now(),
        });
      }
      return config;
    });
    this.axiosResponseInterceptor = axios.interceptors.response.use(
      (response) => {
        this.recordAxiosRequest(
          response.config as TimedAxiosRequestConfig,
          response.status,
          response.headers,
        );
        return response;
      },
      (error: AxiosError) => {
        if (error.config) {
          this.recordAxiosRequest(
            error.config as TimedAxiosRequestConfig,
            error.response?.status,
            error.response?.headers,
            axios.isCancel(error) ? "cancelled" : undefined,
          );
        }
        return Promise.reject(error);
      },
    );
  }

  private recordAxiosRequest(
    config: TimedAxiosRequestConfig,
    status?: number,
    headers?: unknown,
    statusClassOverride?: string,
  ) {
    const context = this.axiosRequestStarts.get(config);
    if (!context) return;
    this.axiosRequestStarts.delete(config);
    if (context.sessionId !== this.getSessionId()) return;
    const tags = {
      endpoint: this.normalizeRoute(config.url || "/unknown"),
      statusClass:
        statusClassOverride || (status ? `${Math.floor(status / 100)}xx` : "network_error"),
      source: "axios_default",
    };
    this.record({
      name: "api.duration",
      value: performance.now() - context.startedAt,
      unit: "ms",
      route: context.route,
      tags,
      detailed: true,
    });

    const transferBytes = this.readContentLength(headers);
    if (transferBytes !== null) {
      this.record({
        name: "api.transfer_bytes",
        value: transferBytes,
        unit: "bytes",
        route: context.route,
        tags,
        detailed: true,
      });
    }
  }

  private readContentLength(headers: unknown): number | null {
    if (!headers || typeof headers !== "object") return null;
    const headerBag = headers as Record<string, unknown> & {
      get?: (name: string) => unknown;
    };
    const rawValue =
      typeof headerBag.get === "function"
        ? headerBag.get("content-length")
        : headerBag["content-length"];
    const value = Number(rawValue);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private captureError(value: unknown) {
    this.record({
      name: "error.count",
      value: 1,
      unit: "count",
      tags: createTelemetryErrorTags(value),
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
    if (navigation.responseStart > 0) {
      this.record({ name: "web_vital.ttfb", value: navigation.responseStart, unit: "ms" });
    }
    const firstContentfulPaint = performance.getEntriesByName("first-contentful-paint")[0];
    if (firstContentfulPaint) {
      this.record({ name: "web_vital.fcp", value: firstContentfulPaint.startTime, unit: "ms" });
    }
  }

  private captureRuntimeSnapshot(captureWindows = true) {
    if (captureWindows) {
      this.captureLongTaskWindow();
      this.captureResourceWindow();
    }
    if (!this.detailed) return;
    this.captureEventLoopLag();
    this.captureFrameSample();
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

  private captureLongTaskWindow(force = false) {
    const now = performance.now();
    const elapsed = now - this.longTaskWindowStartedAt;
    if (elapsed < 1_000 && !force) return;
    if (this.longTaskSeenCount === 0 && this.longTaskTotalMs === 0 && force) {
      this.longTaskWindowStartedAt = now;
      return;
    }
    for (const sample of this.longTaskSamples) {
      this.record({
        name: "long_task.duration",
        value: sample.duration,
        unit: "ms",
        route: sample.route,
        tags: { source: "window_reservoir" },
      });
    }
    const normalizedPerMinute = normalizeTelemetryTotalPerMinute(
      this.longTaskTotalMs,
      Math.max(elapsed, 1_000),
    );
    this.record({
      name: "long_task.total",
      value: normalizedPerMinute,
      unit: "ms",
      tags: { source: "normalized_per_minute" },
    });
    this.longTaskTotalMs = 0;
    this.longTaskSamples = [];
    this.longTaskSeenCount = 0;
    this.longTaskWindowStartedAt = now;
  }

  private sampleLongTask(duration: number, route: string) {
    this.longTaskSeenCount += 1;
    if (this.longTaskSamples.length < LONG_TASK_SAMPLE_LIMIT) {
      this.longTaskSamples.push({ duration, route });
      return;
    }
    this.longTaskRandomState =
      (Math.imul(this.longTaskRandomState, 1_664_525) + 1_013_904_223) >>> 0;
    const candidateIndex = this.longTaskRandomState % this.longTaskSeenCount;
    if (candidateIndex < LONG_TASK_SAMPLE_LIMIT) {
      this.longTaskSamples[candidateIndex] = { duration, route };
    }
  }

  private aggregateResourceTiming(endpoint: string, entry: PerformanceResourceTiming) {
    const initiatorType = entry.initiatorType
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .slice(0, 32) || "other";
    let key = `${this.route}\u0000${endpoint}\u0000${initiatorType}`;
    if (!this.resourceAggregates.has(key) && this.resourceAggregates.size >= MAX_RESOURCE_AGGREGATES) {
      key = `${this.route}\u0000/api/browser-resource/other\u0000other`;
    }
    const [route = "/unknown", aggregateEndpoint = "/api/browser-resource/other", aggregateInitiator = "other"] = key.split("\u0000");
    const aggregate = this.resourceAggregates.get(key) ?? {
      count: 0,
      endpoint: aggregateEndpoint,
      initiatorType: aggregateInitiator,
      route,
      totalDuration: 0,
      totalTransferBytes: 0,
    };
    aggregate.count += 1;
    aggregate.totalDuration += entry.duration;
    if (entry.transferSize > 0) aggregate.totalTransferBytes += entry.transferSize;
    this.resourceAggregates.set(key, aggregate);
  }

  private captureResourceWindow() {
    for (const aggregate of this.resourceAggregates.values()) {
      const tags = {
        initiatorType: aggregate.initiatorType,
        endpoint: aggregate.endpoint,
      };
      this.record({
        name: "resource.count",
        value: aggregate.count,
        unit: "count",
        route: aggregate.route,
        tags: { ...tags, source: "30s_window" },
        detailed: true,
      });
      this.record({
        name: "resource.duration",
        value: aggregate.totalDuration / aggregate.count,
        unit: "ms",
        route: aggregate.route,
        tags: { ...tags, source: "30s_window_average" },
        detailed: true,
      });
      if (aggregate.totalTransferBytes > 0) {
        this.record({
          name: "resource.transfer_bytes",
          value: aggregate.totalTransferBytes,
          unit: "bytes",
          route: aggregate.route,
          tags: { ...tags, source: "30s_window_total" },
          detailed: true,
        });
      }
    }
    this.resourceAggregates.clear();
  }

  private processPerformanceEntries(entries: PerformanceEntry[]) {
    for (const entry of entries) {
      if (entry.startTime < this.sessionPerformanceStartedAt) continue;
      if (entry.entryType === "longtask") {
        this.longTaskTotalMs += entry.duration;
        this.sampleLongTask(entry.duration, this.route);
        continue;
      }
      if (entry.entryType !== "resource" || !this.detailed) continue;
      const resource = entry as PerformanceResourceTiming;
      const endpoint = normalizeTelemetryResourceEndpoint(
        resource.name,
        resource.initiatorType,
        this.trustedInstance,
      );
      if (endpoint === "/api/whatsapp/frontend-performance/batches") continue;
      this.aggregateResourceTiming(endpoint, resource);
    }
  }

  private drainObserverRecords() {
    for (const observer of this.observers) {
      this.processPerformanceEntries(observer.takeRecords());
    }
  }

  private runFlushHooks() {
    for (const callback of this.flushHooks) {
      try {
        callback();
      } catch {
        // Diagnostics must never interrupt the application or another metric.
      }
    }
  }

  private rotateSession() {
    if (!this.enabled) return;
    const options = {
      token: this.token,
      endpoint: this.endpoint,
      buildId: this.buildId,
      route: this.lastRawRoute,
    };
    this.stop();
    this.start(options);
  }

  private captureEventLoopLag() {
    const generation = this.generation;
    const expectedAt = performance.now() + EVENT_LOOP_PROBE_DELAY_MS;
    window.setTimeout(() => {
      if (!this.isDetailed() || generation !== this.generation) return;
      this.record({
        name: "runtime.event_loop_lag",
        value: Math.max(0, performance.now() - expectedAt),
        unit: "ms",
        detailed: true,
      });
    }, EVENT_LOOP_PROBE_DELAY_MS);
  }

  private captureFrameSample() {
    if (
      this.frameSampling ||
      document.visibilityState !== "visible" ||
      typeof requestAnimationFrame !== "function"
    ) {
      return;
    }

    this.frameSampling = true;
    const generation = this.generation;
    const startedAt = performance.now();
    let previousFrameAt: number | null = null;
    let frameCount = 0;
    let jankCount = 0;

    const finish = (finishedAt: number) => {
      if (generation !== this.generation) return;
      this.frameSampling = false;
      this.frameAnimationId = null;
      if (!this.isDetailed() || frameCount === 0) return;
      const frameMetrics = summarizeTelemetryFrames(frameCount, jankCount, finishedAt - startedAt);
      this.record({
        name: "runtime.frame_rate",
        value: frameMetrics.frameRate,
        unit: "count",
        tags: { source: "frames_per_second" },
        detailed: true,
      });
      this.record({
        name: "runtime.frame_jank",
        value: frameMetrics.jankRatio,
        unit: "ratio",
        detailed: true,
      });
    };

    const sample = (timestamp: number) => {
      if (generation !== this.generation) return;
      if (!this.isDetailed() || document.visibilityState !== "visible") {
        finish(timestamp);
        return;
      }
      if (previousFrameAt !== null) {
        frameCount += 1;
        if (timestamp - previousFrameAt > JANK_FRAME_THRESHOLD_MS) jankCount += 1;
      }
      previousFrameAt = timestamp;
      if (timestamp - startedAt >= FRAME_SAMPLE_DURATION_MS) {
        finish(timestamp);
        return;
      }
      this.frameAnimationId = requestAnimationFrame(sample);
    };

    this.frameAnimationId = requestAnimationFrame(sample);
  }

  private prunePendingInteractions() {
    const cutoff = performance.now() - INTERACTION_TIMEOUT_MS;
    for (const [token, interaction] of this.pendingInteractions) {
      if (interaction.startedAt < cutoff) this.pendingInteractions.delete(token);
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

export function startFrontendInteraction(
  interaction: string,
  tags?: FrontendMetricTags,
): string | null {
  return frontendPerformanceCollector.startInteraction(interaction, tags);
}

export function completeFrontendInteractionAfterPaint(
  token: string | null,
  shouldRecord?: () => boolean,
) {
  frontendPerformanceCollector.completeInteractionAfterPaint(token, shouldRecord);
}

export function cancelFrontendInteraction(token: string | null) {
  frontendPerformanceCollector.cancelInteraction(token);
}

export async function measuredFrontendFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!frontendPerformanceCollector.isDetailed()) return fetch(input, init);

  const sessionId = frontendPerformanceCollector.getSessionId();
  if (!sessionId) return fetch(input, init);
  const rawEndpoint = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const endpoint = frontendPerformanceCollector.normalizeRoute(rawEndpoint);
  const route = frontendPerformanceCollector.getRoute();
  const startedAt = performance.now();
  try {
    const response = await fetch(input, init);
    if (frontendPerformanceCollector.getSessionId() !== sessionId) return response;
    const tags = {
      endpoint,
      statusClass: response.status ? `${Math.floor(response.status / 100)}xx` : "network_error",
      source: "fetch",
    };
    measuredFetchContexts.set(response, {
      endpoint,
      route,
      sessionId,
      startedAt,
      statusClass: tags.statusClass,
    });
    recordFrontendPerformanceMetric({
      name: "api.ttfb",
      value: performance.now() - startedAt,
      unit: "ms",
      route,
      tags,
      detailed: true,
    });
    const transferBytes = Number(response.headers.get("content-length"));
    if (Number.isFinite(transferBytes) && transferBytes > 0) {
      recordFrontendPerformanceMetric({
        name: "api.transfer_bytes",
        value: transferBytes,
        unit: "bytes",
        route,
        tags,
        detailed: true,
      });
    }
    return response;
  } catch (error) {
    if (frontendPerformanceCollector.getSessionId() === sessionId) {
      recordFrontendPerformanceMetric({
        name: "api.duration",
        value: performance.now() - startedAt,
        unit: "ms",
        route,
        tags: {
          endpoint,
          statusClass:
            error instanceof DOMException && error.name === "AbortError"
              ? "cancelled"
              : "network_error",
          source: "fetch",
        },
        detailed: true,
      });
    }
    throw error;
  }
}

export function completeMeasuredFrontendFetch(
  response: Response,
  statusClassOverride?: "cancelled" | "network_error",
) {
  const context = measuredFetchContexts.get(response);
  if (!context) return;
  measuredFetchContexts.delete(response);
  if (frontendPerformanceCollector.getSessionId() !== context.sessionId) return;
  recordFrontendPerformanceMetric({
    name: "api.duration",
    value: performance.now() - context.startedAt,
    unit: "ms",
    route: context.route,
    tags: {
      endpoint: context.endpoint,
      statusClass: statusClassOverride ?? context.statusClass,
      source: "fetch",
    },
    detailed: true,
  });
}
