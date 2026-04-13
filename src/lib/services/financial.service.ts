import axios from "axios";

const MARKETING_URL = process.env["NEXT_PUBLIC_MARKETING_URL"] || "http://localhost:8007";
const BASE = `${MARKETING_URL}/api/marketing/financial`;

function authHeader(token: string) {
	return { headers: { authorization: token } };
}

export interface FinancialSummary {
	totalCompras: number;
	totalFaturamento: number;
	ticketMedio: number;
}

export interface FinancialByOperator {
	operadorId: number | null;
	operadorNome: string | null;
	totalCompras: number;
	totalFaturamento: number;
	ticketMedio: number;
	propostasConvertidas: number;
}

export interface FinancialByPeriod {
	periodo: string;
	totalCompras: number;
	totalFaturamento: number;
}

export interface FinancialByTipo {
	tipo: string | null;
	totalCompras: number;
	totalFaturamento: number;
}

export interface FinancialByFormaPgto {
	formaPgto: string | null;
	totalCompras: number;
	totalFaturamento: number;
}

export interface FinancialByPeriodByOperator {
	periodo: string;
	operadorId: number | null;
	operadorNome: string | null;
	totalVendas: number;
	totalFaturamento: number;
}

export interface OperatorSaleDetail {
	codigo: number;
	data: string;
	valor: number;
	clienteId: number | null;
	clienteNome: string | null;
	tipo: string | null;
	formaPgto: string | null;
	situacao: string | null;
}

export interface FinancialPropostas {
	comprasDePropostas: number;
	faturamentoDePropostas: number;
	taxaConversao: number;
}

export interface FinancialGeneralGoal {
	id: number;
	instance: string;
	year: number;
	month: number;
	targetRevenue: number | null;
	targetSalesCount: number | null;
	targetAvgTicket: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface FinancialOperatorGoal {
	id: number;
	instance: string;
	year: number;
	month: number;
	operadorId: number;
	targetRevenue: number | null;
	targetSalesCount: number | null;
	targetAvgTicket: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface DashboardData {
	summary: FinancialSummary;
	byOperator: FinancialByOperator[];
	byPeriod: FinancialByPeriod[];
	byTipo: FinancialByTipo[];
	byFormaPgto: FinancialByFormaPgto[];
	propostas: FinancialPropostas;
	byPeriodByOperator: FinancialByPeriodByOperator[];
	meta: {
		general: FinancialGeneralGoal[];
		operators: FinancialOperatorGoal[];
	};
	comparison?: FinancialSummary;
}

export interface GoalsForMonth {
	general: FinancialGeneralGoal | null;
	operators: FinancialOperatorGoal[];
}

export interface GoalTarget {
	targetRevenue?: number | null;
	targetSalesCount?: number | null;
	targetAvgTicket?: number | null;
}

class FinancialService {
	async getDashboard(
		token: string,
		params: {
			startDate: string;
			endDate: string;
			operadorId?: number;
			groupBy?: "day" | "month";
			situacao?: string;
			compareStartDate?: string;
			compareEndDate?: string;
		},
	): Promise<DashboardData> {
		const response = await axios.get<{ message: string; data: DashboardData }>(
			`${BASE}/dashboard`,
			{ ...authHeader(token), params },
		);
		return response.data.data;
	}

	async getGoals(token: string, year: number, month: number): Promise<GoalsForMonth> {
		const response = await axios.get<{ message: string; data: GoalsForMonth }>(
			`${BASE}/goals`,
			{ ...authHeader(token), params: { year, month } },
		);
		return response.data.data;
	}

	async upsertGeneralGoal(
		token: string,
		body: { year: number; month: number } & GoalTarget,
	): Promise<FinancialGeneralGoal> {
		const response = await axios.put<{ message: string; data: FinancialGeneralGoal }>(
			`${BASE}/goals/general`,
			body,
			authHeader(token),
		);
		return response.data.data;
	}

	async deleteGeneralGoal(token: string, id: number): Promise<void> {
		await axios.delete(`${BASE}/goals/general/${id}`, authHeader(token));
	}

	async upsertOperatorGoal(
		token: string,
		body: { year: number; month: number; operadorId: number } & GoalTarget,
	): Promise<FinancialOperatorGoal> {
		const response = await axios.put<{ message: string; data: FinancialOperatorGoal }>(
			`${BASE}/goals/operator`,
			body,
			authHeader(token),
		);
		return response.data.data;
	}

	async deleteOperatorGoal(token: string, id: number): Promise<void> {
		await axios.delete(`${BASE}/goals/operator/${id}`, authHeader(token));
	}

	async getOperatorSales(
		token: string,
		params: { startDate: string; endDate: string; operadorId?: number | null; situacao?: string },
	): Promise<OperatorSaleDetail[]> {
		const { operadorId, ...rest } = params;
		const queryParams = operadorId !== null && operadorId !== undefined
			? { ...rest, operadorId }
			: rest;
		const response = await axios.get<{ message: string; data: OperatorSaleDetail[] }>(
			`${BASE}/operator-sales`,
			{ ...authHeader(token), params: queryParams },
		);
		return response.data.data;
	}
}

export default new FinancialService();
