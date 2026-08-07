import ApiClient from "./api-client";
import { ChatsReport, ExecuteSqlReportOptions, ExportSqlReportOptions, GenerateChatsReportOptions, SQLReportRow } from "./types/reports.types";
/**
 * ReportsClient class to handle reports related API calls.
 *
 * This class extends the ApiClient class and provides methods to interact with the reports API.
 * It includes methods to get, generate, and delete chat reports.
 */
export default class ReportsClient extends ApiClient {
    /**
     * Retrieves chat reports from the server.
     *
     * @returns A promise that resolves to an array of chat reports wrapped in a `DataResponse` object.
     */
    getChatsReports(): Promise<ChatsReport[]>;
    /**
     * Generates a report for chat interactions based on the provided options.
     *
     * @param body - The options for generating the chats report, including filters and parameters.
     * @returns A promise that resolves to the data of the generated chats report.
     */
    generateChatsReport(body: GenerateChatsReportOptions): Promise<ChatsReport>;
    /**
     * Deletes a chat report by its unique identifier.
     *
     * @param chatsReportId - The unique identifier of the chat report to be deleted.
     */
    deleteChatsReport(chatsReportId: number): Promise<void>;
    /**
     * Desative a report sql by its unique identifier.
     *
     * @param reportId - The unique identifier of the chat report to be deleted.
     */
    deleteHistoryReport(reportId: number): Promise<void>;
    /**
 * Execute a report sql interactions based on the provided options.
 *
 * @param body - The options for execute the report sql.
 * @returns A promise that resolves to the data of the generated chats report.
 */
    executeSqlReport(body: ExecuteSqlReportOptions): Promise<SQLReportRow[]>;
    /**
 * Retrieves chat reports from the server.
 *
 * @returns A promise that resolves to an array of chat reports wrapped in a `DataResponse` object.
 */
    getSqlReportsHistory(): Promise<any[]>;
    /**
* Export a report sql interactions based on the provided options.
*
* @param body - The options for export the report sql.
* @returns A promise that resolves to the data of the generated chats report.
*/
    exportReportSql(body: ExportSqlReportOptions): Promise<Blob>;
    /**
     * Sets the authorization token for the HTTP client.
     *
     * @param token - The Bearer token to be used for authentication.
     *                This token will be included in the `Authorization` header
     *                of all HTTP requests made by the client.
     */
    setAuth(token: string): void;
}
