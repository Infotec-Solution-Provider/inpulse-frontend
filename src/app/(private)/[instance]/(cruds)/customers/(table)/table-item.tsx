import { Edit, Sell, ViewAgenda } from "@mui/icons-material";
import formatCpfCnpj from "@/lib/utils/format-cnpj";
import { Customer } from "@in.pulse-crm/sdk";
import { Chip, IconButton, Skeleton, TableCell, TableRow, Tooltip } from "@mui/material";
import { CUSTOMERS_TABLE_COLUMNS } from "./table-config";
import { CustomerProfileSummaryPayload } from "@/lib/types/customer-profile-summary";

interface ClientListItemProps {
  customer: Customer;
  profileSummary: CustomerProfileSummaryPayload | null;
  isProfileLoading: boolean;
  openEditProfileTagsHandler: (customer: Customer) => void;
  openEditModalHandler: (customer: Customer) => void;
  openContactModalHandler: (customer: Customer) => void;
}

export default function CustomersTableItem({
  customer,
  profileSummary,
  isProfileLoading,
  openEditProfileTagsHandler,
  openEditModalHandler,
  openContactModalHandler,
}: ClientListItemProps) {
  const qualificationChips = profileSummary
    ? [
        {
          key: "summary",
          label: profileSummary.label,
          color: profileSummary.color,
        },
        {
          key: "purchase-interest",
          label: profileSummary.purchaseInterest.label,
          color: profileSummary.purchaseInterest.color,
        },
        {
          key: "interaction",
          label: profileSummary.tags.interaction.label,
          color: profileSummary.tags.interaction.color,
        },
        {
          key: "purchase",
          label: profileSummary.tags.purchase.label,
          color: profileSummary.tags.purchase.color,
        },
        {
          key: "age",
          label: profileSummary.tags.age.label,
          color: profileSummary.tags.age.color,
        },
      ]
    : [];

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
          {customer.PESSOA === "FIS"
            ? "Física"
            : customer.PESSOA === "JUR"
              ? "Jurídica"
              : "N/D"}
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
          minWidth: CUSTOMERS_TABLE_COLUMNS.TAGS.width,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {isProfileLoading ? (
              <div className="flex flex-wrap gap-2">
                <Skeleton variant="rounded" width={120} height={24} />
                <Skeleton variant="rounded" width={110} height={24} />
                <Skeleton variant="rounded" width={120} height={24} />
              </div>
            ) : qualificationChips.length ? (
              <div className="flex flex-wrap gap-2">
                {qualificationChips.map((chip) => (
                  <Tooltip key={chip.key} title={chip.label} arrow>
                    <Chip
                      size="small"
                      label={chip.label}
                      sx={{
                        backgroundColor: `${chip.color}20`,
                        borderColor: chip.color,
                        borderWidth: 1,
                        borderStyle: "solid",
                        color: chip.color,
                        fontWeight: 700,
                        maxWidth: "100%",
                        "& .MuiChip-label": {
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        },
                      }}
                    />
                  </Tooltip>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">Sem tags calculadas</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell
        className="px-3 py-3"
        sx={{
          minWidth: CUSTOMERS_TABLE_COLUMNS.ACTIONS.width,
        }}
      >
        <div className="flex items-center gap-1">
          <Tooltip title="Editar tags manuais" arrow>
            <IconButton
              size="small"
              onClick={() => openEditProfileTagsHandler(customer)}
              className="text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
            >
              <Sell fontSize="small" />
            </IconButton>
          </Tooltip>
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
