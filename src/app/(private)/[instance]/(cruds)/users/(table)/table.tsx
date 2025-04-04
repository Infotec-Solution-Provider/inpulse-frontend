"use client";
import { Table, TableBody, TableContainer, TableHead } from "@mui/material";
import { StyledTableCell, StyledTableRow } from "./table-style";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import { useContext, useState } from "react";
import { UsersContext } from "../context";
import UsersTableRow from "./table-row";

export default function UsersTable() {
  const { users } = useContext(UsersContext);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>();

  return (
    <>
      <TableContainer className="mx-auto max-h-[40rem] w-full rounded-md bg-indigo-700 bg-opacity-5 shadow-md">
        <Table className="table-fixed w-full">
          <TableHead>
            <StyledTableRow className="sticky w-full top-0 rounded-md bg-indigo-900">
              <StyledTableCell>Código</StyledTableCell>
              <StyledTableCell>Nome</StyledTableCell>
              <StyledTableCell>Nível</StyledTableCell>
              <StyledTableCell>Login</StyledTableCell>
              <StyledTableCell>Email</StyledTableCell>
              <StyledTableCell>Setor</StyledTableCell>
              <StyledTableCell className="w-16" />
            </StyledTableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <UsersTableRow user={user} key={user.CODIGO} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <div className="flex h-fit w-full justify-center gap-4 px-4 pb-2 pt-0">
        <button
          className={`${page === 0 ? "text-gray-400" : "text-indigo-700"}`}
          onClick={() => page > 0 && setPage(page - 1)}
          disabled={page === 0}
        >
          <FaArrowLeft />
        </button>
        {page + 1}/{totalPages}
        <button
          className={`${page + 1 === totalPages ? "text-gray-400" : "text-indigo-700"}`}
          onClick={() => page + 1 < (totalPages ?? 1) && setPage(page + 1)}
          disabled={page + 1 === totalPages}
        >
          <FaArrowRight />
        </button>
      </div>
    </>
  );
}
