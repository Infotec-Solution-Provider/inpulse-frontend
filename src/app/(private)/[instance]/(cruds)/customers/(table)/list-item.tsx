import { FaPencil, FaTrash } from "react-icons/fa6";
import { Client } from "../type";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { TableRow } from "@mui/material";

interface ClientListItemProps {
  client: Client;
  openModalHandler: () => void;
}

export default function ClientListItem({ client, openModalHandler }: ClientListItemProps) {
  return (
    <TableRow>
      <StyledTableCell className="px-2 py-3">{client.id}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.active ? "Sim" : "Não"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        {client.personType === "FISICA"
          ? "Física"
          : client.personType === "JURIDICA"
            ? "Júridica"
            : "Não cadastrado"}
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.name ?? "Não cadastrado"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.cpf ?? "Não cadastrado"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.city ?? "Não cadastrado"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.erp ?? "Não cadastrado"}</StyledTableCell>

      <StyledTableCell className="flex items-center justify-end gap-4 px-2 py-3 pr-8">
        <button className="transition-all hover:text-red-400" title="Editar" type="button">
          <FaPencil onClick={openModalHandler} />
        </button>
      </StyledTableCell>
    </TableRow>
  );
}
