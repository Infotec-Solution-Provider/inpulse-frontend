import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { WhatsappClient, WppContact } from "@in.pulse-crm/sdk";
import { useAuthContext } from "@/app/auth-context";
import { Logger } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";
import { WPP_BASE_URL } from "../../whatsapp-context";
import ContactModal from "./(table)/(modal)/contact-modal";
import DeleteContactModal from "./(table)/(modal)/delete-contact-modal";
import useInternalChatContext from "../../internal-context";

interface IContactsProviderProps {
  children: ReactNode;
}

interface IContactsContext {
  deleteContact: (id: number) => void;
  updateContact: (id: number, name: string) => Promise<void>;
  loadContacts: () => void;
  contacts: WppContact[];
  contact: WppContact | null;
  createContact: (name: string, phone: string) => void;
  isLoading: boolean;
  openContactModal: (contact?: WppContact) => void;
  closeModal: () => void;
  modal: ReactNode;
  handleDeleteContact: (contact: WppContact) => void;
  phoneNameMap: Map<string, string>;
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
  const [contact, setContact] = useState<WppContact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<ReactNode>(null);
  const { users } = useInternalChatContext();

  const phoneNameMap = useMemo(() => {
    const map = new Map<string, string>();

    (contacts ?? []).forEach((contact) => {
      const phone = contact.phone?.replace(/\D/g, "");
      if (phone && contact.name) map.set(phone, contact.name);
    });

    (users ?? []).forEach((u) => {
      const phone = u.WHATSAPP?.replace(/\D/g, "");
      if (phone && u.NOME) map.set(phone, u.NOME);
    });

    return map;
  }, [users, contacts]);

  const updateContact = useCallback(
    async (id: number, name: string) => {
      try {
        if (token) {
          const updatedContact = await api.current.updateContact(id, name);
          setContact(updatedContact);
          setContacts((prevContacts) =>
            prevContacts.map((c) => (c.id === id ? updatedContact : c)),
          );
          closeModal();
          toast.success("Cliente atualizado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error updating contact", err as Error);
        toast.error("Falha ao atualizar cliente!");
      }
    },
    [token],
  );

  const deleteContact = useCallback(
    async (id: number) => {
      try {
        if (token) {
          await api.current.deleteContact(id);
          setContacts((prevContacts) => prevContacts.filter((contact) => contact.id !== id));
          toast.success("Contato deletado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error deleting contact", err as Error);
        toast.error("Falha ao deletar cliente!");
      }
    },
    [token],
  );

  const createContact = useCallback(
    async (name: string, phone: string) => {
      try {
        if (token) {
          const newContact = await api.current.createContact(name, phone.replace(/\D/g, ""));
          setContacts((prevContacts) => [...prevContacts, newContact]);
          toast.success("Contato criado com sucesso!");
          closeModal();
        }
      } catch (err) {
        Logger.error("Error criar contact", err as Error);
        toast.error("Falha ao atualizar cliente!");
      }
    },
    [token],
  );

  const openContactModal = useCallback(
    (contact?: WppContact) => {
      setModal(<ContactModal contact={contact} />);
    },
    [createContact, updateContact],
  );

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const handleDeleteContact = useCallback(
    (contact: WppContact) => {
      setModal(<DeleteContactModal contact={contact} />);
    },
    [deleteContact],
  );

  const loadContacts = useCallback(async () => {
    try {
      setIsLoading(true);

      const res = await api.current.getContacts();
      setContacts(res);
    } catch (err) {
      Logger.error("Error loading contacts", err as Error);
      toast.error("Falha ao carregar clientes!");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token || !api.current) return;
    api.current.setAuth(token);
    loadContacts();
  }, [token, api.current]);

  return (
    <ContactsContext.Provider
      value={{
        contacts,
        updateContact,
        loadContacts,
        createContact,
        deleteContact,
        isLoading,
        openContactModal,
        closeModal,
        modal,
        handleDeleteContact,
        contact,
        phoneNameMap
      }}
    >
      {children}
      {modal}
    </ContactsContext.Provider>
  );
}
