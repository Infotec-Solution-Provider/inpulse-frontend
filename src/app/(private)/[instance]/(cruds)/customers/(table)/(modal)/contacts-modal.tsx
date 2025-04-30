import { WhatsappContext } from "@/app/(private)/[instance]/whatsapp-context";
import { Customer, WppContact } from "@in.pulse-crm/sdk";
import { Button, IconButton, TextField } from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import ContactItem from "./contact-item";
import { toast } from "react-toastify";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { Add, Close } from "@mui/icons-material";
import { AppContext } from "@/app/(private)/[instance]/app-context";

interface ContactModalProps {
  customer: Customer;
}

export default function ContactsModal({ customer }: ContactModalProps) {
  const { closeModal } = useContext(AppContext);
  const { wppApi, updateChatContact } = useContext(WhatsappContext);
  const [contacts, setContacts] = useState<WppContact[]>([]);
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
      wppApi.current.getCustomerContacts(customer.CODIGO).then((data) => {
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
        updateChatContact(updatedContact.id, updatedContact.name);
      } catch (err) {
        toast.error("Falha ao atualizar contato:\n" + sanitizeErrorMessage(err));
      }
    }
  }, []);

  const handleDelete = useCallback(async (contactId: number) => {
    if (wppApi.current) {
      try {
        await wppApi.current.deleteContact(contactId);
        toast.success("Contato deletado com sucesso!");
        // Remove the contact from the state
        setContacts((prevContacts) => prevContacts.filter((c) => c.id !== contactId));
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

  const handleClickRegister = () => {
    if (wppApi.current) {
      wppApi.current
        .createContact(form.name, form.phone, customer.CODIGO)
        .then((newContact) => {
          setContacts((prevContacts) => [...prevContacts, newContact]);
          setForm({ name: "", phone: "" });
          toast.success("Contato cadastrado com sucesso!");
        })
        .catch((error) => {
          toast.error("Falha ao cadastrar contato:\n" + sanitizeErrorMessage(error));
        });
    }
  };

  return (
    <div className="rounded-md bg-slate-800 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="max-w-80 truncate">Contatos de &quot;{customer.RAZAO}&quot;</h1>
        <IconButton onClick={closeModal}>
          <Close />
        </IconButton>
      </header>
      <div className="mb-2 flex items-center gap-2 py-2">
        <TextField
          variant="standard"
          label="Nome"
          className="w-64 px-1 font-bold"
          value={filter.name}
          onChange={(e) => setFilter((prev) => ({ ...prev, name: e.target.value }))}
        />
        <TextField
          variant="standard"
          label="Telefone"
          className="w-64 px-1 font-bold"
          value={filter.phone}
          onChange={(e) =>
            setFilter((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, "") }))
          }
        />
        <p className="w-32"></p>
      </div>
      <ul className="max-h-[20rem] overflow-y-auto">
        {filteredContacts.map((c) => (
          <ContactItem key={c.id} contact={c} handleEdit={handleEdit} handleDelete={handleDelete} />
        ))}
      </ul>
      <div className="pt-4">
        <h2 className="mb-4">Adicionar Contato</h2>
        <form className="flex items-center gap-2">
          <TextField
            label="Nome"
            placeholder="John Doe"
            onChange={handleChangeName}
            value={form.name}
            className="w-64"
          />
          <TextField
            label="WhatsApp"
            placeholder="551100000000"
            onChange={handleChangePhone}
            value={form.phone}
            className="w-64"
          />

          <Button
            variant="contained"
            sx={{ height: "3.5rem" }}
            disabled={!isFormValid}
            onClick={handleClickRegister}
            className="!ml-auto"
          >
            <Add />
          </Button>
        </form>
      </div>
    </div>
  );
}
