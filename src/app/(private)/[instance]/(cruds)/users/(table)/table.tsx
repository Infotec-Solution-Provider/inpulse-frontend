"use client";
import { useAuthContext } from "@/app/auth-context";
import { User } from "@/lib/sdk-local";
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
import { useState } from "react";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/feature-flags";
import UserSipConfigModal from "../(modal)/user-sip-config-modal";
import { useUsersContext } from "../users-context";
import { useWhatsappContext } from "../../../whatsapp-context";
import UsersTableHeader from "./table-header";
import UsersTableItem from "./table-item";

export default function UsersTable() {
  const { token } = useAuthContext();
  const { state, dispatch, openUserModal } = useUsersContext();
  const { parameters } = useWhatsappContext();
  const [sipConfigUser, setSipConfigUser] = useState<User | null>(null);
  const canUseSipConfig = isFeatureEnabled(parameters, FEATURE_FLAGS.sipConfig);

  function openEditUserModal(user: User) {
    openUserModal(user);
  }

  function openSipConfigModal(user: User) {
    setSipConfigUser(user);
  }

  const onChangePage = (page: number) => {
    dispatch({ type: "change-page", page });
  };

  const onChangePerPage = (perPage: number) => {
    dispatch({ type: "change-per-page", perPage });
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
          <UsersTableHeader />
          <TableBody
            sx={{
              minHeight: state.isLoading || state.users.length === 0 ? "300px" : "auto",
            }}
          >
            {state.isLoading && (
              <TableRow sx={{ height: "300px" }}>
                <TableCell
                  colSpan={7}
                  className="border-0"
                  sx={{
                    textAlign: "center",
                    backgroundColor: "transparent",
                  }}
                >
                  <div className="flex flex-col items-center gap-3 py-8">
                    <CircularProgress size={40} />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Carregando usuários...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!state.isLoading && state.users.length === 0 && (
              <TableRow sx={{ height: "300px" }}>
                <TableCell
                  colSpan={7}
                  className="border-0"
                  sx={{
                    textAlign: "center",
                    backgroundColor: "transparent",
                    borderBottom: "none",
                  }}
                >
                  <div className="flex flex-col items-center gap-2 py-8">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Nenhum usuário encontrado
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!state.isLoading &&
              state.users.map((user) => (
                <UsersTableItem
                  key={`${user.NOME}_${user.CODIGO}`}
                  user={user}
                  canUseSipConfig={canUseSipConfig}
                  openEditModalHandler={openEditUserModal}
                  openSipConfigModalHandler={openSipConfigModal}
                />
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row">
        <Button
          onClick={() => openUserModal()}
          variant="contained"
          color="primary"
          size="medium"
          className="w-full sm:w-auto"
        >
          + Cadastrar Usuário
        </Button>
        <TablePagination
          component="div"
          count={Number(state.totalRows || 0)}
          page={Number(state.filters.page || 1) - 1}
          rowsPerPage={Number(state.filters.perPage || 10)}
          labelRowsPerPage="Entradas por página"
          labelDisplayedRows={(info) => {
            const { from, to, count } = info;
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

      {sipConfigUser ? (
        <UserSipConfigModal
          open={Boolean(sipConfigUser)}
          userId={sipConfigUser.CODIGO}
          userName={sipConfigUser.NOME || `Operador #${sipConfigUser.CODIGO}`}
          token={token || undefined}
          onClose={() => setSipConfigUser(null)}
        />
      ) : null}
    </div>
  );
}
