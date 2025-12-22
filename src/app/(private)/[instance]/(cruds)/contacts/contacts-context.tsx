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
  ContactWithSectors,
  ContactsContextState,
  ContactsFilters,
  MultipleActions,
} from "./(table)/contacts-reducer";

interface ContactWithCustomer extends ContactWithSectors {
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
  createContact: (
    name: string,
    phone: string,
    sectorIds?: number[],
    customerId?: number,
  ) => Promise<WppContact | null>;
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
    filters: { page: "1", perPage: "10", sectorIds: [] as ContactsFilters["sectorIds"] },
    isLoading: false,
  });
  const [contactsWithCustomers, /* setContactsWithCustomers */] = useState<ContactWithCustomer[]>([]);
  const [contactSectors, /* setContactSectors */] = useState<
    Map<number, Array<{ contactId: number; sectorId: number }>>
  >(new Map());
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
    [closeModal, token, wppApi],
  );

  const deleteContact = useCallback(
    async (id: number) => {
      try {
        if (token) {
          await wppApi.current.deleteContact(id);
          dispatch({ type: "delete-contact", id });

          toast.success("Contato deletado com sucesso!");
        }
      } catch (err) {
        Logger.error("Error deleting contact", err as Error);
        toast.error("Falha ao deletar cliente!");
      }
    },
    [token, wppApi],
  );

  const createContact = useCallback(
    async (name: string, phone: string, sectorIds?: number[], customerId?: number) => {
      try {
        if (!token) return null;

        const cleanedPhone = phone.replace(/\D/g, "");
        const newContact = await wppApi.current.createContact(
          name,
          cleanedPhone,
          customerId,
          sectorIds,
        );

        dispatch({ type: "add-contact", data: newContact });
        toast.success("Contato criado com sucesso!");
        closeModal();
        return newContact;
      } catch (err) {
        Logger.error("Error criar contact", err as Error);
        toast.error("Falha ao atualizar cliente!");
        return null;
      }
    },
    [closeModal, token, wppApi],
  );

  const openContactModal = useCallback(
    (contact?: WppContact) => {
      openModal(<ContactModal contact={contact} />);
    },
    [openModal],
  );

  const handleDeleteContact = useCallback(
    (contact: WppContact) => {
      openModal(<DeleteContactModal contact={contact} />);
    },
    [deleteContact, openModal],
  );

  const getSearchValue = (value: string | undefined, key?: string) => {
    if (!value) return "";
    switch (key) {
      case "nome":
        return value.toLocaleLowerCase().trim().replace(/\s+/g, " ");
      case "telefone":
        return value.replace(/\D/g, "");
      case "cpf-cnpj":
        return value.replace(/\D/g, "");
      case "razao-social":
        return value.toLocaleLowerCase().replaceAll(" ", "");
      case "codigo-erp":
        return value;
      default:
        return "";
    }
  };

  const loadContacts = useCallback(async () => {
    try {
      dispatch({ type: "change-loading", isLoading: true });

      const params: any = {};

      if (state.filters.page) params.page = Number(state.filters.page);
      if (state.filters.perPage) params.perPage = Number(state.filters.perPage);

      if (state.filters.sectorIds && state.filters.sectorIds.length > 0) {
        params.sectorIds = state.filters.sectorIds.join(",");
      }

      const sanitizedTerm = getSearchValue(state.filters.searchTerm, state.filters.searchField);

      if (sanitizedTerm) {
        switch (state.filters.searchField) {
          case "nome":
            params.name = sanitizedTerm;
            break;
          case "telefone":
            params.phone = sanitizedTerm;
            break;
          case "codigo":
            params.customerId = parseInt(sanitizedTerm) || undefined;
            break;
          case "codigo-erp":
            params.customerErp = sanitizedTerm;
            break;
          case "cpf-cnpj":
            params.customerCnpj = sanitizedTerm;
            break;
          case "razao-social":
            params.customerName = sanitizedTerm;
            break;
          default:
            break;
        }
      } else {
        const phoneFilter = (state.filters.phone || "").replace(/\D/g, "");
        if (state.filters.id) params.id = Number(state.filters.id);
        if (state.filters.name) params.name = state.filters.name;
        if (phoneFilter) params.phone = phoneFilter;
        if (state.filters.customerName) params.customerName = state.filters.customerName;
        if (state.filters.customerId) params.customerId = Number(state.filters.customerId);
      }

      let response: any;


      if (params.id !== undefined) {
        const entries = Object.entries(params).filter(([, v]) => v !== undefined);
        const searchParams = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
        const url = `/api/whatsapp/contacts/customer${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
        const res = await wppApi.current.ax.get(url);
        response = res.data;
      } else {
        response = await wppApi.current.getContactsWithCustomer(params as any);
      }

      const totalRows = response?.pagination?.total ?? (response?.data?.length || 0);

      dispatch({
        type: "load-contacts",
        contacts: response.data as ContactWithCustomer[],
        totalRows,
      });
    } catch (err) {
      Logger.error("Error loading contacts", err as Error);
      toast.error("Falha ao carregar clientes!");
    } finally {
      dispatch({ type: "change-loading", isLoading: false });
    }
  }, [state.filters, wppApi]);

  useEffect(() => {
    if (!token || !wppApi.current) return;
    wppApi.current.setAuth(token);
  }, [token, wppApi]);

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
