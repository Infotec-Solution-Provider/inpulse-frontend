"use client";
import UserTableItem from "./table-item";
import { CircularProgress, Table, TableBody, TableContainer, TablePagination } from "@mui/material";
import { ChangeEvent, useContext, useEffect, useMemo, useState } from "react";
import { User, PaginatedResponse, RequestFilters } from "@in.pulse-crm/sdk";
import { AuthContext } from "@/app/auth-context";
import { toast } from "react-toastify";
import { StyledTableCell, StyledTableRow } from "./mui-style";
import usersService from "@/lib/services/users.service";
import UsersTableHeader from "./table-header";

export default function OperatorsTable() {
  const [users, setUsers] = useState<Partial<User>[]>([]);
  const { token } = useContext(AuthContext);

  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>();
  const [rowsPerPage, setRowsPerPage] = useState<string>("10");
  const [filters, setFilters] = useState<RequestFilters<User>>();

  const [loading, setLoading] = useState<boolean>(true);
  const [firstLoading, setFirstLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      usersService.setAuth(token);
      usersService
        .getUsers({ perPage: rowsPerPage, page: "1" })
        .then((response: PaginatedResponse<User>) => {
          setUsers(response.data);
          setTotalPages(response.page.totalRows);
          setPage(response.page.current);
          setLoading(false);
          setFirstLoading(false);
        });
    } else {
      toast.error(
        "Erro ao carregar operadores, token inválido ou expirado. Recarregue a pagina ou faça login novamente",
      );
    }
  }, []);

  function pageChangeHandler(next?: boolean) {
    setLoading(true);

    if (next) {
      usersService
        .getUsers({ ...filters, page: `${page + 1}`, perPage: rowsPerPage })
        .then((response: PaginatedResponse<User>) => {
          setUsers(response.data);
          setPage(response.page.current);
          setTotalPages(response.page.totalRows);
          setLoading(false);
        });
    } else {
      usersService
        .getUsers({ ...filters, page: `${page - 1}`, perPage: rowsPerPage })
        .then((response: PaginatedResponse<User>) => {
          setUsers(response.data);
          setPage(response.page.current);
          setTotalPages(response.page.totalRows);
          setLoading(false);
        });
    }
  }

  function rowsPerPageChangeHandler(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setRowsPerPage(e.target.value);
    setPage(1);
    setLoading(true);
    usersService
      .getUsers({ ...filters, perPage: e.target.value })
      .then((response: PaginatedResponse<User>) => {
        setUsers(response.data);
        setPage(response.page.current);
        setTotalPages(response.page.totalRows);
        setLoading(false);
      });
  }

  const rows = useMemo(() => {
    if (users && users.length > 0 && !loading) {
      return (
        <TableBody>
          {users.map((operator) => (
            <UserTableItem key={`${operator.NOME}_${operator.CODIGO}`} User={operator} />
          ))}
        </TableBody>
      );
    } else {
      return (
        <TableBody>
          <StyledTableRow className="h-32 w-full">
            <StyledTableCell
              colSpan={8}
              className="flex items-center justify-center text-center text-gray-400"
            >
              <div className="flex flex-col items-center">
                <CircularProgress />
                <span className="mt-2">Carregando operadores...</span>
              </div>
            </StyledTableCell>
          </StyledTableRow>
        </TableBody>
      );
    }
  }, [users, page]);

  return (
    <>
      <TableContainer className="mx-auto max-h-[75vh] overflow-auto rounded-md bg-indigo-700 bg-opacity-5 shadow-md">
        <Table className="max-h-[100%] overflow-auto">
          <UsersTableHeader
            rowsPerPage={rowsPerPage}
            setLoading={setLoading}
            setPage={setPage}
            setTotalPages={setTotalPages}
            setUsers={setUsers}
            filters={filters}
            setFilters={setFilters}
          />
          {rows}
        </Table>
      </TableContainer>
      {!firstLoading && (
        <div className="flex h-fit w-full justify-center gap-4 px-4 pt-0">
          <TablePagination
            component="div"
            count={(totalPages ?? 1) * +rowsPerPage}
            page={page - 1}
            rowsPerPage={+rowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="Entradas por página"
            labelDisplayedRows={({ from, to, count }) => {
              return `${from}-${to} de ${count}`;
            }}
            onRowsPerPageChange={(e) => rowsPerPageChangeHandler(e)}
            onPageChange={(e, newPage) => pageChangeHandler(newPage + 1 > page)}
          />
        </div>
      )}
    </>
  );
}
