import { AxiosInstance, AxiosError } from "axios";
import { ErrorResponse } from "./types/response.types";
export default class ApiClient {
    readonly ax: AxiosInstance;
    private baseUrl;
    constructor(baseUrl: string);
    private initializeResponseInterceptor;
    protected handleError: (error: AxiosError<ErrorResponse>) => Promise<never>;
}
