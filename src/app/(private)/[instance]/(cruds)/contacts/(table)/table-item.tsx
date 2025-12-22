"use client";

import { WppContact } from "@in.pulse-crm/sdk";
import { Formatter } from "@in.pulse-crm/utils";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton, TableCell, TableRow, Tooltip, Chip } from "@mui/material";
import { CONTACTS_TABLE_COLUMNS } from "./table-config";
import { useContactsContext } from "../contacts-context";

interface ContactWithExtras extends WppContact {
  customerId?: number;
  CLIENTE_ID?: number;
}

interface ContactsTableItemProps {
  contact: ContactWithExtras;
  openEditModalHandler: (c?: ContactWithExtras) => void;
  deleteContactHandler: (c: ContactWithExtras) => void;
}

export default function ContactsTableItem({
  contact,
  openEditModalHandler,
  deleteContactHandler,
}: ContactsTableItemProps) {
  const { customerMap, customerObjectMap } = useContactsContext();

  const safeFormatPhone = (phone: string): string => {
    try {
      return Formatter.phone(phone);
    } catch {
      return phone;
    }
  };

  const customerObj = (contact as any).customer || (contact.customerId ? customerObjectMap.get(contact.customerId) : undefined);
  const customerId: number | null = contact.customerId || contact.CLIENTE_ID || customerObj?.CODIGO || null;
  const customerName: string | undefined = customerObj?.RAZAO || (customerId ? customerMap.get(customerId) : undefined);
  const sectors = contact.sectors ?? [];

  return (
    <TableRow className="even:bg-indigo-700/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
      <TableCell style={{ width: CONTACTS_TABLE_COLUMNS.ID.width }}>{contact.id}</TableCell>
      <TableCell style={{ width: CONTACTS_TABLE_COLUMNS.NAME.width }}>{contact.name}</TableCell>
      <TableCell style={{ width: CONTACTS_TABLE_COLUMNS.PHONE.width }}>
        {safeFormatPhone(contact.phone)}
      </TableCell>
      <TableCell style={{ width: CONTACTS_TABLE_COLUMNS.CUSTOMER.width }}>
        <div className="flex flex-col">
          <span className="text-slate-700 dark:text-slate-300">{customerName || "—"}</span>
          {customerObj?.CODIGO_ERP && (
            <small className="text-slate-400 dark:text-slate-500">ERP: {customerObj.CODIGO_ERP}</small>
          )}
        </div>
      </TableCell>
      <TableCell style={{ width: CONTACTS_TABLE_COLUMNS.SECTORS.width }}>
        <div className="flex flex-wrap gap-1">
          {sectors.length > 0 ? (
            sectors.map((sector, index: number) => (
              <Chip
                key={`${contact.id}-sector-${sector.sectorId}-${index}`}
                label={sector.sectorId}
                size="small"
                variant="outlined"
                color="primary"
              />
            ))
          ) : (
            <span className="text-slate-500 dark:text-slate-400">—</span>
          )}
        </div>
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
