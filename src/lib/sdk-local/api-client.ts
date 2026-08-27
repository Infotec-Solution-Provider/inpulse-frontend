import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { ErrorResponse } from "./types/response.types";
import {
  frontendPerformanceCollector,
  recordFrontendPerformanceMetric,
} from "@/lib/performance/frontend-performance";

type TimedRequestConfig = InternalAxiosRequestConfig & {
  frontendPerformanceRoute?: string;
  frontendPerformanceSessionId?: string;
  frontendPerformanceStartedAt?: number;
};

export default class ApiClient {
  public static readonly DEFAULT_TIMEOUT_MS = 60_000;
  public static readonly UPLOAD_TIMEOUT_MS = 300_000;

  public readonly ax: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;

    this.ax = axios.create({
      baseURL: `${this.baseUrl}`,
      timeout: ApiClient.DEFAULT_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.initializeResponseInterceptor();
  }

  private initializeResponseInterceptor() {
    this.ax.interceptors.request.use((config) => {
      if (
        typeof performance !== "undefined" &&
        frontendPerformanceCollector.isDetailed()
      ) {
        const timedConfig = config as TimedRequestConfig;
        const sessionId = frontendPerformanceCollector.getSessionId();
        if (sessionId) {
          timedConfig.frontendPerformanceSessionId = sessionId;
          timedConfig.frontendPerformanceStartedAt = performance.now();
          timedConfig.frontendPerformanceRoute = frontendPerformanceCollector.getRoute();
        }
      }
      return config;
    });
    this.ax.interceptors.response.use(
      (response) => {
        this.recordRequestDuration(
          response.config as TimedRequestConfig,
          response.status,
          this.readContentLength(response.headers),
        );
        return response;
      },
      (error: AxiosError<ErrorResponse>) => {
        if (error.config)
          this.recordRequestDuration(
            error.config as TimedRequestConfig,
            error.response?.status,
            this.readContentLength(error.response?.headers),
            axios.isCancel(error) ? "cancelled" : undefined,
          );
        return this.handleError(error);
      },
    );
  }

  private recordRequestDuration(
    config: TimedRequestConfig,
    status?: number,
    transferBytes?: number,
    statusClassOverride?: string,
  ) {
    const startedAt = config.frontendPerformanceStartedAt;
    if (
      typeof startedAt !== "number" ||
      typeof performance === "undefined" ||
      !config.frontendPerformanceSessionId ||
      config.frontendPerformanceSessionId !== frontendPerformanceCollector.getSessionId()
    ) {
      return;
    }
    const tags = {
      endpoint: frontendPerformanceCollector.normalizeRoute(config.url || "/unknown"),
      statusClass:
        statusClassOverride || (status ? `${Math.floor(status / 100)}xx` : "network_error"),
      source: "axios_instance",
    };
    recordFrontendPerformanceMetric({
      name: "api.duration",
      value: performance.now() - startedAt,
      unit: "ms",
      route: config.frontendPerformanceRoute,
      tags,
      detailed: true,
    });
    if (transferBytes && transferBytes > 0) {
      recordFrontendPerformanceMetric({
        name: "api.transfer_bytes",
        value: transferBytes,
        unit: "bytes",
        route: config.frontendPerformanceRoute,
        tags,
        detailed: true,
      });
    }
  }

  private readContentLength(headers: unknown): number | undefined {
    if (!headers || typeof headers !== "object") return undefined;
    const headerBag = headers as Record<string, unknown> & {
      get?: (name: string) => unknown;
    };
    const rawValue =
      typeof headerBag.get === "function"
        ? headerBag.get("content-length")
        : headerBag["content-length"];
    const value = Number(rawValue);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  protected handleError = (error: AxiosError<ErrorResponse>): Promise<never> => {
    const errorMessage = error.response?.data?.message || error.message;
    return Promise.reject(new Error(errorMessage, { cause: error }));
  };
}
