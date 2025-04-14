"use client";
import ClientListItem from "./list-item";
import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableContainer,
  TableHead,
} from "@mui/material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { useContext, useEffect, useMemo, useState } from "react";
import EditModal from "./(modal)/edit-modal";
import customersService from "@/lib/services/customers.service";
import CreateModal from "./(modal)/create-modal";
import { ArrowForward, ArrowBack } from "@mui/icons-material";
import { Customer, PaginatedResponse } from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";
import { toast } from "react-toastify";

export default function ClientsList() {
  const [clients, setClients] = useState<Partial<Customer>[]>([]);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>();
  const { token } = useContext(AuthContext);

  const [openEditModal, setOpenEditModal] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Partial<Customer>>();

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      customersService.setAuth(token);
      customersService.getCustomers().then((response: PaginatedResponse<Customer>) => {
        setClients(response.data);
        setTotalPages(response.page.total);
        setPage(response.page.current);
        setLoading(false);
      });
    } else {
      toast.error("Login expirado, faça login novamente");
    }
  }, []);

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
    console.log(page);
    setLoading(true);

    if (next) {
      customersService
        .getCustomers({ page: `${page + 1}` })
        .then((response: PaginatedResponse<Customer>) => {
          setClients(response.data);
          setPage(response.page.current);
          setLoading(false);
        });
    } else {
      customersService
        .getCustomers({ page: `${page - 1}` })
        .then((response: PaginatedResponse<Customer>) => {
          setClients(response.data);
          setPage(response.page.current);
          setLoading(false);
        });
    }
  }

  const rows = useMemo(() => {
    if (clients && clients.length > 0 && !loading) {
      return (
        <TableBody>
          {clients.map((client, index) => (
            <ClientListItem
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
  }, [clients, page]);

  return (
    <>
      {selectedClient && (
        <EditModal onClose={closeModalHandler} open={openEditModal} client={selectedClient} />
      )}

      <CreateModal onClose={() => setOpenCreateModal(false)} open={openCreateModal} />

      <TableContainer className="mx-auto max-h-[40rem] w-full rounded-md bg-indigo-700 bg-opacity-5 shadow-md">
        <Table>
          <TableHead>
            <StyledTableRow className="sticky top-0 rounded-md bg-indigo-900">
              <StyledTableCell>Código</StyledTableCell>
              <StyledTableCell>Ativo</StyledTableCell>
              <StyledTableCell>Pessoa</StyledTableCell>
              <StyledTableCell>Razão social</StyledTableCell>
              <StyledTableCell>CPF/CNPJ</StyledTableCell>
              <StyledTableCell>Cidade</StyledTableCell>
              <StyledTableCell>ERP</StyledTableCell>
              <StyledTableCell> ... </StyledTableCell>
            </StyledTableRow>
          </TableHead>
          {rows}
        </Table>
      </TableContainer>
      <div className="w-full">
        <Button onClick={() => setOpenCreateModal(true)}>Cadastrar cliente</Button>

        <div className="flex h-fit justify-center gap-4 px-4 pb-2 pt-0">
          <button
            className={`${page === 1 ? "text-gray-400" : "text-indigo-700"}`}
            onClick={() => pageChangeHandler()}
            disabled={page === 1}
          >
            <ArrowBack />
          </button>
          {page}/{totalPages}
          <button
            className={`${page === totalPages ? "text-gray-400" : "text-indigo-700"}`}
            onClick={() => pageChangeHandler(true)}
            disabled={page === totalPages}
          >
            <ArrowForward />
          </button>
        </div>
      </div>
    </>
  );
}
