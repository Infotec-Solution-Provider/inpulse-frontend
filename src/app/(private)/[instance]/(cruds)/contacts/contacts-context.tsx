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

import { WhatsappClient, WppContact } from "@in.pulse-crm/sdk";
import { useAuthContext } from "@/app/auth-context";
import { Logger } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";
import { WPP_BASE_URL } from "../../whatsapp-context";

interface IContactsProviderProps {
  children: ReactNode;
}

interface IContactsContext {
  deleteContact: (id: number) => void;
  updateContact: (id: number, name: string) => Promise<void>;
  loadContacts: () => void;
  contacts: WppContact[]
  createContact:(name:string, phone:string )=> void;
  isLoading: boolean;
}

export const ContactsContext = createContext<IContactsContext>({} as IContactsContext);
export const useContactsContext = () => {
  const context = useContext(ContactsContext);
  return context;
};

export default function ContactsProvider({ children }: IContactsProviderProps) {
  const api = useRef(new WhatsappClient(WPP_BASE_URL));
  const { token } = useAuthContext();
  const [contacts, setContacts] = useState<WppContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  const updateContact = useCallback(async (id: number, name: string) => {
    try {
      if (token) {
      const update = await api.current.updateContact(id, name);
      setContacts((prevContacts) =>
        prevContacts.map((contact) =>
          contact.id === id ? update : contact
        )
      );
      toast.success("Cliente atualizado com sucesso!");
      }
    } catch (err) {
      Logger.error("Error updating contact", err as Error);
      toast.error("Falha ao atualizar cliente!");
    }
 }, [token]);

  const createContact = useCallback(async (name:string, phone:string ) => {
    try {
      if (token) {
      const newContact = await api.current.createContact(name, phone);
      setContacts((prevContacts) => [...prevContacts, newContact]);
      toast.success("Contato criado com sucesso!");
      }
    } catch (err) {
      Logger.error("Error criar contact", err as Error);
      toast.error("Falha ao atualizar cliente!");
    }
 }, [token]);

const deleteContact = useCallback(async (id: number) => {
  try {
    if (token) {
      await api.current.deleteContact(id);
      setContacts((prevContacts) =>
        prevContacts.filter((contact) => contact.id !== id)
      );
      toast.success("Contato deletado com sucesso!");
    }
  } catch (err) {
    Logger.error("Error deleting contact", err as Error);
    toast.error("Falha ao deletar cliente!");
  }
}, [token]);

  const loadContacts = useCallback(async () => {

    try {
          setIsLoading(true);

      const res = await api.current.getContacts();
      setContacts(res);
    } catch (err) {
      Logger.error("Error loading contacts", err as Error);
      toast.error("Falha ao carregar clientes!");
    }finally {
    setIsLoading(false);
  }
 }, []);

  useEffect(() => {
    if (!token || !api.current) return;
    api.current.setAuth(token);
    loadContacts();
  }, [token,api.current]);

  return (
    <ContactsContext.Provider
      value={{
        contacts,
        updateContact,
        loadContacts,
        createContact,
        deleteContact,
        isLoading
      }}
    >
      {children}
    </ContactsContext.Provider>
  );
}
