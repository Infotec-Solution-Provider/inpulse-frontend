import { Edit } from "@mui/icons-material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { TableRow } from "@mui/material";
import { Customer } from "@in.pulse-crm/sdk";

interface ClientListItemProps {
  client: Partial<Customer>;
  openModalHandler: () => void;
}

export default function ClientTableItem({ client, openModalHandler }: ClientListItemProps) {
  return (
    <TableRow>
      <StyledTableCell className="px-2 py-3">{client.CODIGO}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.ATIVO || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        {client.PESSOA === "FIS"
          ? "Física"
          : client.PESSOA === "JUR"
            ? "Júridica"
            : "Não cadastrado"}
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.RAZAO || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.CPF_CNPJ || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.CIDADE || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.COD_ERP || "N/D"}</StyledTableCell>

      <StyledTableCell className="flex items-center justify-end gap-4 px-2 py-3 pr-8">
        <button className="transition-all hover:text-red-400" title="Editar" type="button">
          <Edit onClick={openModalHandler} />
        </button>
      </StyledTableCell>
    </TableRow>
  );
}
