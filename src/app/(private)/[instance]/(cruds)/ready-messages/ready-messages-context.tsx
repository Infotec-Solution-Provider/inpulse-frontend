"use client";

import { AuthContext } from "@/app/auth-context";
import {
  CreateReadyMessageDto,
  ReadyMessage,
  ReadyMessageClient,
  UpdateReadyMessageDto,
} from "@in.pulse-crm/sdk";
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
import { toast } from "react-toastify";
import { WhatsappContext } from "../../whatsapp-context";
import readyMessagesReducer, {
  ChangeReadyMessagesStateAction,
  MultipleActions,
  ReadyMessagesContextState,
} from "./(table)/ready-messages-reducer";

interface IReadyMessagesProviderProps {
  children: ReactNode;
}

interface ReplaceVariablesOptions {
  message: string;
  values: {
    currentSaudation: string;
    customerFullName: string;
    customerFirstName: string;
    customerRazao: string;
    customerCnpj: string;
    operatorNameExibition: string;
    operatorName: string;
  };
}

interface Variable {
  name: string;
  replaceFor: keyof ReplaceVariablesOptions["values"];
}

interface IReadyMessagesContext {
  state: ReadyMessagesContextState;
  dispatch: ActionDispatch<[action: ChangeReadyMessagesStateAction | MultipleActions]>;
  readyMessages: Array<ReadyMessage>;
  sectors: Array<{ id: number; name: string }>;
  createReadyMessage: (data: CreateReadyMessageDto, file?: File | null) => Promise<void>;
  deleteReadyMessage: (id: number) => Promise<void>;
  updateReadyMessage: (
    id: number,
    data: UpdateReadyMessageDto,
    file?: File | null,
  ) => Promise<void>;
  variables: Array<Variable>;
  replaceVariables: (props: ReplaceVariablesOptions) => string;
  fetchReadyMessages: () => Promise<void>;
  loadReadyMessages: () => Promise<void>;
}

const ReadyMessagesContext = createContext({} as IReadyMessagesContext);

export const useReadyMessagesContext = () => {
  return useContext(ReadyMessagesContext);
};

const INTERNAL_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";

export default function ReadyMessagesProvider({ children }: IReadyMessagesProviderProps) {
  const { token } = useContext(AuthContext);
  const { wppApi } = useContext(WhatsappContext);

  const api = useRef(new ReadyMessageClient(INTERNAL_BASE_URL));

  const [readyMessages, setReadyMessages] = useState<ReadyMessage[]>([]);
  const [sectors, setSectors] = useState<Array<{ id: number; name: string }>>([]);

  const [state, dispatch] = useReducer(readyMessagesReducer, {
    readyMessages: [],
    totalRows: 0,
    filters: {
      page: "1",
      perPage: "10",
    },
    isLoading: false,
  });

  const variables: Variable[] = [
    { name: "@saudação_tempo", replaceFor: "currentSaudation" },
    { name: "@cliente_razao", replaceFor: "customerRazao" },
    { name: "@cliente_cnpj", replaceFor: "customerCnpj" },
    { name: "@atendente_nome", replaceFor: "operatorName" },
    { name: "@atendente_nome_exibicao", replaceFor: "operatorNameExibition" },
    { name: "@contato_primeiro_nome", replaceFor: "customerFirstName" },
    { name: "@contato_nome_completo", replaceFor: "customerFullName" },
  ];

  function replaceVariables({ message, values }: ReplaceVariablesOptions): string {
    let replaced = message;
    variables.forEach((v) => {
      replaced = replaced.replaceAll(v.name, values[v.replaceFor] ?? "");
    });
    return replaced;
  }

  const updateReadyMessage = useCallback(
    async (id: number, data: UpdateReadyMessageDto, file?: File | null) => {
      if (!token) return;

      try {
        api.current.setAuth(token);

        let fileId: number | null = null;

        if (file) {
          const res = await api.current.updateReadyMessage(id, data, file);
          fileId = res?.fileId ;
        } else {
          await api.current.updateReadyMessage(id, data);
        }

        dispatch({
          type: "update-ready-message",
          id,
          data: {
            ...data,
            ...(fileId ? { fileId } : {}),
          },
        });

        toast.success("Mensagem pronta atualizada com sucesso!");
        await loadReadyMessages();
      } catch (error) {
        console.error("Error updating readyMessage", error);
        toast.error("Erro ao atualizar Mensagem pronta");
        throw error;
      }
    },
    [token],
  );

  const createReadyMessage = useCallback(
    async (data: CreateReadyMessageDto, file?: File | null) => {
      if (!token) return;

      try {
        api.current.setAuth(token);
        const created = await api.current.createReadyMessage(data, file);
        dispatch({ type: "add-ready-message", data: created });
        toast.success("Mensagem pronta criada com sucesso!");
        await loadReadyMessages();
      } catch (error) {
        console.error("Error creating readyMessage", error);
        toast.error("Erro ao criar Mensagem pronta");
      }
    },
    [token],
  );


  const deleteReadyMessage = useCallback(
    async (id: number) => {
      if (!token) return;

      try {
        api.current.setAuth(token);
        await api.current.deleteReadyMessage(id);
        dispatch({ type: "delete-ready-message", id });
        toast.success("Mensagem pronta deletada com sucesso!");
      } catch (error) {
        console.error("Error deleting readyMessage", error);
        toast.error("Erro ao deletar Mensagem pronta");
      }
    },
    [token],
  );


  const fetchReadyMessages = useCallback(async () => {
    if (!token) return;

    api.current.setAuth(token);
    const msgs = await api.current.getReadyMessages();
    setReadyMessages(msgs);
  }, [token]);


  const loadReadyMessages = useCallback(async () => {
    dispatch({ type: "change-loading", isLoading: true });

    try {
      if (!token) {
        dispatch({ type: "change-loading", isLoading: false });
        return;
      }
      api.current.setAuth(token);
      const msgs = await api.current.getReadyMessages();

      dispatch({
        type: "multiple",
        actions: [
          { type: "load-ready-messages", readyMessages: msgs },
          { type: "change-total-rows", totalRows: msgs.length || 0 },
          { type: "change-loading", isLoading: false },
        ],
      });
    } catch (error) {
      console.error("Error loading readyMessages", error);
      dispatch({ type: "change-loading", isLoading: false });
      toast.error("Falha ao carregar mensagens prontas!");
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      api.current.setAuth(token);
      loadReadyMessages();
    }
  }, [token]);

  useEffect(() => {
    if (wppApi.current && token) {
      wppApi.current.setAuth(token);
      wppApi.current.getSectors().then(setSectors);
    }
  }, [wppApi, token]);

  useEffect(() => {
    loadReadyMessages();
  }, [state.filters.page, state.filters.perPage]);

  return (
    <ReadyMessagesContext.Provider
      value={{
        state,
        dispatch,
        readyMessages,
        sectors,
        updateReadyMessage,
        createReadyMessage,
        deleteReadyMessage,
        variables,
        replaceVariables,
        fetchReadyMessages,
        loadReadyMessages,
      }}
    >
      {children}
    </ReadyMessagesContext.Provider>
  );
}
