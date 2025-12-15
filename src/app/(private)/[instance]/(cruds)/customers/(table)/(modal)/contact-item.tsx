import { WppContact } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { Cancel, Delete, Edit, Save } from "@mui/icons-material";
import { IconButton, TextField } from "@mui/material";
import { useMemo, useState } from "react";

export default function ContactItem({
  contact,
  handleEdit,
  handleDelete,
}: {
  contact: WppContact;
  handleEdit: (updatedContact: WppContact) => void;
  handleDelete: (contactId: number) => void;
}) {
  const [state, setState] = useState({
    isEditing: false,
    name: contact.name,
    phone: contact.phone,
  });

  const onClickSave = () => {
    setState({ ...state, isEditing: false });
    handleEdit({ ...contact, name: state.name, phone: state.phone });
  };

  const onClickEdit = () => {
    setState({ ...state, isEditing: true });
  };

  const onClickCancel = () => {
    setState({ ...state, isEditing: false });
  };

  const onClickDelete = () => {
    handleDelete(contact.id);
  };

  const handleChangeName = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setState((prevState) => ({ ...prevState, name: value }));
  }

  const handleChangePhone = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = event.target.value.replace(/\D/g, "");
    setState((prevState) => ({ ...prevState, phone: digitsOnly }));
  };

  const formattedPhone = useMemo(() => {
    if (!state.phone) return "";
    try {
      return Formatter.phone(state.phone);
    } catch {
      return state.phone;
    }
  }, [state.phone]);

  return (
    <li className="flex items-center gap-4 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-600">
      <div className="flex flex-1 gap-4">
        <TextField
          value={state.name}
          variant="outlined"
          size="small"
          disabled={!state.isEditing}
          onChange={handleChangeName}
          placeholder="Nome do contato"
          className="flex-1 bg-white dark:bg-slate-700"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
            },
            "& .Mui-disabled": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgb(30 41 59)" : "rgb(249 250 251)",
            },
          }}
        />
        <TextField
          value={state.isEditing ? state.phone : formattedPhone}
          variant="outlined"
          size="small"
          disabled={!state.isEditing}
          onChange={handleChangePhone}
          placeholder="Número do WhatsApp"
          className="flex-1 bg-white dark:bg-slate-700"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgb(51 65 85)" : "white",
            },
            "& .Mui-disabled": {
              backgroundColor: (theme) =>
                theme.palette.mode === "dark" ? "rgb(30 41 59)" : "rgb(249 250 251)",
            },
          }}
        />
      </div>

      <div className="flex items-center gap-1">
        {!state.isEditing ? (
          <>
            <IconButton
              onClick={onClickEdit}
              size="small"
              className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
              title="Editar contato"
            >
              <Edit fontSize="small" />
            </IconButton>
            <IconButton
              onClick={onClickDelete}
              size="small"
              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              title="Excluir contato"
            >
              <Delete fontSize="small" />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton
              onClick={onClickSave}
              size="small"
              className="text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
              title="Salvar alterações"
            >
              <Save fontSize="small" />
            </IconButton>
            <IconButton
              onClick={onClickCancel}
              size="small"
              className="text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
              title="Cancelar edição"
            >
              <Cancel fontSize="small" />
            </IconButton>
          </>
        )}
      </div>
    </li>
  );
}
