import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { ErrorResponse } from "./types/response.types";
import {
  normalizeTelemetryRoute,
  recordFrontendPerformanceMetric,
} from "@/lib/performance/frontend-performance";

type TimedRequestConfig = InternalAxiosRequestConfig & {
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
      if (typeof performance !== "undefined") {
        (config as TimedRequestConfig).frontendPerformanceStartedAt = performance.now();
      }
      return config;
    });
    this.ax.interceptors.response.use(
      (response) => {
        this.recordRequestDuration(response.config as TimedRequestConfig, response.status);
        return response;
      },
      (error: AxiosError<ErrorResponse>) => {
        if (error.config)
          this.recordRequestDuration(error.config as TimedRequestConfig, error.response?.status);
        return this.handleError(error);
      },
    );
  }

  private recordRequestDuration(config: TimedRequestConfig, status?: number) {
    const startedAt = config.frontendPerformanceStartedAt;
    if (typeof startedAt !== "number" || typeof performance === "undefined") return;
    recordFrontendPerformanceMetric({
      name: "api.duration",
      value: performance.now() - startedAt,
      unit: "ms",
      tags: {
        endpoint: normalizeTelemetryRoute(config.url || "/unknown"),
        statusClass: status ? `${Math.floor(status / 100)}xx` : "network_error",
      },
      detailed: true,
    });
  }

  protected handleError = (error: AxiosError<ErrorResponse>): Promise<never> => {
    const errorMessage = error.response?.data?.message || error.message;
    return Promise.reject(new Error(errorMessage, { cause: error }));
  };
}
