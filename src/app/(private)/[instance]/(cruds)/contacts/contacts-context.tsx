import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
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
  customerMap: Map<number, string>;
  customerObjectMap: Map<number, Customer>;
  sectorMap: Map<number, string>;
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
  const [contactsWithCustomers, setContactsWithCustomers] = useState<ContactWithCustomer[]>([]);
  const [contactSectors, setContactSectors] = useState<
    Map<number, Array<{ contactId: number; sectorId: number }>>
  >(new Map());
  const { users } = useInternalChatContext();
  const { openModal, closeModal } = useAppContext();
  const { wppApi, globalChannel } = useWhatsappContext();

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

  const customerMap = useMemo(() => {
    const map = new Map<number, string>();
    contactsWithCustomers.forEach((contact: any) => {
      if (contact.customerId && contact.customer?.RAZAO) {
        map.set(contact.customerId, contact.customer.RAZAO);
      }
    });
    return map;
  }, [contactsWithCustomers]);

  const customerObjectMap = useMemo(() => {
    const map = new Map<number, Customer>();
    contactsWithCustomers.forEach((contact: ContactWithCustomer) => {
      if (contact.customerId && contact.customer) {
        map.set(contact.customerId, contact.customer);
      }
    });
    return map;
  }, [contactsWithCustomers]);

  const sectorMap = useMemo(() => {
    const map = new Map<number, string>();
    contactSectors.forEach((sectors) => {
      sectors.forEach((sector) => {
        if (sector.sectorId) {
          // Aqui poderíamos ter o nome do setor se viesse da API
          // Por enquanto, armazenaremos apenas o ID
          map.set(sector.sectorId, `Setor ${sector.sectorId}`);
        }
      });
    });
    return map;
  }, [contactSectors]);

  const updateContact = useCallback(
    async (id: number, name: string, sectorIds?: number[], customerId?: number) => {
      try {
        if (token) {
          const updatedContact = await wppApi.current.updateContact(
            id,
            name,
            customerId,
            sectorIds,
          );
          console.log("Updated contact from API:", updatedContact);

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

      // Tentar carregar com clientes; se falhar, fallback para getContacts
      let res: ContactWithCustomer[] = [];
      try {
        const response: unknown = await wppApi.current.getContactsWithCustomer();
        // Verificar se a resposta é um array ou um objeto com array dentro
        const data = Array.isArray(response)
          ? response
          : (response as any)?.data || (response as any)?.contacts || [];
        res = data as ContactWithCustomer[];
        setContactsWithCustomers(res);

        // Extrair setores de cada contato (mantém a estrutura original { contactId, sectorId })
        const sectorsMap = new Map<number, Array<{ contactId: number; sectorId: number }>>();
        res.forEach((contact: ContactWithCustomer) => {
          if (contact.id && contact.sectors && Array.isArray(contact.sectors)) {
            sectorsMap.set(contact.id, contact.sectors);
          }
        });
        setContactSectors(sectorsMap);
      } catch (err) {
        console.warn("Falha ao carregar contatos com clientes, usando getContacts:", err);
        const response: unknown = await wppApi.current.getContacts();
        const data = Array.isArray(response)
          ? response
          : (response as any)?.data || (response as any)?.contacts || [];
        res = data as ContactWithCustomer[];
        setContactsWithCustomers([]);
      }

      // Garantir que res é um array antes de prosseguir
      if (!Array.isArray(res)) {
        res = [];
      }

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
        customerMap,
        customerObjectMap,
        sectorMap,
      }}
    >
      {children}
    </ContactsContext.Provider>
  );
}
