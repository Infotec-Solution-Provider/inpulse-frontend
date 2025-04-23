import { ReportsClient } from "@in.pulse-crm/sdk";

const REPORTS_URL = process.env["NEXT_PUBLIC_REPORTS_URL"] || "http://localhost:8006";

const reportsService = new ReportsClient(REPORTS_URL);

export default reportsService;
