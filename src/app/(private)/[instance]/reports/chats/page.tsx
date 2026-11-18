import { ReportPageShell } from "@/components/reports/ReportWorkflow";
import ChatReportForm from "./form";
import ChatsReportList from "./list";
import ChatsReportProvider from "./chats-reports-context";

export default async function ChatsReportsPage({
  params,
}: {
  params: Promise<{ instance: string }>;
}) {
  const { instance } = await params;
  return (
    <ReportPageShell
      instance={instance}
      category="Atendimento e WhatsApp"
      title="Exportação de Conversas"
      description="Solicite um arquivo de conversas e acompanhe a geração no histórico."
    >
      <ChatsReportProvider key={instance}>
        <ChatReportForm instance={instance} />
        <ChatsReportList />
      </ChatsReportProvider>
    </ReportPageShell>
  );
}
