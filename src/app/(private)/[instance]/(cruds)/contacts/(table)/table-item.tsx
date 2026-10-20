"use client";
import { Button as CrmDeleteButton } from "@mui/material";

import { WppContact } from "@/lib/sdk-local";
import { Formatter } from "@in.pulse-crm/utils";
import { Delete as DeleteIcon } from "@/lib/ui-system/crm-icons";
import { Edit as EditIcon } from "@/lib/ui-system/crm-icons";
import { Button, IconButton, TableCell, TableRow, Tooltip, Chip } from "@mui/material";
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
  const { customerMap, customerObjectMap, openLinkCustomerModal } = useContactsContext();

  const safeFormatPhone = (phone: string): string => {
    try {
      return Formatter.phone(phone);
    } catch {
      return phone;
    }
  };

  const customerObj =
    (contact as any).customer ||
    (contact.customerId ? customerObjectMap.get(contact.customerId) : undefined);
  const customerId: number | null =
    contact.customerId || contact.CLIENTE_ID || customerObj?.CODIGO || null;
  const customerName: string | undefined =
    customerObj?.RAZAO || (customerId ? customerMap.get(customerId) : undefined);
  const sectors = contact.sectors ?? [];

  return (
    <TableRow hover>
      <TableCell data-label="Código" style={{ width: CONTACTS_TABLE_COLUMNS.ID.width }}>
        {contact.id}
      </TableCell>
      <TableCell data-label="Nome" style={{ width: CONTACTS_TABLE_COLUMNS.NAME.width }}>
        {contact.name}
      </TableCell>
      <TableCell data-label="Telefone" style={{ width: CONTACTS_TABLE_COLUMNS.PHONE.width }}>
        {safeFormatPhone(contact.phone)}
      </TableCell>
      <TableCell data-label="Cliente" style={{ width: CONTACTS_TABLE_COLUMNS.CUSTOMER.width }}>
        <div className="flex flex-col">
          <span className="text-[var(--ip-text)]">
            {customerName ||
              (customerId
                ? `Cliente ${customerId} · dados indisponíveis`
                : "Sem cliente vinculado")}
          </span>
          {contact.customerId == null && !contact.CLIENTE_ID && !customerObj && (
            <Button
              size="small"
              onClick={() => openLinkCustomerModal(contact)}
              sx={{ alignSelf: "flex-start", paddingLeft: 0 }}
            >
              Vincular cliente
            </Button>
          )}
          {customerObj?.CODIGO_ERP && (
            <small className="text-[var(--ip-muted)]">ERP: {customerObj.CODIGO_ERP}</small>
          )}
        </div>
      </TableCell>
      <TableCell data-label="Setores" style={{ width: CONTACTS_TABLE_COLUMNS.SECTORS.width }}>
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
            <span className="text-[var(--ip-muted)]">—</span>
          )}
        </div>
      </TableCell>
      <TableCell
        data-label="Ações"
        style={{ width: CONTACTS_TABLE_COLUMNS.ACTIONS.width }}
        align="right"
      >
        <div className="flex items-center justify-end gap-1">
          <Tooltip title="Editar" aria-label="Editar">
            <IconButton
              aria-label="Editar"
              onClick={() => openEditModalHandler(contact)}
              size="small"
              color="primary"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Excluir" aria-label="Excluir">
            <CrmDeleteButton
              aria-label="Excluir contato"
              size="small"
              color="error"
              onClick={() => deleteContactHandler(contact)}
            >
              Excluir
            </CrmDeleteButton>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
