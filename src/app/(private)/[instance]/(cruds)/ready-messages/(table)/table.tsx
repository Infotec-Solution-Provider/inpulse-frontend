"use client";
import { ReadyMessage } from "@in.pulse-crm/sdk";
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
import CreateReadyMessageModal from "../(modal)/create-ready-message-modal";
import DeleteReadyMessageModal from "../(modal)/delete-ready-message-moda";
import UpdateReadyMessageModal from "../(modal)/update-ready-message-modal";
import { useAppContext } from "../../../app-context";
import { useReadyMessagesContext } from "../ready-messages-context";
import ReadyMessagesTableHeader from "./table-header";
import ReadyMessagesTableItem from "./table-item";

export default function ReadyMessagesTable() {
  const { openModal } = useAppContext();
  const { state, dispatch, sectors, createReadyMessage, updateReadyMessage, deleteReadyMessage } =
    useReadyMessagesContext();

  function openEditReadyMessageModal(readyMessage: ReadyMessage) {
    openModal(
      <UpdateReadyMessageModal
        onSubmit={(data, file) => updateReadyMessage(readyMessage.id, data, file)}
        readyMessage={readyMessage}
      />,
    );
  }

  function openCreateReadyMessageModal() {
    openModal(
      <CreateReadyMessageModal onSubmit={(data, file) => createReadyMessage(data, file)} />,
    );
  }

  function openDeleteReadyMessageModal(readyMessage: ReadyMessage) {
    openModal(
      <DeleteReadyMessageModal
        readyMessageId={readyMessage.id}
        readyMessageName={readyMessage.title || ""}
        deleteGroup={deleteReadyMessage}
      />,
    );
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
          <ReadyMessagesTableHeader />
          <TableBody
            sx={{
              minHeight: state.isLoading || state.readyMessages.length === 0 ? "300px" : "auto",
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
                      Carregando mensagens prontas...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!state.isLoading && state.readyMessages.length === 0 && (
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
                      Nenhuma mensagem pronta encontrada
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!state.isLoading &&
              state.readyMessages.map((readyMessage) => (
                <ReadyMessagesTableItem
                  key={`${readyMessage.id}`}
                  readyMessage={readyMessage}
                  sectorName={sectors?.find((s) => s.id === readyMessage.sectorId)?.name}
                  openEditModalHandler={openEditReadyMessageModal}
                  openDeleteModalHandler={openDeleteReadyMessageModal}
                />
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row">
        <Button
          onClick={openCreateReadyMessageModal}
          variant="contained"
          color="primary"
          size="medium"
          className="w-full sm:w-auto"
        >
          + Cadastrar Mensagem Pronta
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
    </div>
  );
}
