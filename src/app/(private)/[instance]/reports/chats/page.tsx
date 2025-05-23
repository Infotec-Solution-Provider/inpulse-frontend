import ChatReportForm from "./form";
import ChatsReportList from "./list";
import ChatsReportProvider from "./chats-reports-context";

export default async function ChatsReportsPage() { 
    return (
        <div className="max-w-[75rem] mx-auto py-8 px-4 box-border grid grid-rows-[max-content_1fr] grid-cols-[75rem] gap-y-8">
            <ChatsReportProvider >
                <ChatReportForm />
                <ChatsReportList />
            </ChatsReportProvider>
        </div>
    );
}