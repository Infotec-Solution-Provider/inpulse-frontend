import {
  ActionDispatch,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

import { CreateCustomerDTO, CustomersClient, UpdateCustomerDTO } from "@in.pulse-crm/sdk";
import { useAuthContext } from "@/app/auth-context";
import { Logger } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";
import customersReducer, { ChangeCustomersStateAction, CustomersContextState } from "./(table)/customers-reducer";

interface ICustomersProviderProps {
  children: ReactNode;
}

interface ICustomersContext {
  state: CustomersContextState;
  dispatch: ActionDispatch<[ChangeCustomersStateAction]>;
  updateCustomer: (id: number, data: UpdateCustomerDTO) => void;
  createCustomer: (data: CreateCustomerDTO) => void;
  loadCustomers: () => void;
}

export const CustomersContext = createContext<ICustomersContext>({} as ICustomersContext);
export const useCustomersContext = () => {
  const context = useContext(CustomersContext);
  return context;
};

const CUSTOMERS_BASE_URL: string = process.env["NEXT_PUBLIC_CUSTOMERS_URL"] || "http://localhost:8002";

export default function CustomersProvider({ children }: ICustomersProviderProps) {
  const api = useRef(new CustomersClient(CUSTOMERS_BASE_URL));
  const { token } = useAuthContext();

  const [state, dispatch] = useReducer(customersReducer, {
    customers: [],
    totalRows: 0,
    filters: {},
    isLoading: false,
  });

  const createCustomer = useCallback(async (data: CreateCustomerDTO) => {
    try {
      if (token) {
      await api.current.createCustomer(data);
      toast.success("Cliente cadastrado com sucesso!");
      }
    } catch (err) {
      Logger.error("Error creating customer", err as Error);
      toast.error("Falha ao cadastrar cliente!");
    } finally {
      loadCustomers();
    }
 }, [token]);

  const updateCustomer = useCallback(async (id: number, data: UpdateCustomerDTO) => {
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
 }, []);

  const loadCustomers = useCallback(async (filters = state.filters) => {
    if (!api.current) return;
    
    dispatch({ type: "change-loading", isLoading: true });
    console.log('Carregando clientes com filtros:', filters);

    try {
      const res = await api.current.getCustomers({
        ...filters,
        page: filters?.page || '1',
        perPage: filters?.perPage || '10'
      });
      
      console.log('Resposta da API:', res);
      
      dispatch({
        type: "multiple",
        actions: [
          { type: "change-total-rows", totalRows: res.page?.totalRows || 0 },
          { type: "change-loading", isLoading: false },
          { type: "load-customers", customers: res.data || [] },
        ],
      });
    } catch (err) {
      dispatch({ type: "change-loading", isLoading: false });
      Logger.error("Error loading customers", err as Error);
      toast.error("Falha ao carregar clientes!");
    }
  }, []); // Removido state.filters das dependências

  // Efeito para configurar o token e carregar clientes iniciais
  useEffect(() => {
    if (!token || !api.current) return;
    
    // Configura o token de autenticação
    api.current.setAuth(token);
    
    // Carrega os clientes iniciais apenas se não houver clientes carregados
    if (state.customers.length === 0) {
      loadCustomers();
    }
    
    console.log('Token configurado');
  }, [token]); // Apenas token como dependência
  
  // Efeito separado para lidar com mudanças nos filtros
  useEffect(() => {
    if (token && api.current) {
      loadCustomers(state.filters);
    }
  }, [state.filters, token]); // Executa quando os filtros mudam

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
