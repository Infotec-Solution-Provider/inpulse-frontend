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
  const { state, dispatch, loadCustomers } = useContext(CustomersContext);

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
    loadCustomers({ ...state.filters, page: String(page) });
  };

  const onChangePerPage = (perPage: number) => {
    dispatch({ type: "change-per-page", perPage });
    loadCustomers({ ...state.filters, perPage: String(perPage) });
  };

  return (
    <div className="flex flex-col gap-4">
      <TableContainer className="scrollbar-whatsapp mx-auto max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <Table className="scrollbar-whatsapp" stickyHeader>
          <ClientTableHeader />
          <TableBody>
            {state.isLoading && (
              <TableRow className="h-32">
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
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="border-0"
                  sx={{
                    textAlign: "center",
                    backgroundColor: "transparent",
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
                  key={`${client.RAZAO}_${client.CODIGO}`}
                  customer={client}
                  openEditModalHandler={openEditCustomerModal}
                  openContactModalHandler={openContactModal}
                />
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!state.isLoading && (
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
            count={state.totalRows}
            page={Math.max(0, +(state.filters.page ?? 1) - 1)} // Convert from 1-based (backend) to 0-based (MUI)
            rowsPerPage={+(state.filters.perPage ?? 10)}
            labelRowsPerPage="Entradas por página"
            labelDisplayedRows={({ from, to, count }) => {
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
      )}
    </div>
  );
}
