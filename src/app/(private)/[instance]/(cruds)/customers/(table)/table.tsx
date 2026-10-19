"use client";
import { useAuthContext } from "@/app/auth-context";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/lib/ui-system";
import { TableHead } from "@mui/material";
import { CUSTOMERS_TABLE_COLUMNS } from "./table-config";
import { Customer } from "@/lib/sdk-local";
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
import { useCustomersContext } from "../customers-context";
import { isSystemDefaultCustomer } from "@/lib/utils/customer-guards";
import { toast } from "react-toastify";
import ContactsModal from "./(modal)/contacts-modal";
import CreateCustomerModal from "./(modal)/create-customer-modal";
import EditCustomerModal from "./(modal)/edit-customer-modal";
import ClientTableHeader from "./table-header";
import CustomersTableItem from "./table-item";

export default function CustomersTable() {
  const { user, instance } = useAuthContext();
  const router = useRouter();
  const { openModal } = useContext(AppContext);
  const { state, dispatch } = useCustomersContext();

  function openEditCustomerModal(customer: Customer) {
    if (isSystemDefaultCustomer(customer.CODIGO)) {
      toast.info("O cliente padrão do sistema não pode ser editado.");
      return;
    }

    if (user?.NIVEL === "ADMIN") router.push(`/${instance}/crm-customers/${customer.CODIGO}`);
    else openModal(<EditCustomerModal customer={customer} />);
  }

  function openCreateCustomerModal() {
    if (user?.NIVEL === "ADMIN") router.push(`/${instance}/crm-customers/new`);
    else openModal(<CreateCustomerModal />);
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
    <div className="flex min-w-0 w-full flex-col gap-4">
      <ClientTableHeader key={`${instance}:${user?.CODIGO}`} />
      <div className="ip-crud-table">
        <TableContainer className="w-full overflow-auto">
          <Table
            className="scrollbar-whatsapp"
            stickyHeader
            sx={{ width: "100%", minWidth: "100%", tableLayout: "auto" }}
          >
            <TableHead>
              <TableRow>
                {["Cliente", "Situação", "Cidade", "Código ERP", "Ações"].map((label) => (
                  <TableCell key={label} align={label === "Ações" ? "right" : "left"}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
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
        <TablePagination
          component="div"
          count={Number(state.totalRows || 0)}
          page={Number(state.filters.page || 1) - 1}
          rowsPerPage={Number(state.filters.perPage || 10)}
          labelRowsPerPage="Por página"
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
