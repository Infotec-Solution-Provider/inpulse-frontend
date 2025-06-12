import { Button, IconButton, TextField } from "@mui/material";
import { toast } from "react-toastify";
import { useRef } from "react";
import CloseIcon from "@mui/icons-material/Close";

import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { useContactsContext } from "../../contacts-context";

export default function CreateContactModal() {
  const { closeModal } = useAppContext();
  const { createContact } = useContactsContext();

  const formRef = useRef<{ name: string; phone: string }>({
    name: "",
    phone: "",
  });

  const handleSubmit = async () => {
    const { name, phone } = formRef.current;

    if (!name || !phone) {
      toast.error("Nome e telefone são obrigatórios!");
      return;
    }

    await createContact(name, phone);
    closeModal();
  };

  return (
    <aside className="flex h-full w-full flex-col items-center gap-4 bg-white p-4 dark:bg-slate-800">
      <header className="flex text-lg w-full font-semibold font-medium items-center justify-between py-2 text-slate-800 dark:text-white">
        Cadastrar Contato
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>

      <div className="flex w-full flex-col gap-4">
        <TextField
          fullWidth
          label="Nome"
          id="name"
          onChange={(e) => {
            formRef.current = { ...formRef.current, name: e.target.value };
          }}
        />
        <TextField
          fullWidth
          label="Telefone"
          id="phone"
          onChange={(e) => {
            formRef.current = { ...formRef.current, phone: e.target.value };
          }}
        />
      </div>

      <div className="flex w-full flex-row items-center justify-end gap-4 mt-4">
        <Button color="error" onClick={closeModal}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>Cadastrar</Button>
      </div>
    </aside>
  );
}
