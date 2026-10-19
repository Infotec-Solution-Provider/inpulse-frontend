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
  useMemo,
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

export const CustomersContext = createContext<ICustomersContext | undefined>(undefined);
export const useCustomersContext = () => {
  const context = useContext(CustomersContext);
  if (!context) {
    throw new Error("useCustomersContext must be used within a CustomersProvider");
  }
  return context;
};

const CUSTOMERS_BASE_URL: string =
  process.env["NEXT_PUBLIC_CUSTOMERS_URL"] || "https://inpulse.infotecrs.inf.br";

export default function CustomersProvider({ children }: ICustomersProviderProps) {
  const api = useRef(new CustomersClient(CUSTOMERS_BASE_URL));
  const { token, user, instance } = useAuthContext();
  const scope = `${instance}:${user?.CODIGO ?? "anonymous"}`;
  const cacheScope = useMemo(
    () => (user ? createCacheScope(instance, user.CODIGO) : null),
    [instance, user?.CODIGO],
  );
  useEffect(() => {
    // Retire pages persisted by older versions; search controls and rows stay in memory.
    if (cacheScope) void hybridCache.invalidateResource(cacheScope, "customer-page");
  }, [cacheScope]);
  const currentContext = `${scope}:${token ?? ""}`;
  const contextRef = useRef(currentContext);
  contextRef.current = currentContext;
  const sequence = useRef(0);

  const [state, dispatch] = useReducer(customersReducer, {
    scope,
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
    if (state.scope !== scope) return;
    const started = currentContext,
      request = ++sequence.current;
    const active = () => contextRef.current === started && sequence.current === request;
    api.current.setAuth(token ?? "");
    dispatch({ type: "change-loading", isLoading: true });

    try {
      if (!token) {
        return dispatch({ type: "change-loading", isLoading: false });
      }
      const res = await api.current.getCustomers(state.filters as unknown as CustomerListFilters);
      if (!active()) return;
      dispatch({
        type: "multiple",
        actions: [
          { type: "change-total-rows", totalRows: res.page.totalRows || 0 },
          { type: "change-loading", isLoading: false },
          { type: "load-customers", customers: res.data },
        ],
      });
    } catch (err) {
      if (!active()) return;
      dispatch({ type: "change-loading", isLoading: false });
      Logger.error("Error loading customers", err as Error);
      toast.error("Falha ao carregar clientes!");
    }
  }, [cacheScope, JSON.stringify(state.filters), token, scope, state.scope]);

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
    if (state.scope !== scope) dispatch({ type: "reset-context", scope });
  }, [scope, state.scope]);
  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );
  useEffect(() => {
    if (token && state.scope === scope) void loadCustomers();
  }, [token, scope, state.scope, JSON.stringify(state.filters)]);
  const visibleState =
    state.scope === scope
      ? state
      : {
          scope,
          customers: [],
          totalRows: 0,
          filters: { page: "1", perPage: "10" },
          isLoading: false,
        };

  return (
    <CustomersContext.Provider
      value={{
        state: visibleState,
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
