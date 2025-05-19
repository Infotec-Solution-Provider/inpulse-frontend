import { ReadyMessage, ReadyMessageClient } from "@in.pulse-crm/sdk";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "@/app/auth-context";
import axios from "axios";
import { WPP_BASE_URL } from "../../whatsapp-context";
import { toast } from "react-toastify";

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
  }
}

interface Variable {
  name: string;
  replaceFor: keyof ReplaceVariablesOptions["values"];
}
interface IReadyMessagesContext {
  readyMessages: Array<ReadyMessage>;
  createReadyMessage: (File?: File | null, TITULO?: string | null, TEXTO_MENSAGEM?: string | null) => Promise<void>;
  deleteReadyMessage: (id: number) => Promise<void>;
  updateReadyMessage: (id: number, data: ReadyMessage, file?: File) => Promise<void>;
  variables: Array<Variable>;
  replaceVariables: (props: ReplaceVariablesOptions) => string;
  fetchReadyMessages: () => Promise<void>;
}

const ReadyMessagesContext = createContext({} as IReadyMessagesContext);
export const useReadyMessagesContext = () => {
  const context = useContext(ReadyMessagesContext);
  return context;
};

const INTENAL_BASE_URL = process.env["NEXT_PUBLIC_WHATSAPP_URL"] || "http://localhost:8005";

export default function ReadyMessagesProvider({ children }: IReadyMessagesProviderProps) {
  const { token } = useContext(AuthContext);
  const [readyMessages, setReadyMessages] = useState<ReadyMessage[]>([]);
  const api = useRef(new ReadyMessageClient(INTENAL_BASE_URL));
  const variables: Variable[] = [
    { name: "@saudação_tempo", replaceFor: "currentSaudation" },
    { name: "@cliente_razao", replaceFor: "customerRazao" },
    { name: "@cliente_cnpj", replaceFor: "customerCnpj" },
    { name: "@atendente_nome", replaceFor: "operatorName" },
    { name: "@atendente_nome_exibicao", replaceFor: "operatorNameExibition" },
    { name: "@contato_primeiro_nome", replaceFor: "customerFirstName" },
    { name: "@contato_nome_completo", replaceFor: "customerFullName" },
];

function replaceVariables({
    message, values
}: ReplaceVariablesOptions): string {
    variables.forEach((v) => {
        message = message.replaceAll(v.name, values[v.replaceFor])
    });

    return message;
}


  const updateReadyMessage = useCallback(
    async (id: number,data: ReadyMessage, file?: File) => {
    if (token) {
      try {
        if (!file) return
        const res = await api.current.updateReadyMessage(id, data, file);
        setReadyMessages((prev) =>
          prev.map((readyMessage) => {
            if (readyMessage.CODIGO === id) {
              return { ...readyMessage, file: res.ARQUIVO };
            }
            return readyMessage;
          }),
        );
        toast.success("Arquivo do Mensagem pronta atualizada com sucesso!");
      } catch (error) {
        console.error("Error updating readyMessage image", error);
        toast.error("Erro ao atualizar Arquivo do Mensagem pronta");
      }
    }
  },
  [token],
);

  const createReadyMessage = useCallback(
    async (file?: File | null, TITULO?: string | null, TEXTO_MENSAGEM?: string | null) => {
    if (token) {
      try {
        const created = await api.current.createReadyMessage(
          file,
          TITULO, TEXTO_MENSAGEM
        );
        setReadyMessages((prev) => [created, ...(prev || [])]);
      } catch (error) {
        console.error("Error creating readyMessage", error);
        toast.error("Erro ao criar Mensagem pronta");
      }
    }
  },
  [token],
);

  const deleteReadyMessage = useCallback(
    async (id: number) => {
    if (token) {
      try {
        await api.current.deleteReadyMessage(id);
        toast.success("Mensagem pronta  deletado com sucesso!");
        setReadyMessages((prev) => prev.filter((readyMessage) => readyMessage.CODIGO !== id));
      } catch (error) {
        toast.error("Erro ao deletar Mensagem pronta");
      }
    }
  },
  [token],
);
const fetchReadyMessages = useCallback(async () => {
  if (token && api.current) {
    api.current.setAuth(token);
    const msgs = await api.current.getReadyMessages();
    setReadyMessages(msgs);
  }
}, [token]);

  useEffect(() => {
    if (token && api.current) {
      api.current.setAuth(token);
      api.current.getReadyMessages().then((readyMessages) => {
        setReadyMessages(readyMessages);
      });

    }
  }, [token,api.current]);

  return (
    <ReadyMessagesContext.Provider
      value={{
        readyMessages,
        updateReadyMessage,
        createReadyMessage,
        deleteReadyMessage,
        variables,
        replaceVariables,
        fetchReadyMessages
      }}
    >
      {children}
    </ReadyMessagesContext.Provider>
  );
}
