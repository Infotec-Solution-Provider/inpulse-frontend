import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { useAuthContext } from "@/app/auth-context";
import { Customer, WppContact } from "@/lib/sdk-local";
import { getContactRegistrationConflict } from "@/lib/utils/contact-registration-conflict";
import { Logger } from "@in.pulse-crm/utils";
import { ActionDispatch } from "react";
import { toast } from "react-toastify";
import { usePathname } from "next/navigation";
import { readRequestLimitMessage } from "@/lib/utils/read-request-limit";
import { useAppContext } from "../../app-context";
import useInternalChatContext from "../../internal-context";
import { useWhatsappContext } from "../../whatsapp-context";
import ContactModal from "./(table)/(modal)/contact-modal";
import DeleteContactModal from "./(table)/(modal)/delete-contact-modal";
import ContactRegistrationConflictModal from "./(table)/(modal)/contact-registration-conflict-modal";
import LinkCustomerModal from "./(table)/(modal)/link-customer-modal";
import { buildContactsQuery, contactPageAfterLoad } from "./contacts-query";
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
  openLinkCustomerModal: (contact: WppContact) => void;
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
  const pathname = usePathname();
  const { token } = useAuthContext();
  const [state, dispatch] = useReducer(contactsReducer, {
    contacts: [],
    totalRows: 0,
    filters: { page: "1", perPage: "10", sectorIds: [] as ContactsFilters["sectorIds"] },
    isLoading: false,
  });
  const [contactsWithCustomers /* setContactsWithCustomers */] = useState<ContactWithCustomer[]>(
    [],
  );
  const [contactSectors /* setContactSectors */] = useState<
    Map<number, Array<{ contactId: number; sectorId: number }>>
  >(new Map());
  const { users } = useInternalChatContext();
  const { openModal, closeModal } = useAppContext();
  const { wppApi } = useWhatsappContext();
  const loadSequence = useRef(0);

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
          const result = await wppApi.current.deleteContact(id);
          if (result.outcome === "EXECUTED") {
            dispatch({ type: "delete-contact", id });
            toast.success("Contato deletado com sucesso!");
          } else {
            toast.success("Solicitação de exclusão enviada ao supervisor!");
          }
        }
      } catch (err) {
        Logger.error("Error deleting contact", err as Error);
        toast.error("Falha ao deletar cliente!");

        throw err;
      }
    },
    [token, wppApi],
  );

  const createContact = useCallback(
    async (name: string, phone: string, sectorIds?: number[], customerId?: number) => {
      const cleanedPhone = phone.replace(/\D/g, "");
      try {
        if (!token) return null;

        const newContact = await wppApi.current.createContact(
          name,
          cleanedPhone,
          customerId,
          sectorIds,
        );

        dispatch({ type: "upsert-contact", data: newContact });
        toast.success("Contato cadastrado com sucesso!");
        closeModal();
        return newContact;
      } catch (err) {
        const conflict = getContactRegistrationConflict(err);
        if (conflict?.existingContact) {
          const proposal = {
            name,
            customerId: customerId ?? null,
            sectorIds: sectorIds ?? [],
          };
          openModal(
            <ContactRegistrationConflictModal
              conflict={conflict}
              onCancel={closeModal}
              onConfirm={async () => {
                try {
                  if (conflict.existingContact.isDeleted) {
                    const result = await wppApi.current.reactivateContact(
                      conflict.existingContact.id,
                      proposal,
                    );
                    if (result.outcome === "EXECUTED") {
                      dispatch({ type: "upsert-contact", data: result.contact });
                      toast.success("Contato reativado e atualizado com sucesso!");
                    } else {
                      toast.success("Solicitação enviada ao supervisor!");
                    }
                  } else {
                    const updated = await wppApi.current.createContact(
                      name,
                      cleanedPhone,
                      customerId,
                      sectorIds,
                      true,
                    );
                    dispatch({ type: "upsert-contact", data: updated });
                    toast.success("Cadastro sobrescrito com sucesso!");
                  }
                  closeModal();
                } catch (confirmationError) {
                  Logger.error("Error resolving contact conflict", confirmationError as Error);
                  toast.error(
                    (confirmationError as Error).message || "Falha ao processar cadastro.",
                  );
                  throw confirmationError;
                }
              }}
            />,
          );
          return null;
        }
        Logger.error("Error criar contact", err as Error);
        toast.error((err as Error).message || "Falha ao cadastrar contato!");
        return null;
      }
    },
    [closeModal, openModal, token, wppApi],
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

  const loadContacts = useCallback(async () => {
    const sequence = ++loadSequence.current;
    try {
      dispatch({ type: "change-loading", isLoading: true });
      const params = buildContactsQuery(state.filters);
      // The shared SDK omits sectorIds; preserve every active filter in this list.
      const searchParams = new URLSearchParams(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
      );
      const { data: response } = await wppApi.current.ax.get(
        `/api/whatsapp/contacts/customer?${searchParams}`,
      );
      if (sequence !== loadSequence.current) return;
      const totalRows = Number(response?.pagination?.total ?? response?.data?.length ?? 0);
      const page = Number(state.filters.page || 1);
      const availablePage = contactPageAfterLoad(
        page,
        Number(state.filters.perPage || 10),
        totalRows,
      );
      if (availablePage !== page) {
        dispatch({ type: "change-page", page: availablePage - 1 });
        return;
      }

      dispatch({
        type: "load-contacts",
        contacts: response.data as ContactWithCustomer[],
        totalRows,
      });
    } catch (err) {
      if (sequence !== loadSequence.current) return;
      Logger.error("Error loading contacts", err as Error);
      if (!readRequestLimitMessage(err)) toast.error("Falha ao carregar contatos!");
    } finally {
      if (sequence === loadSequence.current) dispatch({ type: "change-loading", isLoading: false });
    }
  }, [state.filters, wppApi]);

  const openLinkCustomerModal = useCallback(
    (contact: WppContact) => {
      openModal(<LinkCustomerModal contact={contact} onLinked={loadContacts} />);
    },
    [openModal, loadContacts],
  );

  useEffect(() => {
    if (!token || !wppApi.current) return;
    wppApi.current.setAuth(token);
  }, [token, wppApi]);

  useEffect(() => {
    if (token && pathname.endsWith("/contacts")) {
      loadContacts();
    }
    return () => {
      loadSequence.current++;
    };
  }, [token, pathname, state.filters.page, state.filters.perPage, loadContacts]);

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
        openLinkCustomerModal,
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
