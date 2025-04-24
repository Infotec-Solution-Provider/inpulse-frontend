import { WppContact } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import { Cancel, Delete, Edit, Save } from "@mui/icons-material";
import { IconButton, TextField } from "@mui/material";
import { useState } from "react";

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
    const { value } = event.target;
    setState((prevState) => ({ ...prevState, phone: value }));
  };

  return (
    <li className="mb-4 flex items-center gap-2">
      <TextField
        defaultValue={contact.name}
        className="w-64"
        disabled={!state.isEditing}
        onChange={handleChangeName}
      />
      <TextField
        value={Formatter.phone(contact.phone)}
        className="pointer-events-none w-64"
        disabled={!state.isEditing}
        onChange={handleChangePhone}
      />
      <div className="flex items-center">
        <IconButton
          aria-hidden={state.isEditing}
          onClick={onClickEdit}
          className="aria-hidden:hidden"
        >
          <Edit />
        </IconButton>
        <IconButton
          aria-hidden={!state.isEditing}
          onClick={onClickCancel}
          className="aria-hidden:hidden"
          color="warning"
        >
          <Cancel />
        </IconButton>
        <IconButton
          aria-hidden={!state.isEditing}
          onClick={onClickSave}
          className="aria-hidden:hidden"
          color="success"
        >
          <Save />
        </IconButton>

        <IconButton
          aria-hidden={state.isEditing}
          onClick={onClickDelete}
          className="aria-hidden:hidden"
          color="error"
        >
          <Delete />
        </IconButton>
      </div>
    </li>
  );
}
