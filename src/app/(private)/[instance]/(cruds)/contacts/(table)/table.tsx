import { useState, useMemo } from "react";
import ContactsTableItem from "./table-item";
import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableContainer,
} from "@mui/material";
import ClientTableHeader from "./table-header";
import { useAppContext } from "../../../app-context";
import { useContactsContext } from "../contacts-context";
import { WppContact } from "@in.pulse-crm/sdk";
import { StyledTableCell, StyledTableRow } from "../../users/(table)/styles-table";

type FilterKeys = "id" | "name" | "phone" | "isBlocked" | "isOnlyAdmin";

export default function ContactsTable() {
  const { contacts, isLoading,openContactModal, handleDeleteContact } = useContactsContext();

  const [filters, setFilters] = useState<Partial<Record<FilterKeys, string>>>({});

  function openEditContactModal(contact: WppContact) {
    openContactModal(contact);
  }

  function openCreateContactModal() {
    openContactModal();
  }
  function openDeleteContactModal(contact: WppContact) {
    handleDeleteContact(contact);
  }

  function handleSetFilters(newFilters: Partial<Record<FilterKeys, string>>) {
    setFilters(newFilters);
  }

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      if (filters.id && contact.id !== Number(filters.id)) return false;
      if (filters.name && !contact.name.toLowerCase().includes(filters.name.toLowerCase()))
        return false;
      if (filters.phone && !contact.phone.includes(filters.phone)) return false;

      if (filters.isBlocked) {
        if (filters.isBlocked === "true" && !contact.isBlocked) return false;
        if (filters.isBlocked === "false" && contact.isBlocked) return false;
      }

      if (filters.isOnlyAdmin) {
        if (filters.isOnlyAdmin === "true" && !contact.isOnlyAdmin) return false;
        if (filters.isOnlyAdmin === "false" && contact.isOnlyAdmin) return false;
      }

      return true;
    });
  }, [contacts, filters]);

  return (
    <div>
      <TableContainer className="mx-auto max-h-[70vh] overflow-auto rounded-md scrollbar-whatsapp shadow-md bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">
        <Table className="max-h-[100%] overflow-auto scrollbar-whatsapp">
          <ClientTableHeader filters={filters} setFilters={handleSetFilters} />
          <TableBody>
            {isLoading ? (
              <StyledTableRow className="h-32 w-full">
                <StyledTableCell
                  colSpan={8}
                  className="flex items-center justify-center text-center text-gray-600 dark:text-gray-300"
                >
                  <div className="flex flex-col items-center">
                    <CircularProgress />
                    <span className="mt-2">Carregando clientes...</span>
                  </div>
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              filteredContacts.map((contact) => (
                <ContactsTableItem
                  key={`${contact.id}-${contact.name}`}
                  contact={contact}
                  openEditModalHandler={openEditContactModal}
                  deleteContactHandler={openDeleteContactModal}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {!isLoading && (
        <div className="flex h-fit w-full justify-center gap-4 px-4 pt-0">
          <Button onClick={openCreateContactModal} variant="outlined">
            Cadastrar Contato
          </Button>
        </div>
      )}
    </div>
  );
}
