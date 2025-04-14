"use client";
import { AuthContext } from "@/app/auth-context";
import { SocketContext } from "@/app/(private)/[instance]/socket-context";
import reportsService from "@/lib/services/reports.service";
import usersService from "@/lib/services/users.service";
import { ChatsReport, ChatsReportFormat, ReportStatusEventData, SocketEventType, User } from "@in.pulse-crm/sdk";
import { sanitizeErrorMessage } from "@in.pulse-crm/utils";
import { usePathname } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "react-toastify";

interface IChatsReportProviderProps {
  children: ReactNode;
}

interface IChatsReportContext {
  deleteReport: (id: number) => Promise<void>;
  generateReport: (params: GenerateReportParams) => Promise<void>;
  reports: Array<ChatsReport & { progress: number }>;
  users: Array<User>;
}

export interface GenerateReportParams {
  startDate: string;
  endDate: string;
  userId: string;
  format: ChatsReportFormat;
}

export const ChatsReportContext = createContext<IChatsReportContext>({} as IChatsReportContext);

export default function ChatsReportProvider({ children }: IChatsReportProviderProps) {
  const { socket } = useContext(SocketContext);
  const { token } = useContext(AuthContext);
  const pathname = usePathname();
  const instance = useMemo(() => pathname.split("/")[1], [pathname]);
  const [reports, setReports] = useState<Array<ChatsReport & { progress: number }>>([]);
  const [users, setUsers] = useState<Array<User>>([]);

  const deleteReport = useCallback(
    async (id: number) => {
      try {
        await reportsService.deleteChatsReport(id);
        setReports((prev) => prev.filter((r) => r.id !== id));
        toast.success("Relatório excluído com sucesso!");
      } catch (err) {
        toast.error("Falha ao excluir relatório!\n" + sanitizeErrorMessage(err));
      }
    },
    [instance],
  );

  const generateReport = useCallback(
    async (params: GenerateReportParams) => {
      try {
        const response = await reportsService.generateChatsReport(params);
        setReports((prev) => [{ ...response.data, progress: 0 }, ...prev]);
        toast.success("Relatório em processamento, você será notificado quando estiver pronto!");
      } catch (err) {
        toast.error("Falha ao criar relatório!\n" + sanitizeErrorMessage(err));
      }
    },
    [instance],
  );

  const handleReportStatus = useCallback((data: ReportStatusEventData) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== data.id || data.type !== "chats") return r;

        if (data.isCompleted) {
          toast.success("Relatório gerado com sucesso!");

          return {
            ...r,
            status: "completed",
            fileId: data.fileId,
            progress: 100,
            chats: data.chats,
            messages: data.messages,
          };
        }

        if (data.isFailed) {
          toast.error("Falha ao gerar relatório!\n" + data.error);
          return { ...r, status: "failed" };
        }

        return { ...r, progress: +data.progress.toFixed(0) };
      }),
    );
  }, []);

  useEffect(() => {
    if (token) {
      reportsService.setAuth(`Bearer ${token}`);
      usersService.setAuth(`Bearer ${token}`);

      reportsService
        .getChatsReports()
        .then((res) =>
          setReports(res.data.map((r) => ({ ...r, progress: r.status === "pending" ? 0 : 100 }))),
        )
        .catch((err) => toast.error("Falha ao buscar relatórios!\n" + sanitizeErrorMessage(err)));

      usersService
        .getUsers()
        .then((res) => setUsers(res.data))
        .catch((err) => toast.error("Falha ao buscar usuários!\n" + sanitizeErrorMessage(err)));
    }
  }, [instance, token, usersService, reportsService]);

  useEffect(() => {
    const CHATS_REPORT_ROOM = "reports:chats";
    if (socket) {
      socket.joinRoom(CHATS_REPORT_ROOM);
      socket.on(SocketEventType.ReportStatus, handleReportStatus);
    }

    return () => {
      if (socket) {
        socket.leaveRoom(CHATS_REPORT_ROOM);
        socket.off(SocketEventType.ReportStatus);
      }
    };
  }, [socket]);

  return (
    <ChatsReportContext.Provider
      value={{
        deleteReport,
        generateReport,
        reports,
        users,
      }}
    >
      {children}
    </ChatsReportContext.Provider>
  );
}
