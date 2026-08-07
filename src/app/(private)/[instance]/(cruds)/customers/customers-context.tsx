"use client";

import {
  ActionDispatch,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";

import { useAuthContext } from "@/app/auth-context";
import {
  CreateCustomerDTO,
  Customer,
  CustomersClient,
  RequestFilters,
  UpdateCustomerDTO,
} from "@/lib/sdk-local";
import { Logger } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";
import { isSystemDefaultCustomer } from "@/lib/utils/customer-guards";
import customersReducer, {
  ChangeCustomersStateAction,
  CustomerListFilters,
  CustomersContextState,
  MultipleActions,
} from "./(table)/customers-reducer";
import { createCacheScope } from "@/lib/cache/cache-scope";
import { hybridCache } from "@/lib/cache/hybrid-cache";

interface ICustomersProviderProps {
  children: ReactNode;
}

interface ICustomersContext {
  state: CustomersContextState;
  dispatch: ActionDispatch<[action: ChangeCustomersStateAction | MultipleActions]>;
  updateCustomer: (id: number, data: UpdateCustomerDTO) => void;
  createCustomer: (data: CreateCustomerDTO) => void;
  loadCustomers: () => void;
  searchCustomers: (
    term: string,
    filterBy?: "RAZAO" | "COD_ERP" | "CODIGO" | "CPF_CNPJ",
  ) => Promise<Customer[]>;
}

export const CustomersContext = createContext<ICustomersContext>({} as ICustomersContext);
export const useCustomersContext = () => {
  const context = useContext(CustomersContext);
  return context;
};

const CUSTOMERS_BASE_URL: string =
  process.env["NEXT_PUBLIC_CUSTOMERS_URL"] || "https://inpulse.infotecrs.inf.br";

export default function CustomersProvider({ children }: ICustomersProviderProps) {
  const api = useRef(new CustomersClient(CUSTOMERS_BASE_URL));
  const { token, user, instance } = useAuthContext();
  const cacheScope = user ? createCacheScope(instance, user.CODIGO) : null;

  const [state, dispatch] = useReducer(customersReducer, {
    customers: [],
    totalRows: 0,
    filters: {
      page: "1",
      perPage: "10",
    },
    isLoading: false,
  });

  const createCustomer = useCallback(
    async (data: CreateCustomerDTO) => {
      try {
        if (token) {
          await api.current.createCustomer(data);
          if (cacheScope) void hybridCache.invalidateResource(cacheScope, "customer-page");
          toast.success("Cliente cadastrado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error creating customer", err as Error);
        toast.error("Falha ao cadastrar cliente!");
      }
    },
    [cacheScope, token],
  );

  const updateCustomer = useCallback(
    async (id: number, data: UpdateCustomerDTO) => {
      if (isSystemDefaultCustomer(id)) {
        toast.info("O cliente padrão do sistema não pode ser editado.");
        return;
      }

      try {
        if (token) {
          await api.current.updateCustomer(id, data);
          if (cacheScope) void hybridCache.invalidateResource(cacheScope, "customer-page");
          dispatch({ type: "update-customer", id, data });
          toast.success("Cliente atualizado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error updating customer", err as Error);
        toast.error("Falha ao atualizar cliente!");
      }
    },
    [cacheScope, token],
  );

  const loadCustomers = useCallback(async () => {
    dispatch({ type: "change-loading", isLoading: true });

    try {
      if (!token) {
        return dispatch({ type: "change-loading", isLoading: false });
      }
      const cacheKey = JSON.stringify(state.filters);
      if (cacheScope) {
        const cached = await hybridCache.get<{ data: Customer[]; page: { totalRows?: number } }>(
          cacheScope,
          "customer-page",
          cacheKey,
        );
        if (cached) {
          dispatch({
            type: "multiple",
            actions: [
              { type: "change-total-rows", totalRows: cached.page.totalRows || 0 },
              { type: "load-customers", customers: cached.data },
            ],
          });
        }
      }
      const res = await api.current.getCustomers(state.filters as unknown as CustomerListFilters);
      if (cacheScope) void hybridCache.set(cacheScope, "customer-page", res, cacheKey);
      dispatch({
        type: "multiple",
        actions: [
          { type: "change-total-rows", totalRows: res.page.totalRows || 0 },
          { type: "change-loading", isLoading: false },
          { type: "load-customers", customers: res.data },
        ],
      });
    } catch (err) {
      dispatch({ type: "change-loading", isLoading: false });
      Logger.error("Error loading customers", err as Error);
      toast.error("Falha ao carregar clientes!");
    }
  }, [cacheScope, state.filters, token]);

  const searchCustomers = useCallback(
    async (term: string, filterBy: "RAZAO" | "COD_ERP" | "CODIGO" | "CPF_CNPJ" = "RAZAO") => {
      if (!token) return [];

      try {
        const filters: RequestFilters<Customer> = {
          perPage: "20",
          page: "1",
        };

        if (term.trim()) {
          const trimmed = term.trim();
          const digitsOnly = trimmed.replace(/\D/g, "");
          if (filterBy === "RAZAO") {
            filters.RAZAO = trimmed;
          } else if (filterBy === "COD_ERP") {
            filters.COD_ERP = trimmed;
          } else if (filterBy === "CODIGO") {
            filters.CODIGO = digitsOnly || trimmed;
          } else if (filterBy === "CPF_CNPJ") {
            filters.CPF_CNPJ = digitsOnly || trimmed;
          }
        }

        const res = await api.current.getCustomers(filters);
        return res.data;
      } catch (err) {
        Logger.error("Error searching customers", err as Error);
        return [];
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token || !api.current) return;
    api.current.setAuth(token);
    loadCustomers();
  }, [token]);

  useEffect(() => {
    loadCustomers();
  }, [state.filters.perPage, state.filters.page]);

  return (
    <CustomersContext.Provider
      value={{
        state,
        dispatch,
        updateCustomer,
        createCustomer,
        loadCustomers,
        searchCustomers,
      }}
    >
      {children}
    </CustomersContext.Provider>
  );
}
