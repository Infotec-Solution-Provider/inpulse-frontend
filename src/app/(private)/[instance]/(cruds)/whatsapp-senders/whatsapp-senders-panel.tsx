"use client";

import { InternalChatContext } from "@/app/(private)/[instance]/internal-context";
import { PaginatedInternalWhatsappSenders } from "@/lib/sdk-local";
import { Refresh as RefreshIcon } from "@/lib/ui-system/crm-icons";
import { Search as SearchIcon } from "@/lib/ui-system/crm-icons";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from "@mui/material";
import { useCallback, useContext, useEffect, useState } from "react";
import { CrmPage, CrmToolbar } from "@/lib/ui-system";
import AssignSenderNameDialog from "./assign-sender-name-dialog";
import SenderMessagesDialog from "./sender-messages-dialog";
import SenderRow from "./sender-row";

const EMPTY_PAGE: PaginatedInternalWhatsappSenders = {
  items: [],
  page: 1,
  perPage: 20,
  total: 0,
  totalPages: 0,
};

export default function WhatsappSendersPanel() {
  const { internalApi } = useContext(InternalChatContext);
  const [data, setData] = useState(EMPTY_PAGE);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [historySenderId, setHistorySenderId] = useState<string | null>(null);
  const [assignSenderId, setAssignSenderId] = useState<string | null>(null);

  const loadSenders = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const response = await internalApi.current.getUnidentifiedWhatsappSenders({
        page,
        perPage: 20,
        search,
      });
      setData(response);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [internalApi, page, search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    void loadSenders();
  }, [loadSenders]);

  function handleAssigned(senderId: string) {
    setHistorySenderId(null);
    const shouldReturnToPreviousPage = data.items.length === 1 && page > 1;
    setData((current) => ({
      ...current,
      items: current.items.filter((sender) => sender.senderId !== senderId),
      total: Math.max(current.total - 1, 0),
    }));
    if (shouldReturnToPreviousPage) {
      setPage((current) => current - 1);
    } else {
      void loadSenders();
    }
  }

  return (
    <CrmPage
      title="Identificar remetentes"
      description="Consulte mensagens recebidas nos grupos internos e atribua um nome ao remetente."
      count={isLoading ? undefined : data.total}
      breadcrumbs={[{ label: "Comunicação" }, { label: "Identificar remetentes" }]}
    >
      <CrmToolbar>
        <TextField
          size="small"
          label="Buscar ID do WhatsApp"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Tooltip title="Atualizar lista">
          <span>
            <IconButton
              aria-label="Atualizar lista"
              onClick={() => void loadSenders()}
              disabled={isLoading}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </CrmToolbar>

      {hasError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void loadSenders()}>Tentar novamente</Button>}
        >
          Não foi possível carregar os remetentes sem nome.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" className="ip-crud-table">
        <Table>
          <TableHead className="bg-[var(--ip-surface)]">
            <TableRow>
              <TableCell>ID do WhatsApp</TableCell>
              <TableCell align="center">Mensagens</TableCell>
              <TableCell>Mensagem mais recente</TableCell>
              <TableCell>Grupo</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex h-64 items-center justify-center">
                    <CircularProgress size={34} />
                  </div>
                </TableCell>
              </TableRow>
            ) : data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <p className="font-medium text-[var(--ip-text)]">
                      Nenhum ID sem nome encontrado
                    </p>
                    <p className="mt-1 text-sm text-[var(--ip-muted)]">
                      {search
                        ? "Tente outro termo de busca."
                        : "Todos os remetentes estão identificados."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((sender) => (
                <SenderRow
                  key={sender.senderId}
                  sender={sender}
                  onHistory={() => setHistorySenderId(sender.senderId)}
                  onAssign={() => setAssignSenderId(sender.senderId)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {data.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            page={page}
            count={data.totalPages}
            onChange={(_, nextPage) => setPage(nextPage)}
            color="primary"
          />
        </div>
      )}

      <SenderMessagesDialog
        senderId={historySenderId}
        onClose={() => setHistorySenderId(null)}
        onAssignName={(senderId) => setAssignSenderId(senderId)}
      />
      <AssignSenderNameDialog
        senderId={assignSenderId}
        onClose={() => setAssignSenderId(null)}
        onAssigned={handleAssigned}
      />
    </CrmPage>
  );
}
