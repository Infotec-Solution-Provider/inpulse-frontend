"use client";
import ClientTableItem from "./table-item";
import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableContainer,
  TablePagination,
} from "@mui/material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { ChangeEvent, useContext, useEffect, useMemo, useState } from "react";
import EditModal from "./(modal)/edit-modal";
import customersService from "@/lib/services/customers.service";
import CreateModal from "./(modal)/create-modal";
import { Customer, PaginatedResponse, RequestFilters } from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";
import { toast } from "react-toastify";
import ClientTableHeader from "./table-header";

export default function ClientsTable() {
  const [clients, setClients] = useState<Partial<Customer>[]>([]);
  const { token } = useContext(AuthContext);

  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>();
  const [rowsPerPage, setRowsPerPage] = useState<string>("10");
  const [filters, setFilters] = useState<RequestFilters<Customer>>();

  const [openEditModal, setOpenEditModal] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Partial<Customer>>();

  const [loading, setLoading] = useState<boolean>(true);
  const [firstLoading, setFirstLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      customersService.setAuth(token);
      customersService.getCustomers().then((response: PaginatedResponse<Customer>) => {
        setClients(response.data);
        setTotalPages(response.page.total);
        setPage(response.page.current);
        setLoading(false);
        setFirstLoading(false);
      });
    } else {
      toast.error("Login expirado, faça login novamente");
    }
  }, [token]);

  function openModalHandler(index: number) {
    setSelectedClient(clients[index]);
    setOpenEditModal(true);
  }

  function closeModalHandler(editedCustomer?: Partial<Customer>) {
    setOpenEditModal(false);
    setSelectedClient(undefined);
    if (editedCustomer) {
      setClients((prevClients) =>
        prevClients.map((client) =>
          client.CODIGO === editedCustomer.CODIGO ? editedCustomer : client,
        ),
      );
    }
  }

  function pageChangeHandler(next?: boolean) {
    setLoading(true);

    if (next) {
      customersService
        .getCustomers({ ...filters, page: `${page + 1}`, perPage: rowsPerPage })
        .then((response: PaginatedResponse<Customer>) => {
          setClients(response.data);
          setPage(response.page.current);
          setTotalPages(response.page.total);
          setLoading(false);
        });
    } else {
      customersService
        .getCustomers({ ...filters, page: `${page - 1}`, perPage: rowsPerPage })
        .then((response: PaginatedResponse<Customer>) => {
          setClients(response.data);
          setPage(response.page.current);
          setTotalPages(response.page.total);
          setLoading(false);
        });
    }
  }

  function rowsPerPageChangeHandler(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setRowsPerPage(e.target.value);
    setPage(1);
    setLoading(true);
    customersService
      .getCustomers({ ...filters, perPage: e.target.value })
      .then((response: PaginatedResponse<Customer>) => {
        setClients(response.data);
        setPage(response.page.current);
        setTotalPages(response.page.total);
        setLoading(false);
      });
  }

  const rows = useMemo(() => {
    console.log("calculou memo")
    if (clients && clients.length > 0 && !loading) {
      return (
        <TableBody>
          {clients.map((client, index) => (
            <ClientTableItem
              key={`${client.RAZAO}_${client.CODIGO}`}
              client={client}
              openModalHandler={() => openModalHandler(index)}
            />
          ))}
        </TableBody>
      );
    } else {
      return (
        <TableBody>
          <StyledTableRow className="h-32 w-full items-center justify-center text-center text-gray-400">
            <StyledTableCell colSpan={8} className="flex w-full items-center justify-center gap-2">
              <CircularProgress /> Carregando clientes...
            </StyledTableCell>
          </StyledTableRow>
        </TableBody>
      );
    }
  }, [clients, page, loading, openModalHandler]);

  return (
    <>
      {selectedClient && (
        <EditModal onClose={closeModalHandler} open={openEditModal} client={selectedClient} />
      )}

      <CreateModal onClose={() => setOpenCreateModal(false)} open={openCreateModal} />

      <TableContainer className="mx-auto max-h-[75vh] overflow-auto rounded-md bg-indigo-700 bg-opacity-5 shadow-md">
        <Table className="max-h-[100%] overflow-auto">
          <ClientTableHeader
            rowsPerPage={rowsPerPage}
            setLoading={setLoading}
            setPage={setPage}
            setTotalPages={setTotalPages}
            setClients={setClients}
            filters={filters}
            setFilters={setFilters}
          />
          {rows}
        </Table>
      </TableContainer>
      {!firstLoading && (
        <div className="flex h-fit w-full justify-center gap-4 px-4 pt-0">
          <Button onClick={() => setOpenCreateModal(true)} variant="outlined">
            Cadastrar cliente
          </Button>
          <TablePagination
            component="div"
            count={totalPages ?? 10}
            page={page - 1}
            rowsPerPage={+rowsPerPage}
            labelRowsPerPage="Entradas por página"
            labelDisplayedRows={({ from, to, count }) => {
              return `${from}-${to} de ${count}`;
            }}
            onRowsPerPageChange={(e) => rowsPerPageChangeHandler(e)}
            onPageChange={(e, newPage) => pageChangeHandler(newPage + 1 > page)}
          />
        </div>
      )}
    </>
  );
}
