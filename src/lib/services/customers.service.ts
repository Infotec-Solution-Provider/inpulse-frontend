import { CustomersClient } from "@in.pulse-crm/sdk";

import type { CustomerLookupOption } from "@/lib/types/sdk-local.types";

const NEXT_PUBLIC_CUSTOMERS_URL = process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002";

interface FinishTelephonySchedulePayload {
	resultId: number;
	scheduleDate?: string;
	startedAt?: string;
	finishedAt?: string;
	dialedPhone?: string;
}

interface StartTelephonyScheduleCallPayload {
	dialedPhone?: string;
}

interface TelephonyScheduleCallStatus {
	callId: string | null;
	scheduleId: number;
	state: "idle" | "dialing" | "answered" | "failed" | "ended";
	startedAt: string | null;
	endedAt: string | null;
	dialedPhone: string | null;
	errorReason: string | null;
}

class FrontendCustomersService extends CustomersClient {
	public async finishTelephonySchedule(
		scheduleId: number,
		data: FinishTelephonySchedulePayload,
	) {
		const response = await this.ax.patch(
			`/api/customers/schedules/telephony/${scheduleId}/finish`,
			data,
		);

		return response.data;
	}

	public async startTelephonyScheduleCall(
		scheduleId: number,
		data: StartTelephonyScheduleCallPayload,
	) {
		const response = await this.ax.post<{
			message: string;
			data: TelephonyScheduleCallStatus;
		}>(`/api/customers/schedules/telephony/${scheduleId}/call/start`, data);

		return response.data.data;
	}

	public async getTelephonyScheduleCallStatus(scheduleId: number) {
		const response = await this.ax.get<{
			message: string;
			data: TelephonyScheduleCallStatus;
		}>(`/api/customers/schedules/telephony/${scheduleId}/call`);

		return response.data.data;
	}

	public async getCampaigns() {
		const response = await this.ax.get<{
			message: string;
			data: CustomerLookupOption[];
		}>(`/api/customers/campaigns`);

		return response.data.data;
	}

	public async getSegments() {
		const response = await this.ax.get<{
			message: string;
			data: CustomerLookupOption[];
		}>(`/api/customers/segments`);

		return response.data.data;
	}

	public async getOperators() {
		const response = await this.ax.get<{
			message: string;
			data: CustomerLookupOption[];
		}>(`/api/customers/operators`);

		return response.data.data;
	}
}

const customersService = new FrontendCustomersService(NEXT_PUBLIC_CUSTOMERS_URL);

export default customersService;
