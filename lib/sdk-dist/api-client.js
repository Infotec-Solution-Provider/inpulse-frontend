"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class ApiClient {
    ax;
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.ax = axios_1.default.create({
            baseURL: `${this.baseUrl}`,
            timeout: 60000,
            headers: {
                "Content-Type": "application/json",
            },
        });
        this.initializeResponseInterceptor();
    }
    initializeResponseInterceptor() {
        this.ax.interceptors.response.use(null, this.handleError);
    }
    handleError = (error) => {
        const errorMessage = error.response?.data?.message || error.message;
        return Promise.reject(new Error(errorMessage, { cause: error }));
    };
}
exports.default = ApiClient;
