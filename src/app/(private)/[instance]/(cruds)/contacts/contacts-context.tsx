import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

import { useAuthContext } from "@/app/auth-context";
import { Customer, WppContact } from "@in.pulse-crm/sdk";
import { Logger } from "@in.pulse-crm/utils";
import { ActionDispatch } from "react";
import { toast } from "react-toastify";
import { useAppContext } from "../../app-context";
import useInternalChatContext from "../../internal-context";
import { useWhatsappContext } from "../../whatsapp-context";
import ContactModal from "./(table)/(modal)/contact-modal";
import DeleteContactModal from "./(table)/(modal)/delete-contact-modal";
import contactsReducer, {
  ChangeContactsStateAction,
  ContactsContextState,
  MultipleActions,
} from "./(table)/contacts-reducer";

interface ContactWithCustomer extends WppContact {
  customerId?: number;
  customer?: Customer;
}

interface IContactsProviderProps {
  children: ReactNode;
}

interface IContactsContext {
  state: ContactsContextState;
  dispatch: ActionDispatch<[action: ChangeContactsStateAction | MultipleActions]>;
  deleteContact: (id: number) => void;
  updateContact: (
    id: number,
    name: string,
    sectorIds?: number[],
    customerId?: number,
  ) => Promise<void>;
  loadContacts: () => void;
  createContact: (name: string, phone: string, sectorIds?: number[], customerId?: number) => void;
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
  const { token } = useAuthContext();
  const [state, dispatch] = useReducer(contactsReducer, {
    contacts: [],
    totalRows: 0,
    filters: { page: "1", perPage: "10" },
    isLoading: false,
  });

  const { users } = useInternalChatContext();
  const { openModal, closeModal } = useAppContext();
  const { wppApi } = useWhatsappContext();

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
    async (id: number, name: string, sectorIds?: number[], customerId?: number) => {
      try {
        if (token) {
          await wppApi.current.updateContact(id, name, customerId, sectorIds);
          dispatch({ type: "update-contact", id, name });
          closeModal();
          toast.success("Cliente atualizado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error updating contact", err as Error);
        toast.error("Falha ao atualizar cliente!");
      }
    },
    [token, state],
  );

  const deleteContact = useCallback(
    async (id: number) => {
      try {
        if (token) {
          await wppApi.current.deleteContact(id);
          dispatch({ type: "delete-contact", id });
          /* loadContacts(); */
          toast.success("Contato deletado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error deleting contact", err as Error);
        toast.error("Falha ao deletar cliente!");
      }
    },
    [token, state],
  );

  const createContact = useCallback(
    async (name: string, phone: string, sectorIds?: number[], customerId?: number) => {
      try {
        if (token) {
          const newContact = await wppApi.current.createContact(
            name,
            phone.replace(/\D/g, ""),
            customerId,
            sectorIds,
          );

          dispatch({ type: "add-contact", data: newContact });
          toast.success("Contato criado com sucesso!");
          closeModal();
        }
      } catch (err) {
        Logger.error("Error criar contact", err as Error);
        toast.error("Falha ao atualizar cliente!");
      }
    },
    [token, state],
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
      const response = await wppApi.current.getContactsWithCustomer({
        name: state.filters.name,
        phone: state.filters.phone,
        page: state.filters.page ? Number(state.filters.page) : undefined,
        perPage: state.filters.perPage ? Number(state.filters.perPage) : undefined,
      });
      dispatch({ type: "load-contacts", contacts: response.data as ContactWithCustomer[] });
    } catch (err) {
      Logger.error("Error loading contacts", err as Error);
      toast.error("Falha ao carregar clientes!");
    } finally {
      dispatch({ type: "change-loading", isLoading: false });
    }
  }, [state.filters]);

  useEffect(() => {
    if (!token || !wppApi.current) return;
    wppApi.current.setAuth(token);
  }, [token]);

  useEffect(() => {
    if (token) {
      loadContacts();
    }
  }, [token, state.filters.page, state.filters.perPage, loadContacts]);

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
