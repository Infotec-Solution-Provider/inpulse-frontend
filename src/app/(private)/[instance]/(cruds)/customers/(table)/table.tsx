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
import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../../../app-context";
import { CustomersContext } from "../customers-context";
import { WhatsappContext } from "../../../whatsapp-context";
import { CustomerProfileSummaryPayload } from "@/lib/types/customer-profile-summary";
import ContactsModal from "./(modal)/contacts-modal";
import CreateCustomerModal from "./(modal)/create-customer-modal";
import EditCustomerProfileTagsModal from "./(modal)/edit-customer-profile-tags-modal";
import EditCustomerModal from "./(modal)/edit-customer-modal";
import ClientTableHeader from "./table-header";
import CustomersTableItem from "./table-item";

export default function CustomersTable() {
  const { openModal } = useContext(AppContext);
  const { state, dispatch } = useContext(CustomersContext);
  const { wppApi } = useContext(WhatsappContext);
  const [profileSummaries, setProfileSummaries] = useState<Record<number, CustomerProfileSummaryPayload | null>>({});
  const [isLoadingProfileSummaries, setIsLoadingProfileSummaries] = useState(false);

  const customerIds = useMemo(
    () =>
      Array.from(
        new Set(
          state.customers
            .map((customer) => Number(customer.CODIGO))
            .filter((customerId) => Number.isInteger(customerId) && customerId > 0),
        ),
      ),
    [state.customers],
  );

  useEffect(() => {
    if (!wppApi.current || !customerIds.length) {
      setIsLoadingProfileSummaries(false);
      return;
    }

    const missingCustomerIds = customerIds.filter((customerId) => !(customerId in profileSummaries));
    if (!missingCustomerIds.length) {
      setIsLoadingProfileSummaries(false);
      return;
    }

    let isMounted = true;
    setIsLoadingProfileSummaries(true);

    wppApi.current.ax
      .post<{ message: string; data: CustomerProfileSummaryPayload[] }>(
        "/api/whatsapp/customers/profile-tags/summary/batch",
        { customerIds: missingCustomerIds },
      )
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setProfileSummaries((current) => {
          const next = { ...current };
          const resolvedCustomerIds = new Set<number>();

          for (const summary of response.data.data) {
            next[summary.customerId] = summary;
            resolvedCustomerIds.add(summary.customerId);
          }

          for (const customerId of missingCustomerIds) {
            if (!resolvedCustomerIds.has(customerId)) {
              next[customerId] = null;
            }
          }

          return next;
        });
      })
      .catch((error) => {
        console.error("Erro ao carregar tags de perfil dos clientes:", error);

        if (!isMounted) {
          return;
        }

        setProfileSummaries((current) => {
          const next = { ...current };

          for (const customerId of missingCustomerIds) {
            next[customerId] = null;
          }

          return next;
        });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingProfileSummaries(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [customerIds, profileSummaries, wppApi]);

  function openEditCustomerModal(customer: Customer) {
    openModal(<EditCustomerModal customer={customer} />);
  }

  function openCreateCustomerModal() {
    openModal(<CreateCustomerModal />);
  }

  function openContactModal(customer: Customer) {
    openModal(<ContactsModal customer={customer} />);
  }

  function openEditProfileTagsModal(customer: Customer) {
    openModal(
      <EditCustomerProfileTagsModal
        customer={customer}
        profileSummary={profileSummaries[customer.CODIGO] ?? null}
        onSaved={(summary) => {
          setProfileSummaries((current) => ({
            ...current,
            [customer.CODIGO]: summary,
          }));
        }}
      />,
    );
  }

  const onChangePage = (page: number) => {
    dispatch({ type: "change-page", page });
  };

  const onChangePerPage = (perPage: number) => {
    dispatch({ type: "change-per-page", perPage });
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <TableContainer
        className="scrollbar-whatsapp w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        sx={{
          height: "calc(100vh - 280px)", // Altura fixa para manter paginação no mesmo lugar
          minHeight: "400px",
          maxHeight: "70vh",
          width: "100%",
        }}
      >
        <Table className="scrollbar-whatsapp" stickyHeader sx={{ width: "100%", minWidth: "100%", tableLayout: "auto" }}>
          <ClientTableHeader />
          <TableBody
            sx={{
              minHeight: state.isLoading || state.customers.length === 0 ? "300px" : "auto",
            }}
          >
            {state.isLoading && (
              <TableRow sx={{ height: "300px" }}>
                <TableCell
                  colSpan={9}
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
                  colSpan={9}
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
                  profileSummary={profileSummaries[client.CODIGO] ?? null}
                  isProfileLoading={isLoadingProfileSummaries && !(client.CODIGO in profileSummaries)}
                  openEditProfileTagsHandler={openEditProfileTagsModal}
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
