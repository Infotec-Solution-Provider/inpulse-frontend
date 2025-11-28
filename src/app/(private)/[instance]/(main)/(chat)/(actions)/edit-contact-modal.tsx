import { Button, IconButton, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../../app-context";
import { DetailedChat, WhatsappContext } from "../../../whatsapp-context";
import { toast } from "react-toastify";
import SelectCustomerInput from "@/lib/components/select-customer-input";
import { Customer } from "@in.pulse-crm/sdk";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";

export default function EditContactModal() {
  const { closeModal } = useContext(AppContext);
  const { wppApi, currentChat, updateChatContact } = useContext(WhatsappContext);
  const chat: DetailedChat = currentChat! as DetailedChat;

  const [name, setName] = useState(chat!.contact!.name);
  const [customer, setCustomer] = useState<Customer | null>(chat.customer);

  const handleEditContact = async () => {
    if (!currentChat || !wppApi.current || !chat.contact) return;
    const { contact } = chat;
    try {
      await wppApi.current.updateContact(contact.id, name, customer?.CODIGO || null);

      toast.success("Contato atualizado com sucesso!");
      updateChatContact(contact.id, name, customer);
      closeModal();
    } catch (err) {
      toast.error(sanitizeErrorMessage(err));
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentChat?.chatType !== "wpp") {
      closeModal();
    }
  }, [currentChat]);

  return (
    <div className="w-[26rem] rounded-md bg-white px-4 py-4 text-gray-800 dark:bg-slate-800 dark:text-white">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Editar contato</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <form className="flex flex-col gap-6">
        <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Whatsapp" defaultValue={chat!.contact!.phone} disabled />
        <SelectCustomerInput defaultValue={chat.customer} onChange={(c) => setCustomer(c)} />
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="contained"
            color="secondary"
            className="w-32"
            onClick={closeModal}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="contained"
            color="primary"
            className="w-32"
            onClick={handleEditContact}
          >
            SALVAR
          </Button>
        </div>
      </form>
    </div>
  );
}
