"use client";

import { Alert, Button, Skeleton } from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { useContext } from "react";
import FinishChatModal from "../(main)/(chat)/(actions)/finish-chat-modal";
import TransferChatModal from "../(main)/(chat)/(actions)/transfer-chat-modal";
import { AppContext } from "../app-context";
import useInternalChatContext from "../internal-context";
import { useWhatsappContext } from "../whatsapp-context";
import MonitorCard from "./(components)/card";
import MonitorFilters from "./(components)/filters";
import MonitorToolbar from "./(components)/monitor-toolbar";
import { MonitorSummaryAlert } from "./(components)/summary";
import MonitorPagination from "./(components)/monitor-pagination";
import MonitorConversationPreview from "./(components)/conversation-preview";
import getMonitorCardProps from "./(functions)/get-card-props";
import useMonitorContext from "./context";

export default function ConversationMonitor() {
  const { chats, isLoading, isRefreshing, error, refetch, viewMode } = useMonitorContext();
  const { sectors, setCurrentChat } = useWhatsappContext();
  const { users } = useInternalChatContext();
  const { openModal } = useContext(AppContext);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1800px] flex-col gap-2 p-3 md:px-5 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <MonitorToolbar />
      <MonitorSummaryAlert />
      <MonitorFilters />
      <div className="flex min-h-0 flex-1 flex-col">
        <section
          aria-label="Conversas da monitoria"
          aria-busy={isLoading || isRefreshing}
          className="flex min-h-0 min-w-0 flex-1 flex-col self-stretch"
        >
          {error && (
            <Alert
              severity="error"
              className="mb-3"
              action={
                <Button color="inherit" onClick={refetch} disabled={isLoading || isRefreshing}>
                  Tentar novamente
                </Button>
              }
            >
              {error}
              {chats.length > 0 && " Os dados exibidos são da última consulta bem-sucedida."}
            </Alert>
          )}
          <div className="scrollbar-whatsapp min-h-0 flex-1 lg:overflow-y-auto">
            {isLoading && chats.length === 0 ? (
              <div role="status" aria-label="Carregando conversas" className="space-y-2">
                {[0, 1, 2, 3, 4].map((key) => (
                  <Skeleton
                    key={key}
                    variant="rounded"
                    height={viewMode === "compact" ? 72 : 140}
                  />
                ))}
              </div>
            ) : (
              <ul
                aria-label={
                  viewMode === "compact" ? "Lista compacta de conversas" : "Lista de conversas"
                }
                className="min-w-0 space-y-2"
              >
                {chats.map((chat) => {
                  const key = `${"chatType" in chat ? chat.chatType : "schedule"}-${chat.id}`;
                  const activeWpp =
                    "chatType" in chat && chat.chatType === "wpp" && !chat.isFinished;
                  return (
                    <MonitorCard
                      key={key}
                      {...getMonitorCardProps(chat, users, sectors)}
                      compact={viewMode === "compact"}
                      handleView={
                        "chatType" in chat
                          ? () => openModal(<MonitorConversationPreview chat={chat} />)
                          : null
                      }
                      handleTransfer={
                        activeWpp
                          ? () => {
                              setCurrentChat(chat);
                              openModal(<TransferChatModal chatId={chat.id} onSuccess={refetch} />);
                            }
                          : null
                      }
                      handleFinish={
                        activeWpp
                          ? () => {
                              setCurrentChat(chat);
                              openModal(<FinishChatModal chatId={chat.id} onSuccess={refetch} />);
                            }
                          : null
                      }
                    />
                  );
                })}
              </ul>
            )}
            {!isLoading && !error && chats.length === 0 && (
              <div
                role="status"
                className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700"
              >
                <SearchOffIcon className="text-slate-400" sx={{ fontSize: 48 }} />
                <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                  Nenhuma conversa encontrada
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Ajuste os filtros aplicados ou atualize a lista para buscar novas conversas.
                </p>
                <Button onClick={refetch} disabled={isRefreshing}>
                  Atualizar lista
                </Button>
              </div>
            )}
          </div>
          <div className="shrink-0">
            <MonitorPagination />
          </div>
        </section>
      </div>
    </div>
  );
}
