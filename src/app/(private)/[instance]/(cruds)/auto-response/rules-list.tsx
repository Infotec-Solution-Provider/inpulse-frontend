"use client";
import { useAutoResponseContext } from "./auto-response.context";
import { CircularProgress } from "@mui/material";
import RuleCard from "./rule-card";

export default function RulesList() {
    const { rules, isLoading, openRuleModal } = useAutoResponseContext();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <CircularProgress />
                <span className="mt-4 text-slate-500">Carregando regras...</span>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Regras de Resposta Automática</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie as respostas para horários, usuários ou para todos.</p>
                </div>
                <button
                    onClick={() => openRuleModal()}
                    className="mt-4 sm:mt-0 flex items-center gap-2 bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Criar Nova Regra</span>
                </button>
            </header>

            {rules.length > 0 ? (
                <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rules.map(rule => (
                        <RuleCard key={rule.id} rule={rule} />
                    ))}
                </main>
            ) : (
                <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Nenhuma regra encontrada</h3>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">Comece criando uma nova regra de resposta automática.</p>
                </div>
            )}
        </div>
    );
}
