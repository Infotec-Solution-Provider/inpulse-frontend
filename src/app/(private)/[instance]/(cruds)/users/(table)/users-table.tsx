"use client";
import { Table, TableBody, TableContainer, TableHead } from "@mui/material";
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { ArrowForward, ArrowBack } from "@mui/icons-material";
import { useContext, useMemo, useState } from "react";
import { UsersContext } from "../context";
import UsersTableRow from "./users-row";
import { StyledTableCell, StyledTableRow } from "./styles-table";

export default function UsersTable() {
  const { users, loading } = useContext(UsersContext);
  const [page, setPage] = useState<number>(0);
  const totalPages = Math.ceil(users.length / 10);

  const rows = useMemo(() => {
    if (!loading && users.length > 0) {
      return (
        <TableBody>
          {users.slice(page * 10, (page + 1) * 10).map((user, index) => (
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
  }, [users, page, loading]);

  return (
    <>
      <TableContainer className="mx-auto max-h-[40rem] w-full rounded-md bg-indigo-700 bg-opacity-5 shadow-md">
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
      <div className="flex h-fit w-full justify-center gap-4 px-4 pb-2 pt-0">
        <button
          className={`${page === 0 ? "text-gray-400" : "text-indigo-700"}`}
          onClick={() => page > 0 && setPage(page - 1)}
          disabled={page === 0}
        >
          <ArrowBack />
        </button>
        {page + 1}/{totalPages || 1}
        <button
          className={`${page + 1 === totalPages ? "text-gray-400" : "text-indigo-700"}`}
          onClick={() => page + 1 < (totalPages || 1) && setPage(page + 1)}
          disabled={page + 1 === totalPages}
        >
          <ArrowForward />
        </button>
      </div>
    </>
  );
}