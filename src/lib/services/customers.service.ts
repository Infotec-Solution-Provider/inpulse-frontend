import { CustomersClient } from "@in.pulse-crm/sdk";

const NEXT_PUBLIC_CUSTOMERS_URL = process.env.NEXT_PUBLIC_CUSTOMERS_URL || "http://localhost:8002";

export interface CustomerCampaignOption {
	CODIGO: number;
	NOME: string | null;
}

interface FinishTelephonySchedulePayload {
	resultId: number;
	scheduleDate?: string;
	startedAt?: string;
	finishedAt?: string;
	dialedPhone?: string;
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

	public async getCampaigns() {
		const response = await this.ax.get<{
			message: string;
			data: CustomerCampaignOption[];
		}>(`/api/customers/campaigns`);

		return response.data.data;
	}
}

const customersService = new FrontendCustomersService(NEXT_PUBLIC_CUSTOMERS_URL);

export default customersService;
