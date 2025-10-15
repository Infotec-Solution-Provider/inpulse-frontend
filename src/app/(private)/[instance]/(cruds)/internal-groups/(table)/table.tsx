"use client";
import { InternalGroup } from "@in.pulse-crm/sdk";
import {
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableRow,
} from "@mui/material";
import { useContext } from "react";
import { AppContext } from "../../../app-context";
import { InternalChatContext } from "../../../internal-context";
import { useInternalGroupsContext } from "../internal-groups-context";
import CreateInternalGroupModal from "./(modal)/create-internal-group-modal";
import DeleteInternalGroupModal from "./(modal)/delete-internal-group-modal";
import EditInternalGroupModal from "./(modal)/edit-internal-group-modal";
import InternalGroupsTableHeader from "./table-header";
import InternalGroupsTableItem from "./table-item";

export default function InternalGroupsTable() {
  const { openModal } = useContext(AppContext);
  const { users } = useContext(InternalChatContext);
  const { state, dispatch, loadInternalGroups } = useInternalGroupsContext();

  function openEditInternalGroupModal(group: InternalGroup) {
    openModal(<EditInternalGroupModal group={group} />);
  }

  function openCreateInternalGroupModal() {
    openModal(<CreateInternalGroupModal />);
  }

  function openDeleteInternalGroupModal(group: InternalGroup) {
    openModal(<DeleteInternalGroupModal group={group} />);
  }

  const onChangePage = (page: number) => {
    dispatch({ type: "change-page", page });
    loadInternalGroups({ ...state.filters, page: String(page) });
  };

  const onChangePerPage = (perPage: number) => {
    dispatch({ type: "change-per-page", perPage });
    loadInternalGroups({ ...state.filters, perPage: String(perPage) });
  };

  return (
    <div className="flex flex-col gap-4">
      <TableContainer
        className="scrollbar-whatsapp mx-auto overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        sx={{
          height: "calc(100vh - 280px)",
          minHeight: "400px",
          maxHeight: "70vh",
        }}
      >
        <Table className="scrollbar-whatsapp" stickyHeader>
          <InternalGroupsTableHeader />
          <TableBody
            sx={{
              minHeight: state.isLoading || state.internalGroups.length === 0 ? "300px" : "auto",
            }}
          >
            {state.isLoading && (
              <TableRow sx={{ height: "300px" }}>
                <TableCell
                  colSpan={6}
                  className="border-0"
                  sx={{
                    textAlign: "center",
                    backgroundColor: "transparent",
                  }}
                >
                  <div className="flex flex-col items-center gap-3 py-8">
                    <CircularProgress size={40} />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Carregando grupos internos...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!state.isLoading && state.internalGroups.length === 0 && (
              <TableRow sx={{ height: "300px" }}>
                <TableCell
                  colSpan={6}
                  className="border-0"
                  sx={{
                    textAlign: "center",
                    backgroundColor: "transparent",
                  }}
                >
                  <div className="flex flex-col items-center gap-2 py-8">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Nenhum grupo interno encontrado
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!state.isLoading &&
              state.internalGroups.map((group) => (
                <InternalGroupsTableItem
                  key={group.id}
                  group={group}
                  users={users}
                  openEditModalHandler={openEditInternalGroupModal}
                  openDeleteModalHandler={openDeleteInternalGroupModal}
                />
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row">
        <Button
          onClick={openCreateInternalGroupModal}
          variant="contained"
          color="primary"
          size="medium"
          className="w-full sm:w-auto"
        >
          + Cadastrar Grupo
        </Button>
        <TablePagination
          component="div"
          count={state.totalRows}
          page={Math.max(0, +(state.filters.page ?? 1) - 1)}
          rowsPerPage={+(state.filters.perPage ?? 10)}
          labelRowsPerPage="Entradas por página"
          labelDisplayedRows={({ from, to, count }) => {
            return `${from}-${to} de ${count}`;
          }}
          onRowsPerPageChange={(e) => onChangePerPage(+e.target.value)}
          onPageChange={(_, newPage) => onChangePage(newPage)}
          sx={{
            ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows": {
              marginBottom: 0,
            },
          }}
        />
      </div>
    </div>
  );
}
