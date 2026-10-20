"use client";
import { CrmPage, CrmFilters, useCrmQueryState } from "@/lib/ui-system";

import {
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
} from "@mui/material";
import { HourglassBottom as HourglassBottomIcon } from "@/lib/ui-system/crm-icons";
import { useContext, useEffect, useMemo, useState } from "react";
import { WalletsContext } from "../context";
import WalletTableRow from "./wallet-row";
import { StyledTableCell, StyledTableRow } from "./styles-table";
import CreateWalletModal from "../(modal)/wallet-create-modal";

export default function WalletsTable() {
  const { wallets, loading, order, orderBy, handleSort, sortedWallets } =
    useContext(WalletsContext);
  const [page, setPage] = useCrmQueryState<number>("wallets-page", 0);
  const [rowsPerPage, setRowsPerPage] = useCrmQueryState("wallets-per-page", 10);

  const [filters, setFilters] = useCrmQueryState<Record<string, string>>("wallets-list", {});
  const filtered = sortedWallets.filter(
    (wallet) =>
      !filters.name || wallet.name?.toLocaleLowerCase().includes(filters.name.toLocaleLowerCase()),
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const rows = useMemo(() => {
    if (!loading && filtered.length > 0) {
      return (
        <TableBody>
          {filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((wallet, index) => (
            <WalletTableRow
              key={`${wallet.name}_${wallet.id}`}
              wallet={wallet}
              index={index + page * rowsPerPage}
            />
          ))}
        </TableBody>
      );
    } else if (loading) {
      return (
        <TableBody>
          <TableRow>
            <StyledTableCell colSpan={4}>
              <div className="flex w-full justify-center">
                <div className="flex">
                  <HourglassBottomIcon className="animate-spin" />
                  <p className="flex w-full items-center justify-center px-2 align-middle">
                    {" "}
                    Carregando carteiras
                  </p>
                </div>
              </div>
            </StyledTableCell>
          </TableRow>
        </TableBody>
      );
    } else {
      return (
        <TableBody>
          <TableRow>
            <StyledTableCell colSpan={4}>
              <div className="flex w-full justify-center">
                <div className="flex">
                  <p className="flex w-full items-center justify-center px-2 align-middle">
                    Nenhuma carteira encontrada
                  </p>
                </div>
              </div>
            </StyledTableCell>
          </TableRow>
        </TableBody>
      );
    }
  }, [sortedWallets, filters, page, rowsPerPage, loading]);

  return (
    <CrmPage
      title="Carteiras"
      description="Organize as carteiras e seus usuários."
      count={loading ? undefined : filtered.length}
      breadcrumbs={[{ label: "Usuários" }, { label: "Carteiras" }]}
      actions={<CreateWalletModal />}
    >
      <CrmFilters
        fields={[{ key: "name", label: "Nome" }]}
        values={filters}
        onApply={(next) => {
          setFilters(next);
          setPage(0);
        }}
      />
      <TableContainer className="ip-crud-table">
        <Table>
          <TableHead>
            <StyledTableRow className="sticky top-0 rounded-md">
              <StyledTableCell
                sx={{ width: "70px" }}
                sortDirection={orderBy === "id" ? order : false}
              >
                <TableSortLabel
                  active={orderBy === "id"}
                  direction={orderBy === "id" ? order : "asc"}
                  onClick={() => handleSort("id")}
                  sx={{ display: "flex", justifyContent: "center", paddingLeft: "25px" }}
                >
                  ID
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell
                sx={{ width: "250px" }}
                sortDirection={orderBy === "name" ? order : false}
              >
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleSort("name")}
                  sx={{ display: "flex", justifyContent: "center", paddingLeft: "25px" }}
                >
                  Nome
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell sortDirection={orderBy === "userIds" ? order : false}>
                <TableSortLabel
                  active={orderBy === "userIds"}
                  direction={orderBy === "userIds" ? order : "asc"}
                  onClick={() => handleSort("userIds")}
                  sx={{ display: "flex", justifyContent: "center", paddingLeft: "25px" }}
                >
                  Número de integrantes
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell sx={{ textAlign: "center" }}>Ações</StyledTableCell>
            </StyledTableRow>
          </TableHead>
          {rows}
        </Table>
      </TableContainer>
      <div className="sticky bottom-0 flex gap-4 self-center pb-2 pt-4">
        <TablePagination
          component="div"
          count={filtered.length}
          page={Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1))}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
          labelRowsPerPage="Carteiras por página:"
        />
      </div>
    </CrmPage>
  );
}
