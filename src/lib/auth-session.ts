import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

export type AuthRequestConfig = InternalAxiosRequestConfig & {
  skipAuthInjection?: boolean;
  skipAuthRefresh?: boolean;
  authRefreshRetried?: boolean;
};

interface AuthSessionConfiguration {
  instance: string;
  refresh: () => Promise<string>;
  onInvalid: () => void;
}

const REFRESH_EARLY_MS = 60_000;

function tokenExpiresAt(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || "")) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function responseStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  if (error instanceof Error && axios.isAxiosError(error.cause)) return error.cause.response?.status;
  return undefined;
}

class AuthSessionCoordinator {
  private accessToken: string | null = null;
  private configuration: AuthSessionConfiguration | null = null;
  private refreshPromise: Promise<string> | null = null;
  private globalInterceptorsInstalled = false;

  public configure(configuration: AuthSessionConfiguration): void {
    this.configuration = configuration;
  }

  public clearConfiguration(): void {
    this.configuration = null;
    this.accessToken = null;
    this.refreshPromise = null;
  }

  public setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public expiresWithin(milliseconds: number): boolean {
    const expiresAt = tokenExpiresAt(this.accessToken);
    return expiresAt !== null && expiresAt - Date.now() <= milliseconds;
  }

  public async tokenForRequest(): Promise<string | null> {
    if (!this.accessToken || this.expiresWithin(REFRESH_EARLY_MS)) {
      if (!this.configuration) return this.accessToken;
      return this.refreshAccessToken();
    }
    return this.accessToken;
  }

  public async forceRefresh(): Promise<string> {
    return this.refreshAccessToken();
  }

  public install(instance: AxiosInstance): void {
    instance.interceptors.request.use(async (rawConfig) => {
      const config = rawConfig as AuthRequestConfig;
      if (config.skipAuthInjection) return config;
      const token = await this.tokenForRequest();
      if (token) config.headers.set("Authorization", `Bearer ${token}`);
      return config;
    });
  }

  public async retryUnauthorized<T>(error: AxiosError, instance: AxiosInstance): Promise<T> {
    const config = error.config as AuthRequestConfig | undefined;
    if (!config || config.skipAuthRefresh || config.authRefreshRetried || error.response?.status !== 401) {
      throw error;
    }

    config.authRefreshRetried = true;
    const token = await this.forceRefresh();
    config.headers.set("Authorization", `Bearer ${token}`);
    return instance.request(config) as Promise<T>;
  }

  public installGlobalAxios(): void {
    if (this.globalInterceptorsInstalled) return;
    this.globalInterceptorsInstalled = true;
    this.install(axios);
    axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.retryUnauthorized(error, axios),
    );
  }

  public async fetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const token = await this.tokenForRequest();
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(input, { ...init, headers });
    if (response.status !== 401) return response;

    const nextToken = await this.forceRefresh();
    headers.set("Authorization", `Bearer ${nextToken}`);
    return fetch(input, { ...init, headers });
  }

  public isDefinitiveRefreshFailure(error: unknown): boolean {
    const status = responseStatus(error);
    return status === 401 || status === 403;
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise;
    if (!this.configuration) throw new Error("authentication session is not configured");

    const execute = async () => {
      try {
        const token = await this.configuration!.refresh();
        this.accessToken = token;
        return token;
      } catch (error) {
        if (this.isDefinitiveRefreshFailure(error)) this.configuration?.onInvalid();
        throw error;
      }
    };

    const lockName = `inpulse-auth-refresh:${this.configuration.instance}`;
    this.refreshPromise = typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(lockName, execute)
      : execute();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }
}

export const authSession = new AuthSessionCoordinator();
export const authenticatedFetch = authSession.fetch.bind(authSession);

export function skipAuthInterceptors(): AxiosRequestConfig & {
  skipAuthInjection: true;
  skipAuthRefresh: true;
} {
  return { skipAuthInjection: true, skipAuthRefresh: true };
}
