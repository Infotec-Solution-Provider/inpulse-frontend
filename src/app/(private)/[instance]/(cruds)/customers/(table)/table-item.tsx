import { Edit, ViewAgenda } from "@mui/icons-material";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import { Customer } from "@in.pulse-crm/sdk";
import { IconButton, useTheme } from "@mui/material";
import { useMediaQuery } from "@mui/material";

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
  const theme = useTheme();
  const isDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  return (
    <StyledTableRow 
      className="group hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
      sx={{
        '&:active': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          '@media (prefers-color-scheme: dark)': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
        },
      }}
    >
      <StyledTableCell 
        className="px-2 py-2 whitespace-nowrap"
        sx={{
          minWidth: '80px',
          maxWidth: '120px',
          '@media (max-width: 600px)': {
            minWidth: '70px',
            maxWidth: '90px',
          },
        }}
      >
        <div className="flex flex-col">
          <span 
            className="text-[0.9375rem] font-medium text-gray-900 dark:text-gray-100 truncate"
            title={customer.CODIGO ? String(customer.CODIGO) : ""}
          >
            {customer.CODIGO}
          </span>
        </div>
      </StyledTableCell>
      
      <StyledTableCell 
        className="px-2 py-2"
        sx={{
          minWidth: '180px',
          maxWidth: '300px',
          '@media (max-width: 600px)': {
            minWidth: '120px',
            maxWidth: '200px',
          },
        }}
      >
        <div className="flex flex-col">
          <p 
            className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate"
            title={customer.RAZAO || ""}
          >
            {customer.RAZAO || "Não informado"}
          </p>
        </div>
      </StyledTableCell>
      
      <StyledTableCell 
        className="px-2 py-2 whitespace-nowrap"
        sx={{
          minWidth: '120px',
          maxWidth: '180px',
          '@media (max-width: 600px)': {
            minWidth: '100px',
            maxWidth: '140px',
          },
        }}
      >
        <div className="flex flex-col">
          <p 
            className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate"
            title={customer.CIDADE || ""}
          >
            {customer.CIDADE || "Não informada"}
          </p>
        </div>
      </StyledTableCell>
      
      <StyledTableCell className="px-2 py-2 whitespace-nowrap">
        <div className="flex flex-col">
          <p className="text-xs font-mono text-gray-900 dark:text-gray-100 truncate max-w-[120px]"
             title={customer.CPF_CNPJ 
               ? customer.CPF_CNPJ.length === 11
                 ? customer.CPF_CNPJ.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                 : customer.CPF_CNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
               : ""}>
            {customer.CPF_CNPJ
              ? customer.CPF_CNPJ.length === 11
                ? customer.CPF_CNPJ.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                : customer.CPF_CNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
              : "Não informado"}
          </p>
        </div>
      </StyledTableCell>
      
      <StyledTableCell 
        className="px-2 py-2 whitespace-nowrap"
        sx={{
          minWidth: '80px',
          maxWidth: '120px',
          '@media (max-width: 600px)': {
            minWidth: '60px',
            maxWidth: '90px',
          },
        }}
      >
        <div className="flex flex-col">
          <p 
            className="text-[0.9375rem] font-mono text-gray-900 dark:text-gray-100 truncate"
            title={customer.COD_ERP || ""}
          >
            {customer.COD_ERP || "N/I"}
          </p>
        </div>
      </StyledTableCell>
      
      <StyledTableCell 
        className="px-2 py-2 whitespace-nowrap"
        sx={{
          minWidth: '120px',
          width: 'auto',
          '@media (max-width: 600px)': {
            minWidth: '100px',
            width: 'auto',
          },
        }}
      >
        <div className="flex items-center justify-end gap-1">
          <IconButton 
            title="Editar" 
            onClick={(e) => {
              e.stopPropagation();
              openEditModalHandler(customer);
            }}
            size="small"
            className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            sx={{ 
              padding: '10px',
              '&:active': {
                transform: 'scale(0.9)',
              },
              '& .MuiSvgIcon-root': { 
                fontSize: '1.5rem',
                width: '1.5rem',
                height: '1.5rem',
                '@media (max-width: 600px)': {
                  fontSize: '1.25rem',
                  width: '1.25rem',
                  height: '1.25rem',
                },
              },
              '@media (max-width: 600px)': {
                padding: '8px',
              },
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <Edit />
          </IconButton>
          <IconButton 
            title="Contatos" 
            onClick={(e) => {
              e.stopPropagation();
              openContactModalHandler(customer);
            }}
            size="small"
            className="text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400"
            sx={{ 
              padding: '10px',
              '&:active': {
                transform: 'scale(0.9)',
              },
              '& .MuiSvgIcon-root': { 
                fontSize: '1.5rem',
                width: '1.5rem',
                height: '1.5rem',
                '@media (max-width: 600px)': {
                  fontSize: '1.25rem',
                  width: '1.25rem',
                  height: '1.25rem',
                },
              },
              '@media (max-width: 600px)': {
                padding: '8px',
              },
              '&:hover': {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ViewAgenda />
          </IconButton>
        </div>
      </StyledTableCell>
    </StyledTableRow>
  );
}
