"use client";
import { Table, TableBody, TableContainer, TableHead, TablePagination } from "@mui/material";
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { ArrowForward, ArrowBack } from "@mui/icons-material";
import { useContext, useEffect, useMemo, useState } from "react";
import { UsersContext } from "../context";
import UsersTableRow from "./users-row";
import { StyledTableCell, StyledTableRow } from "./styles-table";

export default function UsersTable() {
  const { users, loading } = useContext(UsersContext);
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
    if (!loading && users.length > 0) {
      return (
        <TableBody>
          {users.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((user, index) => (
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
  }, [users, page, rowsPerPage, loading]);

  return (
    <div className="relative flex flex-col h-[calc(100vh-100px)]">
      <TableContainer className="mx-auto w-full bg-indigo-700 bg-opacity-5 shadow-md flex-1 mb-20">
        <Table>
          <TableHead>
            <StyledTableRow className="sticky top-0 rounded-md bg-indigo-900">
              <StyledTableCell>Código</StyledTableCell>
              <StyledTableCell>Nome</StyledTableCell>
              <StyledTableCell>Login</StyledTableCell>
              <StyledTableCell>Email</StyledTableCell>
              <StyledTableCell>Nivel</StyledTableCell>
              <StyledTableCell>Setor</StyledTableCell>
              <StyledTableCell />
            </StyledTableRow>
          </TableHead>
          {rows}
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={users.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50]}
        sx={{
          position: "sticky",
          bottom: 0,
          alignSelf: "center"
        }}
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
        labelRowsPerPage="Linhas por página:"
      />
    </div>
  );
}