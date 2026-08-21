import { Edit, ViewAgenda } from "@mui/icons-material";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
import { isSystemDefaultCustomer } from "@/lib/utils/customer-guards";
import { Customer } from "@/lib/sdk-local";
import { IconButton, TableCell, TableRow } from "@mui/material";
import { CUSTOMERS_TABLE_COLUMNS } from "./table-config";

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
  const isSystemCustomer = isSystemDefaultCustomer(customer.CODIGO);

  return (
    <TableRow
      className="transition-colors even:bg-indigo-700/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
      sx={{
        "& .MuiTableCell-root": {
          borderBottom: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgb(51 65 85)" : "rgb(226 232 240)",
        },
      }}
    >
      <TableCell
        className="px-3 py-3"
        sx={{
          minWidth: CUSTOMERS_TABLE_COLUMNS.CODIGO.width,
        }}
      >
        <span className="font-mono text-sm font-medium">{customer.CODIGO}</span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          minWidth: CUSTOMERS_TABLE_COLUMNS.ATIVO.width,
        }}
      >
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            customer.ATIVO === "SIM"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          {customer.ATIVO || "N/D"}
        </span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          minWidth: CUSTOMERS_TABLE_COLUMNS.PESSOA.width,
        }}
      >
        <span className="text-sm">
          {customer.PESSOA === "FIS" ? "Física" : customer.PESSOA === "JUR" ? "Jurídica" : "N/D"}
        </span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          minWidth: CUSTOMERS_TABLE_COLUMNS.RAZAO.width,
          width: "100%",
        }}
      >
        <p className="truncate text-sm font-medium" title={customer.RAZAO || "N/D"}>
          {customer.RAZAO || "N/D"}
        </p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          minWidth: CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.width,
        }}
      >
        <span className="font-mono text-sm">{formatCpfCnpj(customer.CPF_CNPJ) || "N/D"}</span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          minWidth: CUSTOMERS_TABLE_COLUMNS.CIDADE.width,
        }}
      >
        <span className="text-sm">{customer.CIDADE || "N/D"}</span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          minWidth: CUSTOMERS_TABLE_COLUMNS.COD_ERP.width,
        }}
      >
        <p className="font-mono text-sm">{customer.COD_ERP || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          minWidth: CUSTOMERS_TABLE_COLUMNS.ACTIONS.width,
        }}
      >
        <div className="flex items-center gap-1">
          <IconButton
            title={
              isSystemCustomer ? "Cliente padrão do sistema não pode ser editado" : "Editar Cliente"
            }
            onClick={() => openEditModalHandler(customer)}
            size="small"
            disabled={isSystemCustomer}
            className="text-blue-600 hover:bg-blue-50 disabled:text-slate-400 dark:text-blue-400 dark:hover:bg-blue-950/30"
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            title="Ver Contatos"
            onClick={() => openContactModalHandler(customer)}
            size="small"
            className="text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
          >
            <ViewAgenda fontSize="small" />
          </IconButton>
        </div>
      </TableCell>
    </TableRow>
  );
}
