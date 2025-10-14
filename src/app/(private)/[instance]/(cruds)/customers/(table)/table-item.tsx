import { Edit, ViewAgenda } from "@mui/icons-material";
import { Customer } from "@in.pulse-crm/sdk";
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
  return (
    <TableRow
      className="even:bg-indigo-700/5 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
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
          width: CUSTOMERS_TABLE_COLUMNS.CODIGO.width,
          minWidth: CUSTOMERS_TABLE_COLUMNS.CODIGO.width,
        }}
      >
        <span className="font-mono text-sm font-medium">{customer.CODIGO}</span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: CUSTOMERS_TABLE_COLUMNS.ATIVO.width,
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
          width: CUSTOMERS_TABLE_COLUMNS.PESSOA.width,
          minWidth: CUSTOMERS_TABLE_COLUMNS.PESSOA.width,
        }}
      >
        <span className="text-sm">
          {customer.PESSOA === "FIS"
            ? "Física"
            : customer.PESSOA === "JUR"
              ? "Jurídica"
              : "Não cadastrado"}
        </span>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: CUSTOMERS_TABLE_COLUMNS.RAZAO.width,
          minWidth: CUSTOMERS_TABLE_COLUMNS.RAZAO.width,
        }}
      >
        <p className="truncate text-sm font-medium">{customer.RAZAO || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.width,
          minWidth: CUSTOMERS_TABLE_COLUMNS.CPF_CNPJ.width,
        }}
      >
        <p className="font-mono text-sm">
          {customer.CPF_CNPJ
            ? customer.CPF_CNPJ.length === 11
              ? customer.CPF_CNPJ.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
              : customer.CPF_CNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
            : "N/D"}
        </p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: CUSTOMERS_TABLE_COLUMNS.CIDADE.width,
          minWidth: CUSTOMERS_TABLE_COLUMNS.CIDADE.width,
        }}
      >
        <p className="truncate text-sm">{customer.CIDADE || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: CUSTOMERS_TABLE_COLUMNS.COD_ERP.width,
          minWidth: CUSTOMERS_TABLE_COLUMNS.COD_ERP.width,
        }}
      >
        <p className="font-mono text-sm">{customer.COD_ERP || "N/D"}</p>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          width: CUSTOMERS_TABLE_COLUMNS.ACTIONS.width,
          minWidth: CUSTOMERS_TABLE_COLUMNS.ACTIONS.width,
        }}
      >
        <div className="flex items-center gap-1">
          <IconButton
            title="Editar Cliente"
            onClick={() => openEditModalHandler(customer)}
            size="small"
            className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
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
