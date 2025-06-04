import ChatReportForm from "./form";
import ChatsReportList from "./list";
import ChatsReportProvider from "./chats-reports-context";

export default async function ChatsReportsPage() {
    return (
<div className=" mx-auto py-8 px-4 box-border grid grid-rows-[max-content_1fr] gap-y-8 bg-white dark:bg-gray-900 text-black dark:text-white">

            <ChatsReportProvider >
                <ChatReportForm />
                <ChatsReportList />
            </ChatsReportProvider>
        </div>
    );
}
