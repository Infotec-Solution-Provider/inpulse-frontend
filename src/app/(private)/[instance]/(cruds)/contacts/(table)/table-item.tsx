"use client";

import { WppContact } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton, TableCell, TableRow, Tooltip } from "@mui/material";
import { CONTACTS_TABLE_COLUMNS } from "./table-config";

interface ContactsTableItemProps {
  contact: WppContact;
  openEditModalHandler: (c?: WppContact) => void;
  deleteContactHandler: (c: WppContact) => void;
}

export default function ContactsTableItem({
  contact,
  openEditModalHandler,
  deleteContactHandler,
}: ContactsTableItemProps) {
  const safeFormatPhone = (phone: string) => {
    try {
      return Formatter.phone(phone);
    } catch {
      return phone;
    }
  };

  return (
    <TableRow className="even:bg-indigo-700/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
      <TableCell style={{ width: CONTACTS_TABLE_COLUMNS.ID.width }}>{contact.id}</TableCell>
      <TableCell style={{ width: CONTACTS_TABLE_COLUMNS.NAME.width }}>{contact.name}</TableCell>
      <TableCell style={{ width: CONTACTS_TABLE_COLUMNS.PHONE.width }}>
        {safeFormatPhone(contact.phone)}
      </TableCell>
      <TableCell style={{ width: CONTACTS_TABLE_COLUMNS.ACTIONS.width }} align="right">
        <div className="flex items-center justify-end gap-1">
          <Tooltip title="Editar">
            <IconButton onClick={() => openEditModalHandler(contact)} size="small" color="primary">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir">
            <IconButton onClick={() => deleteContactHandler(contact)} size="small" color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
