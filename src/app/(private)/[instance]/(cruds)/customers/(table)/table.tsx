"use client";
import React, { useContext, useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableContainer,
  TablePagination,
  Typography,
  useTheme,
  useMediaQuery,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { Add, ChevronLeft, ChevronRight } from "@mui/icons-material";
import { Customer } from "@in.pulse-crm/sdk";
import { AppContext } from "../../../app-context";
import { useCustomersContext } from "../customers-context";
import EditCustomerModal from "./(modal)/edit-customer-modal";
import CreateCustomerModal from "./(modal)/create-customer-modal";
import ContactsModal from "./(modal)/contacts-modal";
import ClientTableHeader from "./table-header";
import CustomersTableItem from "./table-item";
import { StyledTableCell, StyledTableRow } from "./mui-style";

// Simulação de toast para o projeto
const toast = {
  error: (message: string) => console.error(message),
  success: (message: string) => console.log(message),
};

export default function CustomersTable() {
  const { openModal } = useContext(AppContext);
  const { state, dispatch, loadCustomers } = useCustomersContext();
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estados para controle da paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const isDarkMode = theme.palette.mode === 'dark';

  // Verificar se estamos no navegador para evitar erros de SSR
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const openEditCustomerModal = (customer: Customer) => {
    openModal(<EditCustomerModal customer={customer} />);
  };

  const openCreateCustomerModal = () => {
    openModal(<CreateCustomerModal />);
  };

  const openContactModal = (customer: Customer) => {
    openModal(<ContactsModal customer={customer} />);
  };

  // Função para mudar a página
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    dispatch({ type: "change-page", page: newPage + 1 }); // +1 porque a API começa em 1
  };

  // Função para mudar itens por página
  const handleChangeRowsPerPage = (event: SelectChangeEvent<number>) => {
    const newRowsPerPage = Number(event.target.value);
    setRowsPerPage(newRowsPerPage);
    setPage(0); // Resetar para a primeira página
    dispatch({ type: "change-per-page", perPage: newRowsPerPage });
    dispatch({ type: "change-page", page: 1 });
  };

  // Removido o carregamento duplicado, pois já é tratado no contexto
  // O estado de loading agora vem diretamente do contexto

  // Valores para a paginação
  const totalRows = state.totalRows || 0;

  if (!isClient) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2 }}>
        <Typography variant="h6" component="h2" sx={{ color: 'text.primary' }}>
          Clientes
        </Typography>
        <IconButton
          onClick={openCreateCustomerModal}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            width: 48,
            height: 48,
            '&:hover': { 
              bgcolor: 'primary.dark',
              transform: 'scale(1.05)'
            },
            transition: 'all 0.2s ease-in-out',
            boxShadow: 2
          }}
        >
          <Add fontSize="large" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
          <Table stickyHeader aria-label="tabela de clientes" size={isMobile ? 'small' : 'medium'}>
            <ClientTableHeader />
            <TableBody>
              {state.isLoading ? (
                <StyledTableRow>
                  <StyledTableCell colSpan={8} align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                      <CircularProgress size={24} />
                      <Typography variant="body2" sx={{ ml: 2 }}>Carregando clientes...</Typography>
                    </Box>
                  </StyledTableCell>
                </StyledTableRow>
              ) : state.customers.length === 0 ? (
                <StyledTableRow>
                  <StyledTableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1">Nenhum cliente encontrado</Typography>
                  </StyledTableCell>
                </StyledTableRow>
              ) : (
                state.customers.map((customer) => (
                  <CustomersTableItem
                    key={customer.CODIGO}
                    customer={customer}
                    openEditModalHandler={openEditCustomerModal}
                    openContactModalHandler={openContactModal}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            p: 1, 
            borderTop: 1, 
            borderColor: 'divider',
            bgcolor: isDarkMode ? 'background.paper' : 'grey.50'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Itens por página:
            </Typography>
            <Select
              value={rowsPerPage}
              onChange={handleChangeRowsPerPage}
              size="small"
              sx={{ height: 32, fontSize: '0.875rem' }}
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            {`${page * rowsPerPage + 1}-${Math.min(
              (page + 1) * rowsPerPage,
              totalRows
            )} de ${totalRows}`}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              onClick={() => handleChangePage(null, page - 1)}
              disabled={page === 0}
              size="small"
              sx={{ opacity: page === 0 ? 0.5 : 1 }}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => handleChangePage(null, page + 1)}
              disabled={(page + 1) * rowsPerPage >= totalRows}
              size="small"
              sx={{ opacity: (page + 1) * rowsPerPage >= totalRows ? 0.5 : 1 }}
            >
              <ChevronRight />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
