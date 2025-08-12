"use client";
import {
  Button,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TablePagination,
  TableSortLabel,
} from "@mui/material";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import { useContext, useEffect, useMemo, useState } from "react";
import { UsersContext } from "../users-context";
import UsersTableRow from "./users-row";
import { StyledTableCell, StyledTableRow } from "./styles-table";

export default function UsersTable() {
  const { users, loading, sortedUsers, order, orderBy, handleSort, openUserModal, sectors } =
    useContext(UsersContext);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => setPage(0), [users]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const rows = useMemo(() => {
    if (!loading && sortedUsers.length > 0) {
      return (
        <TableBody>
          {sortedUsers.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((user, index) => (
            <UsersTableRow
              key={`${user.NOME}_${user.CODIGO}`}
              user={user}
              index={index + page * 10}
              sectors={sectors}
            />
          ))}
        </TableBody>
      );
    } else if (loading) {
      return (
        <TableBody>
          <StyledTableRow className="h-32 w-full items-center justify-center text-center text-gray-400">
            <StyledTableCell colSpan={8} className="flex items-center justify-center gap-2">
              <HourglassBottomIcon /> Carregando usuários...
            </StyledTableCell>
          </StyledTableRow>
        </TableBody>
      );
    } else {
      return (
        <TableBody>
          <StyledTableRow className="h-32 w-full items-center justify-center text-center text-gray-400">
            <StyledTableCell colSpan={8}>Nenhum usuário encontrado</StyledTableCell>
          </StyledTableRow>
        </TableBody>
      );
    }
  }, [sortedUsers, page, rowsPerPage, loading]);

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden">
      <TableContainer className="w-full flex-1 bg-indigo-700 bg-opacity-5 shadow-md rounded-lg overflow-auto">
        <Table>
          <TableHead>
            <StyledTableRow className="sticky top-0 rounded-md bg-indigo-900">
              <StyledTableCell
                sx={{ width: "70px" }}
                sortDirection={orderBy === "CODIGO" ? order : false}
              >
                <TableSortLabel
                  active={orderBy === "CODIGO"}
                  direction={orderBy === "CODIGO" ? order : "asc"}
                  onClick={() => handleSort("CODIGO")}
                >
                  Código
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell
                sx={{ width: "350px" }}
                sortDirection={orderBy === "NOME" ? order : false}
              >
                <TableSortLabel
                  active={orderBy === "NOME"}
                  direction={orderBy === "NOME" ? order : "asc"}
                  onClick={() => handleSort("NOME")}
                >
                  Nome
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell
                sx={{ width: "150px" }}
                sortDirection={orderBy === "LOGIN" ? order : false}
              >
                <TableSortLabel
                  active={orderBy === "LOGIN"}
                  direction={orderBy === "LOGIN" ? order : "asc"}
                  onClick={() => handleSort("LOGIN")}
                >
                  Login
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell
                sx={{ minWidth: "350px" }}
                sortDirection={orderBy === "EMAIL" ? order : false}
              >
                <TableSortLabel
                  active={orderBy === "EMAIL"}
                  direction={orderBy === "EMAIL" ? order : "asc"}
                  onClick={() => handleSort("EMAIL")}
                >
                  Email
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell
                sx={{ width: "50px" }}
                sortDirection={orderBy === "NIVEL" ? order : false}
              >
                <TableSortLabel
                  active={orderBy === "NIVEL"}
                  direction={orderBy === "NIVEL" ? order : "asc"}
                  onClick={() => handleSort("NIVEL")}
                >
                  Nível
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell
                sx={{ width: "50px" }}
                sortDirection={orderBy === "SETOR" ? order : false}
              >
                <TableSortLabel
                  active={orderBy === "SETOR"}
                  direction={orderBy === "SETOR" ? order : "asc"}
                  onClick={() => handleSort("SETOR")}
                >
                  Setor
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell />
            </StyledTableRow>
          </TableHead>
          {rows}
        </Table>
      </TableContainer>
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 backdrop-blur-sm w-full border-t border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-2 sm:px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button 
            onClick={() => openUserModal()} 
            variant="outlined"
            size="small"
            className="w-full sm:w-auto"
          >
            Cadastrar usuário
          </Button>
          <TablePagination
            component="div"
            count={users.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            labelDisplayedRows={({ from, to, count }) => (
              <span className="text-sm whitespace-nowrap">
                {`${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
              </span>
            )}
            labelRowsPerPage={<span className="text-sm whitespace-nowrap">Linhas:</span>}
            className="[& .MuiTablePagination-selectLabel]:m-0 [& .MuiTablePagination-displayedRows]:m-0 [& .MuiTablePagination-toolbar]:flex-wrap [& .MuiTablePagination-toolbar]:gap-2 [& .MuiTablePagination-actions]:ml-2"
            sx={{
              '& .MuiTablePagination-select': {
                padding: '6px 24px 6px 8px',
                marginRight: '8px',
                marginLeft: '4px',
              },
              '& .MuiTablePagination-selectIcon': {
                right: '4px',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
