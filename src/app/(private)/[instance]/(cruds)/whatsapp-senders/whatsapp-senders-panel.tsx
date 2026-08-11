"use client";

import { InternalChatContext } from "@/app/(private)/[instance]/internal-context";
import { PaginatedInternalWhatsappSenders } from "@/lib/sdk-local";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-5 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Identificação de remetentes
            </h1>
            <Chip
              color={data.total > 0 ? "warning" : "success"}
              label={`${data.total} ID${data.total === 1 ? "" : "s"} sem nome`}
              size="small"
            />
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-300">
            Consulte as mensagens recebidas nos grupos internos para reconhecer um ID do WhatsApp e
            atribuir o nome que será exibido nas conversas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TextField
            size="small"
            placeholder="Buscar ID do WhatsApp"
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
              <IconButton onClick={() => void loadSenders()} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>

      {hasError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void loadSenders()}>Tentar novamente</Button>}
        >
          Não foi possível carregar os remetentes sem nome.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" className="overflow-hidden">
        <Table>
          <TableHead className="bg-slate-100 dark:bg-slate-800">
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
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      Nenhum ID sem nome encontrado
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
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
    </div>
  );
}
