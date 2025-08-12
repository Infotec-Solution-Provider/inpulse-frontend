import { useState, useMemo, useEffect } from "react";
import ContactsTableItem from "./table-item";
import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableContainer,
  Typography,
  useTheme,
  Box
} from "@mui/material";
import ClientTableHeader from "./table-header";
import { useAppContext } from "../../../app-context";
import { useContactsContext } from "../contacts-context";
import { WppContact } from "@in.pulse-crm/sdk";
import { StyledTableCell, StyledTableRow } from "../../users/(table)/styles-table";
import AddIcon from '@mui/icons-material/Add';
import InboxIcon from '@mui/icons-material/InboxOutlined';

type FilterKeys = "id" | "name" | "phone" | "isBlocked" | "isOnlyAdmin";

interface ContactsTableProps {
  searchTerm: string;
}

export default function ContactsTable({ searchTerm }: ContactsTableProps) {
  const { contacts, isLoading,openContactModal, handleDeleteContact } = useContactsContext();
  const theme = useTheme();

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
      // Apply search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          (contact.name?.toLowerCase().includes(searchLower)) ||
          (contact.phone?.includes(searchTerm)) ||
          (contact.id?.toString().includes(searchTerm));
        
        if (!matchesSearch) return false;
      }

      // Apply other filters
      if (filters.id && contact.id !== Number(filters.id)) return false;
      if (filters.name && !contact.name?.toLowerCase().includes(filters.name.toLowerCase()))
        return false;
      if (filters.phone && !contact.phone?.includes(filters.phone)) return false;

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
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
          Lista de Contatos
        </h2>
        <Button 
          onClick={openCreateContactModal} 
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          className="shadow-sm"
        >
          Novo Contato
        </Button>
      </div>
      
      <TableContainer 
        className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        sx={{
          maxHeight: 'calc(100vh - 220px)',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.mode === 'light' ? '#f1f1f1' : '#2d3748',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.mode === 'light' ? '#cbd5e0' : '#4a5568',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'light' ? '#a0aec0' : '#718096',
            },
          },
        }}
      >
        <Table stickyHeader size="small">
          <ClientTableHeader filters={filters} setFilters={handleSetFilters} />
          <TableBody>
            {isLoading ? (
              <StyledTableRow>
                <StyledTableCell
                  colSpan={6}
                  sx={{
                    height: '300px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  }}
                >
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <CircularProgress />
                    <Typography variant="body2" color="textSecondary">
                      Carregando contatos...
                    </Typography>
                  </div>
                </StyledTableCell>
              </StyledTableRow>
            ) : filteredContacts.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell
                  colSpan={6}
                  sx={{
                    height: '200px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  }}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <InboxIcon className="h-12 w-12 text-gray-400" />
                    <Typography variant="body1" color="textSecondary">
                      Nenhum contato encontrado
                    </Typography>
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      onClick={openCreateContactModal}
                      startIcon={<AddIcon />}
                      size="small"
                      className="mt-2"
                    >
                      Adicionar Contato
                    </Button>
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
      
      {!isLoading && filteredContacts.length > 0 && (
        <div className="mt-4 flex justify-between items-center px-2">
          <Typography variant="body2" color="textSecondary">
            Mostrando {filteredContacts.length} de {contacts.length} contatos
          </Typography>
          <Button 
            variant="text" 
            size="small" 
            onClick={openCreateContactModal}
            startIcon={<AddIcon />}
          >
            Adicionar outro
          </Button>
        </div>
      )}
    </div>
  );
}
