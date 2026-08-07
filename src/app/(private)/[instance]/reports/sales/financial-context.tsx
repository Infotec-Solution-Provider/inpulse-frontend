"use client";

import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { AuthContext } from "@/app/auth-context";
import financialService, { DashboardData } from "@/lib/services/financial.service";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";

function toDateString(d: Date): string {
	return d.toISOString().split("T")[0]!;
}

function defaultFilters(): FinancialFilters {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	return {
		startDate: toDateString(start),
		endDate: toDateString(now),
		operadorId: undefined,
		groupBy: "month",
		situacao: undefined,
	};
}

export interface FinancialFilters {
	startDate: string;
	endDate: string;
	operadorId: number | undefined;
	groupBy: "day" | "month";
	situacao: string | undefined;
}

interface IFinancialContext {
	filters: FinancialFilters;
	setFilter: <K extends keyof FinancialFilters>(key: K, value: FinancialFilters[K]) => void;
	data: DashboardData | null;
	isLoading: boolean;
	loadDashboard: () => void;
	goalsOpen: boolean;
	setGoalsOpen: (open: boolean) => void;
}

export const FinancialContext = createContext<IFinancialContext>({} as IFinancialContext);

export function useFinancialContext() {
	return useContext(FinancialContext);
}

export default function FinancialProvider({ children }: { children: ReactNode }) {
	const { token } = useContext(AuthContext);
	const [filters, setFilters] = useState<FinancialFilters>(defaultFilters);
	const [data, setData] = useState<DashboardData | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [goalsOpen, setGoalsOpen] = useState(false);
	const initialLoadDone = useRef(false);

	const setFilter = useCallback(
		<K extends keyof FinancialFilters>(key: K, value: FinancialFilters[K]) => {
			setFilters((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	const loadDashboard = useCallback(async () => {
		if (!token) return;
		setIsLoading(true);
		try {
			// Derive comparison period: same duration immediately before startDate
			const start = new Date(filters.startDate);
			const end = new Date(filters.endDate);
			const durationMs = end.getTime() - start.getTime();
			const compareEnd = new Date(start.getTime() - 86400000); // day before startDate
			const compareStart = new Date(compareEnd.getTime() - durationMs);

			const result = await financialService.getDashboard(token, {
				startDate: filters.startDate,
				endDate: filters.endDate,
				...(filters.operadorId !== undefined && { operadorId: filters.operadorId }),
				groupBy: filters.groupBy,
				...(filters.situacao !== undefined && { situacao: filters.situacao }),
				compareStartDate: compareStart.toISOString().split("T")[0]!,
				compareEndDate: compareEnd.toISOString().split("T")[0]!,
			});
			setData(result);
		} catch (err) {
			toast.error(sanitizeErrorMessage(err));
		} finally {
			setIsLoading(false);
		}
	}, [token, filters]);

	useEffect(() => {
		if (token && !initialLoadDone.current) {
			initialLoadDone.current = true;
			loadDashboard();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token]);

	return (
		<FinancialContext.Provider
			value={{ filters, setFilter, data, isLoading, loadDashboard, goalsOpen, setGoalsOpen }}
		>
			{children}
		</FinancialContext.Provider>
	);
}
