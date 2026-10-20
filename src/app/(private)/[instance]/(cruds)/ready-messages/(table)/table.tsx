"use client";
import { CrmPage, CrmFilters, CrmTableHead, useCrmQueryState } from "@/lib/ui-system";
import { Plus } from "lucide-react";

import { ReadyMessage } from "@/lib/sdk-local";
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
  const {
    state,
    dispatch,
    sectors,
    createReadyMessage,
    updateReadyMessage,
    deleteReadyMessage,
    loadReadyMessages,
  } = useReadyMessagesContext();

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

  const [query, setQuery] = useCrmQueryState("ready-messages-list", {
    filters: {} as Record<string, string>,
    page: 0,
    perPage: 10,
  });
  const filtered = state.readyMessages.filter(
    (row) =>
      (!query.filters.title ||
        row.title?.toLocaleLowerCase().includes(query.filters.title.toLocaleLowerCase())) &&
      (!query.filters.id || String(row.id).includes(query.filters.id)) &&
      (!query.filters.message ||
        row.message?.toLocaleLowerCase().includes(query.filters.message.toLocaleLowerCase())) &&
      (!query.filters.sectorId || String(row.sectorId) === query.filters.sectorId),
  );
  const page = Math.min(query.page, Math.max(0, Math.ceil(filtered.length / query.perPage) - 1));
  const rows = filtered.slice(page * query.perPage, (page + 1) * query.perPage);
  return (
    <CrmPage
      title="Mensagens prontas"
      description="Organize textos, arquivos e mensagens disponíveis para cada setor."
      count={state.isLoading ? undefined : filtered.length}
      breadcrumbs={[{ label: "Comunicação" }, { label: "Mensagens prontas" }]}
      actions={
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={openCreateReadyMessageModal}
        >
          Nova mensagem
        </Button>
      }
    >
      <CrmFilters
        fields={[
          { key: "title", label: "Título" },
          { key: "id", label: "Código" },
          { key: "message", label: "Mensagem" },
          {
            key: "sectorId",
            label: "Setor",
            options: sectors.map((sector) => ({ value: String(sector.id), label: sector.name })),
          },
        ]}
        values={query.filters}
        onApply={(filters) => setQuery((current) => ({ ...current, filters, page: 0 }))}
        onRefresh={() => loadReadyMessages()}
        loading={state.isLoading}
      />
      <div className="ip-crud-table">
        <TableContainer>
          <Table size="small" aria-label="Mensagens prontas">
            <CrmTableHead
              labels={["Código", "Título", "Arquivo", "Mensagem", "Setor", "Atualização", "Ações"]}
            />
            <TableBody>
              {state.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="ip-crud-state">
                      <CircularProgress size={24} />
                      <span>Carregando...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="ip-crud-state">Nenhum registro encontrado.</div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <ReadyMessagesTableItem
                    key={row.id}
                    readyMessage={row}
                    sectorName={sectors?.find((s) => s.id === row.sectorId)?.name}
                    openEditModalHandler={openEditReadyMessageModal}
                    openDeleteModalHandler={openDeleteReadyMessageModal}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        rowsPerPage={query.perPage}
        onPageChange={(_, page) => setQuery((current) => ({ ...current, page }))}
        onRowsPerPageChange={(event) =>
          setQuery((current) => ({ ...current, page: 0, perPage: Number(event.target.value) }))
        }
        labelRowsPerPage="Por página"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
      />
    </CrmPage>
  );
}
