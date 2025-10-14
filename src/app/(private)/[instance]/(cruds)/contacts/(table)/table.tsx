"use client";

import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableRow,
} from "@mui/material";
import { useContactsContext } from "../contacts-context";
import ContactsTableHeader from "./table-header";
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
    <div className="flex h-full w-full flex-col gap-4">
      <TableContainer className="h-[calc(100vh-280px)] overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg scrollbar-whatsapp dark:border-slate-700 dark:bg-slate-800">
        <Table stickyHeader>
          <ContactsTableHeader />
          <TableBody>
            {state.isLoading ? (
              <TableRow className="h-32">
                <TableCell colSpan={4} align="center">
                  <div className="flex flex-col items-center gap-2">
                    <CircularProgress />
                    <span className="text-slate-600 dark:text-slate-300">
                      Carregando contatos...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : state.contacts.length === 0 ? (
              <TableRow className="h-32">
                <TableCell colSpan={4} align="center">
                  <span className="text-slate-600 dark:text-slate-300">
                    Nenhum contato encontrado
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              state.contacts.map((contact) => (
                <ContactsTableItem
                  key={`${contact.id}-${contact.instance}-${contact.phone}`}
                  contact={contact}
                  openEditModalHandler={openContactModal}
                  deleteContactHandler={handleDeleteContact}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="flex w-full items-center justify-between px-4">
        <Button onClick={() => openContactModal()} variant="outlined" color="primary">
          Cadastrar Contato
        </Button>
        <TablePagination
          component="div"
          count={state.totalRows}
          page={parseInt(state.filters.page || "1") - 1}
          onPageChange={handleChangePage}
          rowsPerPage={parseInt(state.filters.perPage || "10")}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      </div>
    </div>
  );
}
