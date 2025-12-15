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
} from "@in.pulse-crm/sdk";
import { Logger } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";
import customersReducer, {
  ChangeCustomersStateAction,
  CustomersContextState,
  MultipleActions,
} from "./(table)/customers-reducer";

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
  const { token } = useAuthContext();

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
          toast.success("Cliente cadastrado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error creating customer", err as Error);
        toast.error("Falha ao cadastrar cliente!");
      }
    },
    [token],
  );

  const updateCustomer = useCallback(
    async (id: number, data: UpdateCustomerDTO) => {
      try {
        if (token) {
          await api.current.updateCustomer(id, data);
          dispatch({ type: "update-customer", id, data });
          toast.success("Cliente atualizado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error updating customer", err as Error);
        toast.error("Falha ao atualizar cliente!");
      }
    },
    [token],
  );

  const loadCustomers = useCallback(async () => {
    dispatch({ type: "change-loading", isLoading: true });

    try {
      if (!token) {
        return dispatch({ type: "change-loading", isLoading: false });
      }
      const res = await api.current.getCustomers(state.filters);
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
  }, [state.filters, token]);

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
          }
          else if (filterBy === "CPF_CNPJ") {
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
