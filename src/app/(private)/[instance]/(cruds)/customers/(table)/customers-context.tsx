import {
  ActionDispatch,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import customersReducer, {
  ChangeCustomersStateAction,
  CustomersContextState,
} from "./customers-reducer";
import { CreateCustomerDTO, CustomersClient, UpdateCustomerDTO } from "@in.pulse-crm/sdk";
import { useAuthContext } from "@/app/auth-context";
import { Logger } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";

interface ICustomersContextProviderProps {
  children: ReactNode;
}

interface ICustomersContext {
  state: CustomersContextState;
  dispatch: ActionDispatch<[ChangeCustomersStateAction]>;
  updateCustomer: (id: number, data: UpdateCustomerDTO) => Promise<void>;
  createCustomer: (data: CreateCustomerDTO) => Promise<void>;
  loadCustomers: () => Promise<void>;
}

const CustomersContext = createContext({} as ICustomersContext);
export const useCustomersContext = () => {
  const context = useContext(CustomersContext);
  if (!context) {
    throw new Error("useCustomersContext must be used within a CustomersProvider");
  }
  return context;
};

const CUSTOMERS_BASE_URL: string = process.env["NEXT_PUBLIC_CUSTOMERS_URL"]!;

if (!CUSTOMERS_BASE_URL) {
  throw new Error("NEXT_PUBLIC_CUSTOMERS_URL is not defined");
}

export default function CustomersProvider({ children }: ICustomersContextProviderProps) {
  const api = useRef(new CustomersClient(CUSTOMERS_BASE_URL));
  const { token } = useAuthContext();

  const [state, dispatch] = useReducer(customersReducer, {
    customers: [],
    totalRows: 0,
    filters: {},
    isLoading: false,
  });

  const createCustomer = async (data: CreateCustomerDTO) => {
    try {
      await api.current.createCustomer(data);
      toast.success("Cliente cadastrado com sucesso!");
    } catch (err) {
      Logger.error("Error creating customer", err as Error);
      toast.error("Falha ao cadastrar cliente!");
    } finally {
      loadCustomers();
    }
  };

  const updateCustomer = async (id: number, data: UpdateCustomerDTO) => {
    try {
      await api.current.updateCustomer(id, data);
      dispatch({ type: "update-customer", id, data });
      toast.success("Cliente atualizado com sucesso!");
    } catch (err) {
      Logger.error("Error updating customer", err as Error);
      toast.error("Falha ao atualizar cliente!");
    }
  };

  const loadCustomers = async () => {
    dispatch({ type: "change-loading", isLoading: true });

    try {
      const res = await api.current.getCustomers(state.filters);
      dispatch({
        type: "multiple",
        actions: [
          { type: "change-total-rows", totalRows: res.page.totalRows },
          { type: "change-loading", isLoading: false },
          { type: "load-customers", customers: res.data },
        ],
      });
    } catch (err) {
      dispatch({ type: "change-loading", isLoading: false });
      Logger.error("Error loading customers", err as Error);
      toast.error("Falha ao carregar clientes!");
    }
  };

  useEffect(() => {
    if (!token) return;
    api.current.setAuth(token);
    loadCustomers();
  }, [token]);

  return (
    <CustomersContext.Provider
      value={{
        state,
        dispatch,
        updateCustomer,
        createCustomer,
        loadCustomers,
      }}
    >
      {children}
    </CustomersContext.Provider>
  );
}
