"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = __importDefault(require("./api-client"));
/**
 * ReportsClient class to handle reports related API calls.
 *
 * This class extends the ApiClient class and provides methods to interact with the reports API.
 * It includes methods to get, generate, and delete chat reports.
 */
class ReportsClient extends api_client_1.default {
    /**
     * Retrieves chat reports from the server.
     *
     * @returns A promise that resolves to an array of chat reports wrapped in a `DataResponse` object.
     */
    async getChatsReports() {
        const url = `/api/reports/chats`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    /**
     * Generates a report for chat interactions based on the provided options.
     *
     * @param body - The options for generating the chats report, including filters and parameters.
     * @returns A promise that resolves to the data of the generated chats report.
     */
    async generateChatsReport(body) {
        const url = `/api/reports/chats`;
        const { data: res } = await this.ax.post(url, body);
        return res.data;
    }
    /**
     * Deletes a chat report by its unique identifier.
     *
     * @param chatsReportId - The unique identifier of the chat report to be deleted.
     */
    async deleteChatsReport(chatsReportId) {
        const url = `/api/reports/chats/${chatsReportId}`;
        await this.ax.delete(url);
    }
    /**
     * Desative a report sql by its unique identifier.
     *
     * @param reportId - The unique identifier of the chat report to be deleted.
     */
    async deleteHistoryReport(reportId) {
        const url = `/api/reports-history/${reportId}`;
        await this.ax.delete(url);
    }
    /**
 * Execute a report sql interactions based on the provided options.
 *
 * @param body - The options for execute the report sql.
 * @returns A promise that resolves to the data of the generated chats report.
 */
    async executeSqlReport(body) {
        const url = `/api/execute-report-sql`;
        const { data: res } = await this.ax.post(url, body);
        return res.data;
    }
    /**
 * Retrieves chat reports from the server.
 *
 * @returns A promise that resolves to an array of chat reports wrapped in a `DataResponse` object.
 */
    async getSqlReportsHistory() {
        const url = `/api/reports-history`;
        const { data: res } = await this.ax.get(url);
        return res.data;
    }
    /**
* Export a report sql interactions based on the provided options.
*
* @param body - The options for export the report sql.
* @returns A promise that resolves to the data of the generated chats report.
*/
    async exportReportSql(body) {
        const url = `/api/export-report-sql`;
        const response = await this.ax.post(url, body, {
            responseType: 'blob',
        });
        return response.data;
    }
    /**
     * Sets the authorization token for the HTTP client.
     *
     * @param token - The Bearer token to be used for authentication.
     *                This token will be included in the `Authorization` header
     *                of all HTTP requests made by the client.
     */
    setAuth(token) {
        this.ax.defaults.headers.common["Authorization"] =
            `Bearer ${token}`;
    }
}
exports.default = ReportsClient;
