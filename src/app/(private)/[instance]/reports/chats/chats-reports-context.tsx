"use client";
import { AuthContext } from "@/app/auth-context";
import { SocketContext } from "@/app/(private)/[instance]/socket-context";
import usersService from "@/lib/services/users.service";
import reportsService from "@/lib/services/reports.service";
import {
  ChatsReport,
  ChatsReportFormat,
  ReportStatusEventData,
  SocketEventType,
  type User,
} from "@/lib/sdk-local";
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
  loading: boolean;
  error: string | null;
  reload: () => void;
  users: User[];
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
  const [users, setUsers] = useState<User[]>([]);
  const [history, setHistory] = useState({ key: "", loading: true, error: null as string | null });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((previous) => previous + 1), []);
  const key = String(version) + instance;

  const deleteReport = useCallback(async (id: number) => {
    try {
      await reportsService.deleteChatsReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Relatório excluído com sucesso!");
    } catch (err) {
      toast.error("Falha ao excluir relatório!\n" + sanitizeErrorMessage(err));
    }
  }, []);

  const generateReport = useCallback(
    async (params: GenerateReportParams) => {
      const report = await reportsService.generateChatsReport(params);
      setReports((previous) => [
        { ...report, progress: 0 },
        ...previous.filter((row) => row.id !== report.id),
      ]);
      reload();
    },
    [reload],
  );

  const handleReportStatus = useCallback((data: ReportStatusEventData) => {
    if (data.type !== "chats") return;
    setReports((previous) =>
      previous.map((r) => {
        if (r.id !== data.id) return r;

        if (data.isCompleted) {
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
          return { ...r, status: "failed" };
        }

        return { ...r, progress: +data.progress.toFixed(0) };
      }),
    );

    if (data.isCompleted) {
      toast.success("Relatório gerado com sucesso!");
    }

    if (data.isFailed) {
      toast.error("Falha ao gerar relatório!\n" + data.error);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    reportsService.setAuth("Bearer " + token.replace(/^Bearer\s+/i, ""));
    reportsService
      .getChatsReports()
      .then((results) => {
        if (!active) return;
        setReports((previous) => {
          const observed = new Map(previous.map((report) => [report.id, report]));
          return results.map((report) => {
            const local = observed.get(report.id);
            if (report.status === "pending" && local) return local;
            return { ...report, progress: report.status === "pending" ? 0 : 100 };
          });
        });
        setHistory({ key, loading: false, error: null });
      })
      .catch((error) => {
        if (active) setHistory({ key, loading: false, error: sanitizeErrorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [key, token]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    usersService.setAuth("Bearer " + token.replace(/^Bearer\s+/i, ""));
    void usersService
      .getUsers()
      .then((response) => {
        if (active) setUsers(response.data);
      })
      .catch(() => {
        // History remains available with operator codes if names cannot be loaded.
      });
    return () => {
      active = false;
    };
  }, [instance, token]);

  useEffect(() => {
    const CHATS_REPORT_ROOM = "reports:chats";
    let unsubscribe: (() => void) | null = null;

    if (socket) {
      socket.joinRoom(CHATS_REPORT_ROOM);
      unsubscribe = socket.subscribe(SocketEventType.ReportStatus, handleReportStatus);
    }

    return () => {
      if (socket) {
        socket.leaveRoom(CHATS_REPORT_ROOM);
        unsubscribe?.();
      }
    };
  }, [socket, handleReportStatus]);

  return (
    <ChatsReportContext.Provider
      value={{
        deleteReport,
        generateReport,
        reports,
        loading: history.key !== key || history.loading,
        error: history.key === key ? history.error : null,
        reload,
        users,
      }}
    >
      {children}
    </ChatsReportContext.Provider>
  );
}
