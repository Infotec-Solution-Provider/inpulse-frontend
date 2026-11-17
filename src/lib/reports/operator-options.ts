import axios from "axios";
import type { EntityOptionsLoader } from "@/components/reports/SearchableEntityFilter";

const USERS_URL = process.env.NEXT_PUBLIC_USERS_URL || "http://localhost:8001";

export function reportOperatorOptions(token: string): EntityOptionsLoader {
  return async (search, page, signal) => {
    const query = search.trim();
    const response = await axios.get<{
      data: { CODIGO: number; NOME: string }[];
      page: { current: number; totalRows: number };
    }>(`${USERS_URL}/api/users`, {
      signal,
      headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}` },
      params: {
        page,
        perPage: 50,
        ...(query ? (/^\d+$/.test(query) ? { CODIGO: query } : { NOME: query }) : {}),
      },
    });
    return {
      options: response.data.data.map((user) => ({
        id: Number(user.CODIGO),
        label: user.NOME || `Operador ${user.CODIGO}`,
      })),
      hasMore: response.data.page.current * 50 < response.data.page.totalRows,
    };
  };
}
