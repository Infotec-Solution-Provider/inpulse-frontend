"use client";
import { Button, Table, TableBody, TableContainer, TableHead, TablePagination, TableSortLabel } from "@mui/material";
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { useContext, useEffect, useMemo, useState } from "react";
import { UsersContext } from "../context";
import UsersTableRow from "./users-row";
import { StyledTableCell, StyledTableRow } from "./styles-table";

export default function UsersTable() {
  const { users, loading, sortedUsers, order, orderBy, handleSort, openUserModal } = useContext(UsersContext);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => setPage(0), [users]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
            <StyledTableCell colSpan={8}>
              Nenhum usuário encontrado
            </StyledTableCell>
          </StyledTableRow>
        </TableBody>
      );
    }
  }, [sortedUsers, page, rowsPerPage, loading]);

  return (
    <div className="relative flex flex-col h-[calc(100vh-100px)]">
      <TableContainer className="mx-auto w-full bg-indigo-700 bg-opacity-5 shadow-md flex-1">
        <Table>
          <TableHead>
            <StyledTableRow className="sticky top-0 rounded-md bg-indigo-900">
              <StyledTableCell sx={{ width: '70px' }} sortDirection={orderBy === 'CODIGO' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'CODIGO'}
                  direction={orderBy === 'CODIGO' ? order : 'asc'}
                  onClick={() => handleSort('CODIGO')}
                >
                  Código
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell sx={{ width: '350px' }} sortDirection={orderBy === 'NOME' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'NOME'}
                  direction={orderBy === 'NOME' ? order : 'asc'}
                  onClick={() => handleSort('NOME')}
                >
                  Nome
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell sx={{ width: '150px' }} sortDirection={orderBy === 'LOGIN' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'LOGIN'}
                  direction={orderBy === 'LOGIN' ? order : 'asc'}
                  onClick={() => handleSort('LOGIN')}
                >
                  Login
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell sx={{ minWidth: '350px' }} sortDirection={orderBy === 'EMAIL' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'EMAIL'}
                  direction={orderBy === 'EMAIL' ? order : 'asc'}
                  onClick={() => handleSort('EMAIL')}
                >
                  Email
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell sx={{ width: '50px' }} sortDirection={orderBy === 'NIVEL' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'NIVEL'}
                  direction={orderBy === 'NIVEL' ? order : 'asc'}
                  onClick={() => handleSort('NIVEL')}
                >
                  Nível
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell sx={{ width: '50px' }} sortDirection={orderBy === 'SETOR' ? order : false}>
                <TableSortLabel
                  active={orderBy === 'SETOR'}
                  direction={orderBy === 'SETOR' ? order : 'asc'}
                  onClick={() => handleSort('SETOR')}
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
      <div className="flex sticky bottom-0 self-center pt-4 pb-2">
        <Button onClick={() => openUserModal()} variant="outlined">
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
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
          labelRowsPerPage="Usuários por página:"
        />
      </div>
    </div>
  );
}