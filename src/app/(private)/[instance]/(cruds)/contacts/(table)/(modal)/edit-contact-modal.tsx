import { Button, IconButton, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import { useRef } from "react";
import { useAppContext } from "@/app/(private)/[instance]/app-context";
import { useContactsContext } from "../../contacts-context";
import { WppContact } from "@in.pulse-crm/sdk";

export interface EditContactModalProps {
  contact: WppContact;
}

type EditContactPayload = {
  name: string;
};

const validateKey: Record<keyof EditContactPayload, (value: unknown) => boolean> = {
  name: (value) => !!value && typeof value === "string" && value.length <= 100,
};

export default function EditContactModal({ contact }: EditContactModalProps) {
  const { closeModal } = useAppContext();
  const { updateContact,loadContacts } = useContactsContext();

  const formRef = useRef<EditContactPayload>({
    name: contact.name,
  });

  const validateForm = (data: EditContactPayload) => {
    const invalidKeys: (keyof EditContactPayload)[] = [];

    for (const key in data) {
      const value = data[key as keyof EditContactPayload];
      const isValid = validateKey[key as keyof EditContactPayload](value);

      if (!isValid) {
        invalidKeys.push(key as keyof EditContactPayload);
      }
    }

    if (invalidKeys.length > 0) {
      toast.error(
        `Por favor, preencha corretamente o campo:\n- ${invalidKeys.join("\n- ")}`,
      );
      return false;
    }

    return true;
  };

  const onClickSave = async () => {
    if (validateForm(formRef.current)) {
     await  updateContact(contact.id, formRef.current.name);
     loadContacts();
      closeModal();
    }
  };

  return (
    <aside className="flex h-full w-full flex-col items-center gap-4 bg-white p-4 dark:bg-slate-800">
      <header className="flex text-lg w-full font-semibold items-center justify-between py-2 text-slate-800 dark:text-white">
        <h1>Editar contato</h1>
        <IconButton onClick={closeModal}>
          <CloseIcon />
        </IconButton>
      </header>

      <TextField
        fullWidth
        label="Nome"
        name="name"
        type="text"
        id="name"
        defaultValue={contact.name}
        required
        onChange={(e) => {
          formRef.current = { ...formRef.current, name: e.target.value };
        }}
      />

      <div className="flex w-full justify-end gap-4">
        <Button color="error" onClick={closeModal}>
          Cancelar
        </Button>
        <Button onClick={onClickSave}>Salvar</Button>
      </div>
    </aside>
  );
}


