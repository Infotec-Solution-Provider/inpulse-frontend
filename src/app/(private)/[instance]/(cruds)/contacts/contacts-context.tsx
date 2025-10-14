import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import { useAuthContext } from "@/app/auth-context";
import { WhatsappClient, WppContact } from "@in.pulse-crm/sdk";
import { Logger } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";
import { useAppContext } from "../../app-context";
import useInternalChatContext from "../../internal-context";
import { WPP_BASE_URL } from "../../whatsapp-context";
import ContactModal from "./(table)/(modal)/contact-modal";
import DeleteContactModal from "./(table)/(modal)/delete-contact-modal";
import contactsReducer, { ContactsContextState } from "./(table)/contacts-reducer";

interface IContactsProviderProps {
  children: ReactNode;
}

interface IContactsContext {
  state: ContactsContextState;
  dispatch: React.Dispatch<any>;
  deleteContact: (id: number) => void;
  updateContact: (id: number, name: string) => Promise<void>;
  loadContacts: () => void;
  createContact: (name: string, phone: string) => void;
  openContactModal: (contact?: WppContact) => void;
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
  const [state, dispatch] = useReducer(contactsReducer, {
    contacts: [],
    totalRows: 0,
    filters: { page: "1", perPage: "10" },
    isLoading: false,
  });
  const { users } = useInternalChatContext();
  const { openModal, closeModal } = useAppContext();

  const phoneNameMap = useMemo(() => {
    const map = new Map<string, string>();

    (state.contacts ?? []).forEach((contact) => {
      const phone = contact.phone?.replace(/\D/g, "");
      if (phone && contact.name) map.set(phone, contact.name);
    });

    (users ?? []).forEach((u) => {
      const phone = u.WHATSAPP?.replace(/\D/g, "");
      if (phone && u.NOME) map.set(phone, u.NOME);
    });

    return map;
  }, [users, state.contacts]);

  const updateContact = useCallback(
    async (id: number, name: string) => {
      try {
        if (token) {
          const updatedContact = await api.current.updateContact(id, name);
          dispatch({ type: "update-contact", id, name: updatedContact.name });
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
          dispatch({ type: "delete-contact", id });
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
          dispatch({ type: "add-contact", data: newContact });
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
      openModal(<ContactModal contact={contact} />);
    },
    [createContact, updateContact],
  );

  const handleDeleteContact = useCallback(
    (contact: WppContact) => {
      openModal(<DeleteContactModal contact={contact} />);
    },
    [deleteContact],
  );

  const loadContacts = useCallback(async () => {
    try {
      dispatch({ type: "change-loading", isLoading: true });

      const res = await api.current.getContacts();

      // Apply client-side filtering
      let filteredContacts = res;
      const filters: any = state.filters;

      if (filters.id) {
        filteredContacts = filteredContacts.filter((c) => c.id === parseInt(filters.id || "0"));
      }
      if (filters.name) {
        filteredContacts = filteredContacts.filter((c) =>
          c.name.toLowerCase().includes(filters.name?.toLowerCase() || ""),
        );
      }
      if (filters.phone) {
        filteredContacts = filteredContacts.filter((c) => c.phone.includes(filters.phone || ""));
      }

      const totalRows = filteredContacts.length;

      // Apply client-side pagination
      const page = parseInt(state.filters.page || "1");
      const perPage = parseInt(state.filters.perPage || "10");
      const startIndex = (page - 1) * perPage;
      const paginatedContacts = filteredContacts.slice(startIndex, startIndex + perPage);

      dispatch({
        type: "multiple",
        actions: [
          { type: "load-contacts", contacts: paginatedContacts },
          { type: "change-total-rows", totalRows },
          { type: "change-loading", isLoading: false },
        ],
      });
    } catch (err) {
      Logger.error("Error loading contacts", err as Error);
      toast.error("Falha ao carregar clientes!");
      dispatch({ type: "change-loading", isLoading: false });
    }
  }, [state.filters]);

  useEffect(() => {
    if (!token || !api.current) return;
    api.current.setAuth(token);
  }, [token, api.current]);

  useEffect(() => {
    if (token) {
      loadContacts();
    }
  }, [token, state.filters, loadContacts]);

  return (
    <ContactsContext.Provider
      value={{
        state,
        dispatch,
        updateContact,
        loadContacts,
        createContact,
        deleteContact,
        openContactModal,
        handleDeleteContact,
        phoneNameMap,
      }}
    >
      {children}
    </ContactsContext.Provider>
  );
}
