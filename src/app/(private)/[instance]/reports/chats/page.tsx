import ChatReportForm from "./form";
import ChatsReportList from "./list";
import ChatsReportProvider from "./chats-reports-context";

export default async function ChatsReportsPage() {
  return (
    <div className="mx-auto box-border grid grid-rows-[max-content_1fr] gap-y-8 bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white">
      <ChatsReportProvider>
        <ChatReportForm />
        <ChatsReportList />
      </ChatsReportProvider>
    </div>
  );
}
