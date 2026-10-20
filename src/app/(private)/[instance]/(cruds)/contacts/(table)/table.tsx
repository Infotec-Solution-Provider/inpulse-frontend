"use client";

import {
  Button,
  CircularProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableRow,
  TextField,
} from "@mui/material";
import { useContactsContext } from "../contacts-context";
import { CrmPage, CrmTableHead } from "@/lib/ui-system";
import ContactsFilters from "./filters";
import { Plus } from "lucide-react";
import ContactsTableItem from "./table-item";

export default function ContactsTable() {
  const { state, dispatch, openContactModal, handleDeleteContact } = useContactsContext();

  const handleChangePage = (_event: unknown, newPage: number) => {
    dispatch({ type: "change-page", page: newPage });
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "change-per-page", perPage: parseInt(event.target.value, 10) });
  };

  return (
    <CrmPage
      title="Contatos"
      description="Consulte contatos, setores e vínculos com clientes."
      count={state.isLoading ? undefined : state.totalRows}
      breadcrumbs={[{ label: "Comunicação" }, { label: "Contatos" }]}
      actions={
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => openContactModal()}
        >
          Novo contato
        </Button>
      }
    >
      <ContactsFilters />
      <div className="ip-crud-table">
        <TableContainer>
          <Table size="small" aria-label="Contatos">
            <CrmTableHead labels={["Código", "Nome", "Telefone", "Cliente", "Setores", "Ações"]} />
            <TableBody>
              {state.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="ip-crud-state">
                      <CircularProgress size={24} />
                      <span>Carregando contatos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : state.contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="ip-crud-state">Nenhum contato encontrado.</div>
                  </TableCell>
                </TableRow>
              ) : (
                state.contacts.map((contact) => (
                  <ContactsTableItem
                    key={contact.id}
                    contact={contact}
                    openEditModalHandler={openContactModal}
                    deleteContactHandler={handleDeleteContact}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <TablePagination
        component="div"
        count={Number(state.totalRows || 0)}
        page={Number(state.filters.page || 1) - 1}
        rowsPerPage={Number(state.filters.perPage || 10)}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      />
    </CrmPage>
  );
}
