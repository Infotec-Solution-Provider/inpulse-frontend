"use client";
import { AuthContext } from "@/app/auth-context";
import { SocketContext } from "@/app/(private)/[instance]/socket-context";
import reportsService from "@/lib/services/reports.service";
import usersService from "@/lib/services/users.service";
import {
  ChatsReport,
  ChatsReportFormat,
  SocketEventType,
  User,
} from "@in.pulse-crm/sdk";
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
  isLoading: boolean;
}

interface IChatReportStatusEvent {
  id: number;
  type: string;
  isCompleted?: boolean;
  isFailed?: boolean;
  fileId?: string;
  chats?: number;
  messages?: number;
  error?: string;
  progress: number;
}

export interface GenerateReportParams {
  startDate: string;
  endDate: string;
  userId: string;
  format: ChatsReportFormat;
}

const defaultContextValue: IChatsReportContext = {
  deleteReport: async () => {},
  generateReport: async () => {},
  reports: [],
  users: [],
  isLoading: false,
};

export const ChatsReportContext = createContext<IChatsReportContext>(defaultContextValue);

export default function ChatsReportProvider({ children }: IChatsReportProviderProps) {
  const { socket } = useContext(SocketContext);
  const { token } = useContext(AuthContext);
  const pathname = usePathname();
  const instance = useMemo(() => pathname.split("/")[1], [pathname]);
  const [reports, setReports] = useState<Array<ChatsReport & { progress: number }>>([]);
  const [users, setUsers] = useState<Array<User>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const deleteReport = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      await reportsService.deleteChatsReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Relatório excluído com sucesso!");
    } catch (err) {
      toast.error("Falha ao excluir relatório!\n" + sanitizeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateReport = useCallback(async (params: GenerateReportParams) => {
    try {
      setIsLoading(true);
      const report = await reportsService.generateChatsReport(params);
      setReports((prev) => [{ ...report, progress: 0 }, ...prev]);
      toast.success("Relatório em processamento, você será notificado quando estiver pronto!");
    } catch (err) {
      toast.error("Falha ao criar relatório!\n" + sanitizeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReportStatus = useCallback((data: IChatReportStatusEvent) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== data.id || data.type !== "chats") return r;

        if (data.isCompleted) {
          toast.success("Relatório gerado com sucesso!");

          return {
            ...r,
            status: "completed",
            fileId: data.fileId ? Number(data.fileId) : 0,
            progress: 100,
            chats: data.chats || 0,
            messages: data.messages || 0,
          } as ChatsReport & { progress: number };
        }

        if (data.isFailed) {
          toast.error("Falha ao gerar relatório!\n" + data.error);
          return { ...r, status: "failed" } as ChatsReport & { progress: number };
        }

        return { ...r, progress: +data.progress.toFixed(0) } as ChatsReport & { progress: number };
      }),
    );
  }, []);

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      reportsService.setAuth(`Bearer ${token}`);
      usersService.setAuth(`Bearer ${token}`);

      Promise.all([
        reportsService.getChatsReports()
          .then((reports) => {
            setReports(reports.map((r) => ({ ...r, progress: r.status === "pending" ? 0 : 100 })));
          })
          .catch((err) => {
            toast.error("Falha ao buscar relatórios!\n" + sanitizeErrorMessage(err));
          }),
        
        usersService.getUsers()
          .then((res) => setUsers(res.data))
          .catch((err) => {
            toast.error("Falha ao buscar usuários!\n" + sanitizeErrorMessage(err));
          })
      ]).finally(() => {
        setIsLoading(false);
      });
    }
  }, [instance, token]);

  useEffect(() => {
    const CHATS_REPORT_ROOM = "reports:chats";
    if (socket) {
      socket.joinRoom(CHATS_REPORT_ROOM);
      // @ts-ignore - O tipo do socket não está corretamente tipado para eventos personalizados
      socket.on('report:status', handleReportStatus);
    }

    return () => {
      if (socket) {
        socket.leaveRoom(CHATS_REPORT_ROOM);
        // @ts-ignore - O tipo do socket não está corretamente tipado para eventos personalizados
        socket.off('report:status', handleReportStatus);
      }
    };
  }, [socket, handleReportStatus]);

  return (
    <ChatsReportContext.Provider
      value={{
        deleteReport,
        generateReport,
        reports,
        users,
        isLoading,
      }}
    >
      {children}
    </ChatsReportContext.Provider>
  );
}
