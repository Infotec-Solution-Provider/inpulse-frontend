import ChatReportForm from "./form";
import ChatsReportList from "./list";
import ChatsReportProvider from "./chats-reports-context";

export default async function ChatsReportsPage() {
  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <ChatsReportProvider>
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <h1 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 sm:text-xl">
                  Relatórios de Chats
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            {/* Form Section */}
            <section className="mb-4">
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                <div className="px-4 py-4 sm:p-4">
                  <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
                    Gerar Novo Relatório
                  </h2>
                  <ChatReportForm />
                </div>
              </div>
            </section>

            {/* Reports List Section */}
            <section>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                <div className="px-4 py-3 sm:px-6">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Relatórios Gerados
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Visualize e gerencie seus relatórios de conversas.
                  </p>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <ChatsReportList />
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} InPulse. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </ChatsReportProvider>
    </div>
  );
}
