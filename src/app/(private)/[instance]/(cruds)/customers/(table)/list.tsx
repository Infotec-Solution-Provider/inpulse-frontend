"use client";
import ClientListItem from "./list-item";
import { Client } from "../type";
import { Modal, Table, TableBody, TableContainer, TableHead } from "@mui/material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { FaArrowLeft, FaArrowRight, FaLeftRight, FaSpinner } from "react-icons/fa6";
import { useEffect, useMemo, useState } from "react";
import EditModal from "./(modal)/edit-modal";

const MockClients: Client[] = [
  {
    id: "1",
    active: true,
    personType: "FISICA",
    name: "John Doe",
    cpf: "123.456.789-00",
    city: "New York",
  },
  {
    id: "2",
    active: false,
    personType: "JURIDICA",
    name: "Acme Corp",
    cpf: "234.567.890-11",
    erp: "ERP-002",
    city: "Los Angeles",
  },
  {
    id: "3",
    active: true,
    personType: "FISICA",
    name: "Jane Smith",
    cpf: "345.678.901-22",
    erp: "ERP-003",
    city: "Chicago",
  },
  {
    id: "4",
    active: true,
    personType: "FISICA",
    name: "Alice Johnson",
    cpf: "456.789.012-33",
    erp: "ERP-004",
    city: "Houston",
  },
  {
    id: "5",
    active: false,
    personType: "JURIDICA",
    name: "Tech Solutions",
    cpf: "567.890.123-44",
    erp: "ERP-005",
    city: "San Francisco",
  },
  {
    id: "6",
    active: true,
    personType: "FISICA",
    name: "Bob Brown",
    cpf: "678.901.234-55",
    erp: "ERP-006",
    city: "Seattle",
  },
  {
    id: "7",
    active: false,
    personType: "JURIDICA",
    name: "Global Enterprises",
    cpf: "789.012.345-66",
    erp: "ERP-007",
    city: "Boston",
  },
  {
    id: "8",
    active: true,
    personType: "FISICA",
    name: "Charlie Davis",
    cpf: "890.123.456-77",
    erp: "ERP-008",
    city: "Miami",
  },
  {
    id: "9",
    active: false,
    personType: "JURIDICA",
    name: "Innovatech",
    cpf: "901.234.567-88",
    erp: "ERP-009",
    city: "Denver",
  },
  {
    id: "10",
    active: true,
    personType: "FISICA",
    name: "Diana Prince",
    cpf: "012.345.678-99",
    erp: "ERP-010",
    city: "Atlanta",
  },
];

export default function ClientsList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>();

  const [openModal, setOpenModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client>();

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setClients([...MockClients, ...MockClients, ...MockClients, ...MockClients]);
    setTotalPages(Math.ceil((MockClients.length * 4) / 10));
    setLoading(false);
  }, []);

  function openModalHandler(index: number) {
    setSelectedClient(clients[index]);
    setOpenModal(true);
  }

  function closeModalHandler() {
    setOpenModal(false);
    setSelectedClient(undefined);
  }

  const rows = useMemo(() => {
    if (clients && clients.length > 0 && !loading) {
      return (
        <TableBody>
          {clients.slice(page * 10, (page + 1) * 10).map((client, index) => (
            <ClientListItem
              key={`${client.name}_${client.id}`}
              client={client}
              openModalHandler={() => openModalHandler(index + page * 10)}
            />
          ))}
        </TableBody>
      );
    } else {
      return (
        <StyledTableRow className="h-32 w-full items-center justify-center text-center text-gray-400">
          <StyledTableCell colSpan={8} className="flex items-center justify-center gap-2">
            <FaSpinner /> Carregando clientes...
          </StyledTableCell>
        </StyledTableRow>
      );
    }
  }, [clients, page]);

  return (
    <>
      {selectedClient && (
        <EditModal onClose={closeModalHandler} open={openModal} client={selectedClient} />
      )}

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
      <div className="flex h-fit w-full justify-center gap-4 px-4 pb-2 pt-0">
        <button
          className={`${page === 0 ? "text-gray-400" : "text-indigo-700"}`}
          onClick={() => page > 0 && setPage(page - 1)}
          disabled={page === 0}
        >
          <FaArrowLeft />
        </button>
        {page + 1}/{totalPages}
        <button
          className={`${page + 1 === totalPages ? "text-gray-400" : "text-indigo-700"}`}
          onClick={() => page + 1 < (totalPages ?? 1) && setPage(page + 1)}
          disabled={page + 1 === totalPages}
        >
          <FaArrowRight />
        </button>
      </div>
    </>
  );
}
