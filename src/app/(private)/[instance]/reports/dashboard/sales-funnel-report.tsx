interface SalesFunnelStage {
  key: string;
  label: string;
  value: number;
  detail: string;
  width: number;
  cardClassName: string;
  badgeClassName: string;
  attendanceLabel?: string;
  customerLabel?: string;
}

const SALES_FUNNEL_STAGES: SalesFunnelStage[] = [
  {
    key: "worked",
    label: "Atendimentos e Clientes trabalhados",
    value: 1248,
    detail: "1.248 atendimentos acionados e 682 clientes com abordagem no período.",
    attendanceLabel: "1.248 atendimentos",
    customerLabel: "682 clientes",
    width: 100,
    cardClassName:
      "border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-slate-50 shadow-slate-950/20",
    badgeClassName: "bg-white/12 text-slate-100 ring-1 ring-inset ring-white/15",
  },
  {
    key: "productive",
    label: "Atendimentos produtivos e Clientes trabalhados produtivos",
    value: 864,
    detail: "864 atendimentos evoluíram com interesse validado e 511 clientes seguiram com potencial real.",
    attendanceLabel: "864 atendimentos produtivos",
    customerLabel: "511 clientes produtivos",
    width: 86,
    cardClassName:
      "border-sky-200 bg-gradient-to-r from-sky-600 via-cyan-500 to-teal-400 text-white shadow-sky-500/25",
    badgeClassName: "bg-white/14 text-white ring-1 ring-inset ring-white/20",
  },
  {
    key: "quotes",
    label: "Cotações",
    value: 392,
    detail: "Volume estimado de clientes que receberam proposta formal ou composição comercial.",
    width: 68,
    cardClassName:
      "border-amber-200 bg-gradient-to-r from-amber-500 via-orange-400 to-orange-300 text-amber-950 shadow-amber-400/30",
    badgeClassName: "bg-amber-950/10 text-amber-950 ring-1 ring-inset ring-amber-950/10",
  },
  {
    key: "orders",
    label: "Pedidos",
    value: 218,
    detail: "Pedidos representando aprovações comerciais e fechamento operacional em andamento.",
    width: 56,
    cardClassName:
      "border-emerald-200 bg-gradient-to-r from-emerald-500 via-lime-400 to-lime-300 text-emerald-950 shadow-emerald-400/30",
    badgeClassName: "bg-emerald-950/10 text-emerald-950 ring-1 ring-inset ring-emerald-950/10",
  },
  {
    key: "sales",
    label: "Vendas",
    value: 147,
    detail: "Fechamentos finais consolidados na última etapa do pipeline comercial.",
    width: 44,
    cardClassName:
      "border-fuchsia-200 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-pink-300 text-fuchsia-950 shadow-fuchsia-400/30",
    badgeClassName: "bg-fuchsia-950/10 text-fuchsia-950 ring-1 ring-inset ring-fuchsia-950/10",
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function SalesFunnelReport() {
  const topValue = SALES_FUNNEL_STAGES[0].value;
  const productiveRate = (SALES_FUNNEL_STAGES[1].value / SALES_FUNNEL_STAGES[0].value) * 100;
  const orderConversion = (SALES_FUNNEL_STAGES[3].value / SALES_FUNNEL_STAGES[2].value) * 100;
  const finalConversion = (SALES_FUNNEL_STAGES[4].value / SALES_FUNNEL_STAGES[0].value) * 100;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="border-b border-slate-100 pb-5 dark:border-slate-800">
        <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Funil de Vendas</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Acompanhe a progressão entre atendimentos trabalhados, produtividade comercial, cotações, pedidos e vendas.
        </p>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Taxa produtiva</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatPercent(productiveRate)}</div>
          <div className="mt-1 text-xs text-slate-500">Atendimentos produtivos sobre o topo do funil</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Conversão em pedidos</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatPercent(orderConversion)}</div>
          <div className="mt-1 text-xs text-slate-500">Pedidos gerados a partir das cotações</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fechamento final</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatPercent(finalConversion)}</div>
          <div className="mt-1 text-xs text-slate-500">Vendas sobre o volume total de atendimentos trabalhados</div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_48%),linear-gradient(180deg,_rgba(15,23,42,0.96),_rgba(15,23,42,0.9))] p-5 shadow-inner shadow-slate-950/20 dark:border-slate-700">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Progressão visual
              </p>
              <h4 className="mt-1 text-lg font-semibold text-slate-50">Etapas do pipeline comercial</h4>
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 ring-1 ring-inset ring-white/10">
              Topo: {formatNumber(topValue)}
            </div>
          </div>

          <div className="space-y-1.5">
            {SALES_FUNNEL_STAGES.map((stage, index) => {
              const previousStage = SALES_FUNNEL_STAGES[index - 1];
              const previousConversion = previousStage ? (stage.value / previousStage.value) * 100 : 100;
              const overallConversion = (stage.value / topValue) * 100;

              return (
                <div key={stage.key} className="flex flex-col items-center gap-1">
                  {previousStage ? (
                    <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                      {formatPercent(previousConversion)} da etapa anterior
                    </div>
                  ) : null}

                  <article
                    className={`w-full rounded-2xl border px-4 py-2.5 shadow-md ${stage.cardClassName}`}
                    style={{ width: `${stage.width}%` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                          Etapa {index + 1}
                        </div>
                        <h5 className="truncate text-sm font-semibold leading-snug">{stage.label}</h5>
                        {(stage.attendanceLabel ?? stage.customerLabel) ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {stage.attendanceLabel ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${stage.badgeClassName}`}>
                                {stage.attendanceLabel}
                              </span>
                            ) : null}
                            {stage.customerLabel ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${stage.badgeClassName}`}>
                                {stage.customerLabel}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xl font-semibold">{formatNumber(stage.value)}</div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.14em] opacity-75">
                          {formatPercent(overallConversion)} do topo
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-inner dark:border-slate-700 dark:bg-slate-800/50">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Leitura rápida das etapas
            </h4>
            <div className="mt-4 space-y-3">
              {SALES_FUNNEL_STAGES.map((stage, index) => {
                const previousStage = SALES_FUNNEL_STAGES[index - 1];
                const previousConversion = previousStage ? (stage.value / previousStage.value) * 100 : 100;

                return (
                  <div
                    key={`${stage.key}-summary`}
                    className="rounded-2xl border border-white/70 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {index + 1}. {stage.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {previousStage
                            ? `${formatPercent(previousConversion)} da etapa anterior`
                            : "Base inicial do funil comercial"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                          {formatNumber(stage.value)}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">volume da etapa</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Observações para a próxima etapa</h4>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              <p>
                Este bloco foi desenhado para acompanhar a leitura comercial com proporções coerentes
                entre as fases do pipeline.
              </p>
              <p>
                Na integração futura, cada etapa pode ser ligada ao mesmo intervalo de datas e aos filtros já
                existentes no dashboard, preservando este layout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}