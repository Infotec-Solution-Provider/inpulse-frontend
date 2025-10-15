"use client";
import { Customer } from "@in.pulse-crm/sdk";
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
import { useContext } from "react";
import { AppContext } from "../../../app-context";
import { CustomersContext } from "../customers-context";
import ContactsModal from "./(modal)/contacts-modal";
import CreateCustomerModal from "./(modal)/create-customer-modal";
import EditCustomerModal from "./(modal)/edit-customer-modal";
import ClientTableHeader from "./table-header";
import CustomersTableItem from "./table-item";

export default function CustomersTable() {
  const { openModal } = useContext(AppContext);
  const { state, dispatch } = useContext(CustomersContext);

  function openEditCustomerModal(customer: Customer) {
    openModal(<EditCustomerModal customer={customer} />);
  }

  function openCreateCustomerModal() {
    openModal(<CreateCustomerModal />);
  }

  function openContactModal(customer: Customer) {
    openModal(<ContactsModal customer={customer} />);
  }

  const onChangePage = (page: number) => {
    dispatch({ type: "change-page", page });
  };

  const onChangePerPage = (perPage: number) => {
    dispatch({ type: "change-per-page", perPage });
  };

  return (
    <div className="flex flex-col gap-4">
      <TableContainer
        className="scrollbar-whatsapp mx-auto overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        sx={{
          height: "calc(100vh - 280px)", // Altura fixa para manter paginação no mesmo lugar
          minHeight: "400px",
          maxHeight: "70vh",
        }}
      >
        <Table className="scrollbar-whatsapp" stickyHeader>
          <ClientTableHeader />
          <TableBody
            sx={{
              minHeight: state.isLoading || state.customers.length === 0 ? "300px" : "auto",
            }}
          >
            {state.isLoading && (
              <TableRow sx={{ height: "300px" }}>
                <TableCell
                  colSpan={8}
                  className="border-0"
                  sx={{
                    textAlign: "center",
                    backgroundColor: "transparent",
                  }}
                >
                  <div className="flex flex-col items-center gap-3 py-8">
                    <CircularProgress size={40} />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Carregando clientes...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!state.isLoading && state.customers.length === 0 && (
              <TableRow className="h-[30rem]">
                <TableCell
                  colSpan={8}
                  align="center"
                  sx={{
                    borderBottom: "none",
                  }}
                >
                  <div className="flex flex-col items-center gap-2 py-8">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Nenhum cliente encontrado
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!state.isLoading &&
              state.customers.map((client) => (
                <CustomersTableItem
                  key={`${client.CODIGO}`}
                  customer={client}
                  openEditModalHandler={openEditCustomerModal}
                  openContactModalHandler={openContactModal}
                />
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row">
        <Button
          onClick={openCreateCustomerModal}
          variant="contained"
          color="primary"
          size="medium"
          className="w-full sm:w-auto"
        >
          + Cadastrar Cliente
        </Button>
        <TablePagination
          component="div"
          count={Number(state.totalRows || 0)}
          page={Number(state.filters.page || 1) - 1}
          rowsPerPage={Number(state.filters.perPage || 10)}
          labelRowsPerPage="Entradas por página"
          labelDisplayedRows={(info) => {
            const { from, to, count } = info;
            return `${from}-${to} de ${count}`;
          }}
          onRowsPerPageChange={(e) => onChangePerPage(+e.target.value)}
          onPageChange={(_, newPage) => onChangePage(newPage)}
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
