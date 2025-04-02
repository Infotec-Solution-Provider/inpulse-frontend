import { FaPencil, FaTrash } from "react-icons/fa6";
import { Client } from "../type";
import { StyledTableCell, StyledTableRow } from "./table-style";

interface ClientListItemProps {
  client: Client;
}

export default function ClientListItem({ client }: ClientListItemProps) {
  return (
    <StyledTableRow>
      <StyledTableCell className="px-2 py-3">{client.id}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.active ? "Sim" : "Não"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.personType}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.name}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.cpf}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.city}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.erp}</StyledTableCell>

      <StyledTableCell className="flex items-center justify-end gap-4 px-2 py-3 pr-8">
        <button className="transition-all hover:text-red-400" title="Editar" type="button">
          <FaPencil />
        </button>
      </StyledTableCell>
    </StyledTableRow>
  );
}
