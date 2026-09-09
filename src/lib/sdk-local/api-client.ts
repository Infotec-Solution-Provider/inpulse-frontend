import axios, { AxiosInstance, AxiosError } from "axios";
import { ErrorResponse } from "./types/response.types";
import { AuthRequestConfig, authSession } from "@/lib/auth-session";

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

    authSession.install(this.ax);
    this.initializeResponseInterceptor();
  }

  private initializeResponseInterceptor() {
    this.ax.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ErrorResponse>) => {
        const config = error.config as AuthRequestConfig | undefined;
        if (error.response?.status === 401 && !config?.skipAuthRefresh && !config?.authRefreshRetried) {
          try {
            return await authSession.retryUnauthorized(error, this.ax);
          } catch (refreshError) {
            if (axios.isAxiosError(refreshError)) return this.handleError(refreshError as AxiosError<ErrorResponse>);
            return Promise.reject(refreshError);
          }
        }
        return this.handleError(error);
      },
    );
  }

  protected handleError = (error: AxiosError<ErrorResponse>): Promise<never> => {
    const errorMessage = error.response?.data?.message || error.message;
    return Promise.reject(new Error(errorMessage, { cause: error }));
  };
}
