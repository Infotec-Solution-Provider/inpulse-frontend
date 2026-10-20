"use client";
import { CrmPage, CrmFilters, CrmTableHead, useCrmQueryState } from "@/lib/ui-system";
import { Plus } from "lucide-react";

import { InternalGroup } from "@/lib/sdk-local";
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
  const { state, dispatch, loadInternalGroups, wppGroups } = useInternalGroupsContext();

  function openEditInternalGroupModal(group: InternalGroup) {
    openModal(<EditInternalGroupModal group={group} />);
  }

  function openCreateInternalGroupModal() {
    openModal(<CreateInternalGroupModal />);
  }

  function openDeleteInternalGroupModal(group: InternalGroup) {
    openModal(<DeleteInternalGroupModal group={group} />);
  }

  const [query, setQuery] = useCrmQueryState("internal-groups-list", {
    filters: {} as Record<string, string>,
    page: 0,
    perPage: 10,
  });
  const filtered = state.internalGroups.filter(
    (row) =>
      (!query.filters.groupName ||
        row.groupName?.toLocaleLowerCase().includes(query.filters.groupName.toLocaleLowerCase())) &&
      (!query.filters.id || String(row.id).includes(query.filters.id)),
  );
  const page = Math.min(query.page, Math.max(0, Math.ceil(filtered.length / query.perPage) - 1));
  const rows = filtered.slice(page * query.perPage, (page + 1) * query.perPage);
  return (
    <CrmPage
      title="Grupos internos"
      description="Gerencie os usuários do sistema e o grupo conectado pelo WhatsApp."
      count={state.isLoading ? undefined : filtered.length}
      breadcrumbs={[{ label: "Comunicação" }, { label: "Grupos internos" }]}
      actions={
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={openCreateInternalGroupModal}
        >
          Novo grupo
        </Button>
      }
    >
      <CrmFilters
        fields={[
          { key: "groupName", label: "Nome" },
          { key: "id", label: "Código" },
        ]}
        values={query.filters}
        onApply={(filters) => setQuery((current) => ({ ...current, filters, page: 0 }))}
        onRefresh={() => loadInternalGroups({})}
        loading={state.isLoading}
      />
      <div className="ip-crud-table">
        <TableContainer>
          <Table size="small" aria-label="Grupos internos">
            <CrmTableHead
              labels={[
                "Código",
                "Nome",
                "Criação",
                "Criador",
                "Usuários do sistema",
                "Grupo WhatsApp",
                "Ações",
              ]}
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
                  <InternalGroupsTableItem
                    key={row.id}
                    group={row}
                    users={users}
                    wppGroups={wppGroups}
                    openEditModalHandler={openEditInternalGroupModal}
                    openDeleteModalHandler={openDeleteInternalGroupModal}
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
