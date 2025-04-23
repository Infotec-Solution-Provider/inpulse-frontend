import { Edit } from "@mui/icons-material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { Customer } from "@in.pulse-crm/sdk";

interface ClientListItemProps {
  client: Partial<Customer>;
  openModalHandler: () => void;
}

export default function ClientTableItem({ client, openModalHandler }: ClientListItemProps) {
  return (
    <StyledTableRow>
      <StyledTableCell className="px-2 py-3">
        <p className="w-14">{client.CODIGO}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">{client.ATIVO || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        {client.PESSOA === "FIS"
          ? "Física"
          : client.PESSOA === "JUR"
            ? "Júridica"
            : "Não cadastrado"}
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-64 truncate"> {client.RAZAO || "N/D"}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-40 truncate">
          {client.CPF_CNPJ
            ? client.CPF_CNPJ.length === 11
              ? client.CPF_CNPJ.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
              : client.CPF_CNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
            : "N/D"}
        </p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-40 truncate">{client.CIDADE || "N/D"}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-36 truncate">{client.COD_ERP || "N/D"}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <button className="transition-all hover:text-red-400" title="Editar" type="button">
          <Edit onClick={openModalHandler} />
        </button>
      </StyledTableCell>
    </StyledTableRow>
  );
}
