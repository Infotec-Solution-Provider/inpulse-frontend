"use client";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
import { isSystemDefaultCustomer } from "@/lib/utils/customer-guards";
import { Customer } from "@/lib/sdk-local";
import { TableCell, TableRow } from "@mui/material";
import { OperationalIconButton, UiIcon } from "@/lib/ui-system";
interface Props {
  customer: Customer;
  openEditModalHandler: (customer: Customer) => void;
  openContactModalHandler: (customer: Customer) => void;
}
export default function CustomersTableItem({
  customer,
  openEditModalHandler,
  openContactModalHandler,
}: Props) {
  const system = isSystemDefaultCustomer(customer.CODIGO),
    name = customer.RAZAO || `Cliente #${customer.CODIGO}`;
  return (
    <TableRow hover>
      <TableCell className="ip-crud-customer-identity" data-label="Cliente" sx={{ width: "45%" }}>
        <div>
          <strong style={{ fontWeight: 500 }}>{name}</strong>
          <div className="ip-muted" style={{ fontSize: 12, marginTop: 3 }}>
            #{customer.CODIGO}
            {customer.CPF_CNPJ ? ` · ${formatCpfCnpj(customer.CPF_CNPJ)}` : ""}
            {customer.PESSOA
              ? ` · ${customer.PESSOA === "FIS" ? "Pessoa física" : customer.PESSOA === "JUR" ? "Pessoa jurídica" : customer.PESSOA}`
              : ""}
          </div>
        </div>
      </TableCell>
      <TableCell data-label="Situação">
        {customer.ATIVO === "SIM"
          ? "Ativo"
          : customer.ATIVO === "NAO"
            ? "Inativo"
            : "Não informada"}
      </TableCell>
      <TableCell data-label="Cidade">{customer.CIDADE || "—"}</TableCell>
      <TableCell data-label="Código ERP">{customer.COD_ERP || "—"}</TableCell>
      <TableCell data-label="Ações" align="right" sx={{ whiteSpace: "nowrap" }}>
        <div className="flex justify-end gap-1">
          <OperationalIconButton
            label={`Editar ${name}`}
            tooltip={system ? "Cadastro do sistema somente para consulta" : "Editar cliente"}
            disabled={system}
            onClick={() => openEditModalHandler(customer)}
          >
            <UiIcon name="edit" scale="row" />
          </OperationalIconButton>
          <OperationalIconButton
            label={`Ver contatos de ${name}`}
            tooltip="Ver contatos"
            onClick={() => openContactModalHandler(customer)}
          >
            <UiIcon name="view" scale="row" />
          </OperationalIconButton>
        </div>
      </TableCell>
    </TableRow>
  );
}
