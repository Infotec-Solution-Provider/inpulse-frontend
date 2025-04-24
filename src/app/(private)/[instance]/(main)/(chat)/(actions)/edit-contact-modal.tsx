import { Button, IconButton, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useContext, useState } from "react";
import { AppContext } from "../../../app-context";
import { WhatsappContext } from "../../../whatsapp-context";
import { toast } from "react-toastify";
/* 
interface FinishChatModalProps {
  contactId: number;
} */

export default function EditContactModal() {
  const { closeModal } = useContext(AppContext);
  const { wppApi, currentChat, updateChatContact } = useContext(WhatsappContext);
  const [name, setName] = useState(currentChat!.contact!.name);

  const handleEditContact = async () => {
    if (!currentChat || !wppApi.current || !currentChat.contact) return;
    const { contact } = currentChat;
    await wppApi.current.updateContact(contact.id, name);
    toast.success("Contato atualizado com sucesso!");
    updateChatContact(contact.id, name);
    closeModal();
  };

  return (
    <div className="w-[26rem] rounded-md bg-slate-700 px-4 py-4">
      <header className="flex items-center justify-between pb-8">
        <h1 className="text-xl">Editar contato</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>
      <form className="flex flex-col gap-6">
        <TextField
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField label="Whatsapp" defaultValue={currentChat!.contact!.phone} disabled />
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
            Finalizar
          </Button>
        </div>
      </form>
    </div>
  );
}
