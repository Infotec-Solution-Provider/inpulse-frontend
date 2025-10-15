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
      <TableContainer className="scrollbar-whatsapp h-[calc(100vh-280px)] overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
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
              <TableRow className="h-[30rem]">
                <TableCell
                  colSpan={8}
                  align="center"
                  sx={{
                    borderBottom: "none",
                  }}
                >
                  <span className="text-slate-600 dark:text-slate-300">
                    Nenhum contato encontrado
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              state.contacts.map((contact) => (
                <ContactsTableItem
                  key={`${contact.id}`}
                  contact={contact}
                  openEditModalHandler={openContactModal}
                  deleteContactHandler={handleDeleteContact}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row">
        <Button
          onClick={() => openContactModal()}
          variant="contained"
          color="primary"
          size="medium"
          className="w-full sm:w-auto"
        >
          + Cadastrar Contato
        </Button>
        <TablePagination
          component="div"
          count={Number(state.totalRows || 0)}
          page={Number(state.filters.page || 1) - 1}
          onPageChange={handleChangePage}
          rowsPerPage={Number(state.filters.perPage || 10)}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Entradas por página"
          labelDisplayedRows={(info) => {
            const { from, to, count } = info;
            return `${from}-${to} de ${count}`;
          }}
          sx={{
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
              marginBottom: 0,
            },
          }}
        />
      </div>
    </div>
  );
}
