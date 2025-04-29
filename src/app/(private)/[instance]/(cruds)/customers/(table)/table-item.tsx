import { Edit, ViewAgenda } from "@mui/icons-material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { Customer } from "@in.pulse-crm/sdk";
import { IconButton } from "@mui/material";

interface ClientListItemProps {
  customer: Customer;
  openEditModalHandler: (customer: Customer) => void;
  openContactModalHandler: (customer: Customer) => void;
}

export default function CustomersTableItem({
  customer,
  openEditModalHandler,
  openContactModalHandler,
}: ClientListItemProps) {
  return (
    <StyledTableRow>
      <StyledTableCell className="px-2 py-3">
        <p className="w-14">{customer.CODIGO}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">{customer.ATIVO || "N/D"}</StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        {customer.PESSOA === "FIS"
          ? "Física"
          : customer.PESSOA === "JUR"
            ? "Júridica"
            : "Não cadastrado"}
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-64 truncate"> {customer.RAZAO || "N/D"}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-40 truncate">
          {customer.CPF_CNPJ
            ? customer.CPF_CNPJ.length === 11
              ? customer.CPF_CNPJ.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
              : customer.CPF_CNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
            : "N/D"}
        </p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-40 truncate">{customer.CIDADE || "N/D"}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <p className="w-36 truncate">{customer.COD_ERP || "N/D"}</p>
      </StyledTableCell>
      <StyledTableCell className="px-2 py-3">
        <div className="flex w-full items-center gap-2">
          <IconButton title="Editar" onClick={() => openEditModalHandler(customer)}>
            <Edit />
          </IconButton>
          <IconButton title="Editar" onClick={() => openContactModalHandler(customer)}>
            <ViewAgenda />
          </IconButton>
        </div>
      </StyledTableCell>
    </StyledTableRow>
  );
}
