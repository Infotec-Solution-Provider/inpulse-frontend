export interface ChannelFunctionalHealth {
  completedAt: string;
  expiresAt: string;
  latencyMs: number | null;
  dispatchStatus: "PASSED" | "FAILED" | "SKIPPED";
  officialReceiveStatus?: "PASSED" | "FAILED" | "SKIPPED";
  responseDispatchStatus?: "PASSED" | "FAILED" | "SKIPPED";
  receiveStatus: "PASSED" | "FAILED" | "SKIPPED";
}

export interface ChannelMessageHealth {
  windowMinutes: number;
  observedAt: string;
  dataStatus: "COMPLETE" | "LIMITED" | "UNAVAILABLE";
  sendFailed: number;
  sendTechnicalFailed: number;
  sendMessageFailed: number;
  sendUnclassifiedFailed: number;
  sendUnknown: number;
  sendDelayed: number;
  receiveFailed: number;
  receiveDelayed: number;
  oldestSendPendingAt: string | null;
  oldestReceivePendingAt: string | null;
}

const labels = { PASSED: "Aprovado", FAILED: "Falhou", SKIPPED: "Não executado" };

function date(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(
    new Date(value),
  );
}

export default function ChannelHealthSummary({
  functionalHealth,
  messageHealth,
  reason,
  now,
  detailed = false,
}: {
  functionalHealth?: ChannelFunctionalHealth | null;
  messageHealth?: ChannelMessageHealth | null;
  reason: string;
  now: number;
  detailed?: boolean;
}) {
  const expired =
    functionalHealth &&
    (!Number.isFinite(Date.parse(functionalHealth.expiresAt)) ||
      Date.parse(functionalHealth.expiresAt) <= now);
  const stages = functionalHealth
    ? ([
        ["Envio do grupo", functionalHealth.dispatchStatus],
        ["Recebimento no WABA de teste", functionalHealth.officialReceiveStatus],
        ["Resposta do WABA de teste", functionalHealth.responseDispatchStatus],
        ["Recebimento na sessão", functionalHealth.receiveStatus],
      ] as const)
    : [];
  const probeLabel = !functionalHealth
    ? "Sem teste"
    : expired
      ? "Teste vencido"
      : stages.some(([, status]) => status === "FAILED")
        ? "Teste com falha"
        : stages.some(([, status]) => !status || status === "SKIPPED")
          ? "Teste incompleto"
          : "Teste aprovado";
  const partial = messageHealth?.dataStatus === "LIMITED";
  const count = (value: number) => (partial ? `≥ ${value}` : value);
  return (
    <div
      className={
        detailed
          ? "my-4 space-y-3 text-sm"
          : "mt-2 max-w-sm space-y-1 text-xs text-slate-600 dark:text-slate-300"
      }
    >
      <p>{reason}</p>
      <p title={`Validade: ${date(functionalHealth?.expiresAt)}`}>
        {probeLabel} · {date(functionalHealth?.completedAt)}
        {functionalHealth?.latencyMs != null && ` · ${functionalHealth.latencyMs} ms`}
      </p>
      {detailed && (
        <>
          <h3 className="font-semibold">Healthcheck funcional</h3>
          {stages.length > 0 && (
            <dl className="grid gap-2 sm:grid-cols-2">
              {stages.map(([name, status]) => (
                <div key={name}>
                  <dt className="text-slate-500">{name}</dt>
                  <dd>{status ? labels[status] : "Sem registro"}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="text-xs text-slate-500">
            Validade do teste: {date(functionalHealth?.expiresAt)}
          </p>
          <h3 className="font-semibold">
            Mensagens · últimos {messageHealth?.windowMinutes ?? 15} minutos
          </h3>
          {!messageHealth || messageHealth.dataStatus === "UNAVAILABLE" ? (
            <p>Dados de mensagens indisponíveis.</p>
          ) : (
            <>
              {partial && <p>Contagens parciais: a consulta atingiu o limite de registros.</p>}
              <dl className="grid gap-2 sm:grid-cols-2">
                {[
                  ["Falhas técnicas de envio", messageHealth.sendTechnicalFailed],
                  ["Falhas específicas de mensagem/destinatário", messageHealth.sendMessageFailed],
                  ["Falhas de envio sem causa identificada", messageHealth.sendUnclassifiedFailed],
                  ["Envios sem confirmação", messageHealth.sendUnknown],
                  ["Envios atrasados", messageHealth.sendDelayed],
                  ["Falhas de processamento de recebimento", messageHealth.receiveFailed],
                  ["Recebidas aguardando processamento", messageHealth.receiveDelayed],
                ].map(([name, value]) => (
                  <div key={name}>
                    <dt className="text-slate-500">{name}</dt>
                    <dd>{count(Number(value))}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-slate-500">
                Consulta: {date(messageHealth.observedAt)}. Cada mensagem é contada uma vez por
                sinal. Atrasos incluem pendências anteriores à janela: atenção após 1 minuto;
                instável após 5 minutos.
              </p>
              {messageHealth.oldestSendPendingAt && (
                <p>Envio pendente mais antigo: {date(messageHealth.oldestSendPendingAt)}</p>
              )}
              {messageHealth.oldestReceivePendingAt && (
                <p>
                  Recebimento pendente mais antigo: {date(messageHealth.oldestReceivePendingAt)}
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
