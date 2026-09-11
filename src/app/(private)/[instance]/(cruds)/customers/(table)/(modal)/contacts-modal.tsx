import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { ContactRegistrationConflict, Customer, WppContact } from "@/lib/sdk-local";
import { Button, IconButton, TextField } from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import ContactItem from "./contact-item";
import { toast } from "react-toastify";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { Add, Close } from "@mui/icons-material";
import { AppContext } from "@/app/(private)/[instance]/app-context";
import { getContactRegistrationConflict } from "@/lib/utils/contact-registration-conflict";
import ContactRegistrationConflictModal from "../../../contacts/(table)/(modal)/contact-registration-conflict-modal";

interface ContactModalProps {
  customer: Customer;
}

export default function ContactsModal({ customer }: ContactModalProps) {
  const { closeModal } = useContext(AppContext);
  const { wppApi, updateChatContact } = useContext(WhatsappContext);
  const [contacts, setContacts] = useState<WppContact[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationConflict, setRegistrationConflict] =
    useState<ContactRegistrationConflict | null>(null);
  const [filter, setFilter] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  const filteredContacts = useMemo(() => {
    const arr: WppContact[] = [];
    const hasNameFilter = filter.name.trim() !== "";
    const hasPhoneFilter = filter.phone.trim() !== "";

    if (!hasNameFilter && !hasPhoneFilter) {
      return contacts;
    }

    for (const contact of contacts) {
      const conditions = [];

      if (hasNameFilter) {
        conditions.push(contact.name.toLowerCase().includes(filter.name.toLowerCase()));
      }
      if (hasPhoneFilter) {
        conditions.push(contact.phone.includes(filter.phone));
      }

      if (conditions.every((condition) => condition)) {
        arr.push(contact);
      }
    }

    return arr;
  }, [filter, contacts]);

  const isFormValid = form.name.length > 0 && form.phone.length >= 10 && form.phone.length <= 15;

  useEffect(() => {
    if (wppApi.current) {
      wppApi.current.getCustomerContacts(customer?.CODIGO).then((data) => {
        setContacts(data);
      });
    }
  }, []);

  const handleEdit = useCallback(async (updatedContact: WppContact) => {
    if (wppApi.current) {
      try {
        await wppApi.current.updateContact(updatedContact.id, updatedContact.name);
        toast.success("Contato atualizado com sucesso!");
        setContacts((prevContacts) =>
          prevContacts.map((c) => (c.id === updatedContact.id ? updatedContact : c)),
        );
        updateChatContact(updatedContact.id, updatedContact.name, customer);
      } catch (err) {
        toast.error("Falha ao atualizar contato:\n" + sanitizeErrorMessage(err));
      }
    }
  }, []);

  const handleDelete = useCallback(async (contactId: number) => {
    if (wppApi.current) {
      try {
        const result = await wppApi.current.deleteContact(contactId);
        if (result.outcome === "EXECUTED") {
          toast.success("Contato deletado com sucesso!");
          setContacts((prevContacts) => prevContacts.filter((c) => c.id !== contactId));
        } else {
          toast.success("Solicitação de exclusão enviada ao supervisor!");
        }
      } catch (err) {
        toast.error("Falha ao deletar contato:\n" + sanitizeErrorMessage(err));
      }
    }
  }, []);

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, name: e.target.value });
  };

  const handleChangePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, phone: e.target.value.replace(/\D/g, "") });
  };

  const updateRegisteredContact = (registeredContact: WppContact) => {
    setContacts((prevContacts) =>
      prevContacts.some((contact) => contact.id === registeredContact.id)
        ? prevContacts.map((contact) =>
            contact.id === registeredContact.id ? registeredContact : contact,
          )
        : [...prevContacts, registeredContact],
    );
    updateChatContact(registeredContact.id, registeredContact.name, customer);
  };

  const handleClickRegister = async () => {
    if (!wppApi.current || isRegistering || !isFormValid) return;

    setIsRegistering(true);
    try {
      const registeredContact = await wppApi.current.createContact(
        form.name,
        form.phone,
        customer.CODIGO,
      );
      updateRegisteredContact(registeredContact);
      setForm({ name: "", phone: "" });
      toast.success("Contato cadastrado no cliente com sucesso!");
    } catch (error) {
      const conflict = getContactRegistrationConflict(error);
      if (conflict) {
        setRegistrationConflict(conflict);
        return;
      }
      toast.error("Falha ao cadastrar contato:\n" + sanitizeErrorMessage(error));
    } finally {
      setIsRegistering(false);
    }
  };

  if (registrationConflict) {
    return (
      <ContactRegistrationConflictModal
        conflict={registrationConflict}
        onCancel={() => setRegistrationConflict(null)}
        onConfirm={async () => {
          if (registrationConflict.existingContact.isDeleted) {
            const result = await wppApi.current.reactivateContact(
              registrationConflict.existingContact.id,
              {
                name: form.name,
                customerId: customer.CODIGO,
                sectorIds: [],
              },
            );
            if (result.outcome === "EXECUTED") {
              updateRegisteredContact(result.contact);
              toast.success("Contato reativado e atualizado com sucesso!");
            } else {
              toast.success("Solicitação enviada ao supervisor!");
            }
          } else {
            const registeredContact = await wppApi.current.createContact(
              form.name,
              form.phone,
              customer.CODIGO,
              [],
              true,
            );
            updateRegisteredContact(registeredContact);
            toast.success("Cadastro sobrescrito com sucesso!");
          }
          setForm({ name: "", phone: "" });
          setRegistrationConflict(null);
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
      <header className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-700">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
          Contatos de &quot;{customer.RAZAO}&quot;
        </h1>
        <IconButton
          onClick={closeModal}
          className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Close />
        </IconButton>
      </header>

      {/* Lista de contatos */}
      <div className="mb-6">
        <div className="mb-2 flex flex-wrap gap-3 rounded-md bg-slate-50 p-2 dark:bg-slate-700">
          <TextField
            variant="outlined"
            placeholder="Filtrar por nome..."
            size="small"
            value={filter.name}
            onChange={(e) => setFilter((prev) => ({ ...prev, name: e.target.value }))}
            className="w-56 bg-white dark:bg-slate-600"
            sx={{
              "& .MuiOutlinedInput-root": {
                fontSize: "0.875rem",
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
          />
          <TextField
            variant="outlined"
            placeholder="Filtrar por telefone..."
            size="small"
            value={filter.phone}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))
            }
            className="w-56 bg-white dark:bg-slate-600"
            sx={{
              "& .MuiOutlinedInput-root": {
                fontSize: "0.875rem",
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
          />
        </div>
        <div className="scrollbar-whatsapp h-[350px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600">
          {filteredContacts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">
              Nenhum contato encontrado
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-600">
              {filteredContacts.map((c) => (
                <ContactItem
                  key={c.id}
                  contact={c}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Adicionar novo contato */}
      <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700">
        <h2 className="mb-4 text-lg font-medium text-slate-700 dark:text-slate-300">
          Adicionar Novo Contato
        </h2>
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <TextField
            label="Nome"
            placeholder="João Silva"
            onChange={handleChangeName}
            value={form.name}
            disabled={isRegistering}
            variant="outlined"
            className="flex-1 bg-white dark:bg-slate-600"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
          />
          <TextField
            label="WhatsApp"
            placeholder="5511999999999"
            onChange={handleChangePhone}
            value={form.phone}
            disabled={isRegistering}
            variant="outlined"
            className="flex-1 bg-white dark:bg-slate-600"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
              },
            }}
          />
          <Button
            variant="contained"
            disabled={!isFormValid || isRegistering}
            onClick={handleClickRegister}
            className="bg-indigo-600 px-6 py-3 hover:bg-indigo-700"
            startIcon={<Add />}
          >
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
