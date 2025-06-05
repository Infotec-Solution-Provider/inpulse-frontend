"use client";
import CustomersTableItem from "./table-item";
import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableContainer,
  TablePagination,
} from "@mui/material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { useContext } from "react";
import EditCustomerModal from "./(modal)/edit-customer-modal";
import CreateCustomerModal from "./(modal)/create-customer-modal";
import { Customer } from "@in.pulse-crm/sdk";
import ClientTableHeader from "./table-header";
import { AppContext } from "../../../app-context";
import ContactsModal from "./(modal)/contacts-modal";
import { CustomersContext, useCustomersContext } from "../customers-context";

export default function CustomersTable() {
  const { openModal } = useContext(AppContext);
  const { state, dispatch, loadCustomers } = useContext(CustomersContext);

  function openEditCustomerModal(customer: Customer) {
    openModal(<EditCustomerModal customer={customer} />);
  }

  function openCreateCustomerModal() {
    openModal(<CreateCustomerModal />
    );
  }

  function openContactModal(customer: Customer) {
    openModal(<ContactsModal customer={customer} />);
  }

  const onChangePage = (page: number) => {
    dispatch({ type: "change-page", page });
    loadCustomers();
  };

  const onChangePerPage = (perPage: number) => {
    dispatch({ type: "change-per-page", perPage });
    loadCustomers();
  };

  return (
    <div>
<TableContainer className="mx-auto max-h-[70vh] overflow-auto rounded-md scrollbar-whatsapp shadow-md bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100">
        <Table className="max-h-[100%] overflow-auto scrollbar-whatsapp">
          <ClientTableHeader />
          <TableBody>
            {state.isLoading ? (
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
              state.customers.map((client) => (
                <CustomersTableItem
                  key={`${client.RAZAO}_${client.CODIGO}`}
                  customer={client}
                  openEditModalHandler={openEditCustomerModal}
                  openContactModalHandler={openContactModal}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {!state.isLoading && (
        <div className="flex h-fit w-full justify-center gap-4 px-4 pt-0">
          <Button onClick={openCreateCustomerModal} variant="outlined">
            Cadastrar cliente
          </Button>
          <TablePagination
            component="div"
            count={state.totalRows}
            page={+(state.filters.page ?? 1)}
            rowsPerPage={+(state.filters.perPage ?? 10)}
            labelRowsPerPage="Entradas por página"
            labelDisplayedRows={({ from, to, count }) => {
              return `${from}-${to} de ${count}`;
            }}
            onRowsPerPageChange={(e) => onChangePerPage(+e.target.value)}
            onPageChange={(_, newPage) => onChangePage(newPage)}
          />
        </div>
      )}
    </div>
  );
}
