# Monitoria de conversas e telefonia

Execute `npm run test:monitor:e2e` na raiz do frontend. O teste inicia um servidor
Vite em `127.0.0.1:4185`, renderiza os componentes reais e o estado real da monitoria,
e intercepta as APIs com dados fictícios. Não inicia os serviços ou consulta tenants.

Cobertura: aplicar/limpar filtros, persistência sem texto pesquisado, paginação,
resposta HTTP atrasada, isolamento por instância, atualização manual/socket e pausa,
reconexão/renovação de token sem acumular listeners, aba oculta, Retry-After,
finalização somente após confirmação, falha de transferência, fechamento de ação ao
trocar instância, permissão ADMIN, histórico sem leitura automática e layout responsivo.

As imagens em `test-results/monitor-*.png` mostram desktop, modo compacto escuro e
celular. Os componentes de mensagens e envio são substituídos no harness; este teste
não verifica envio real, mídia, MySQL, autenticação de produção ou entrega WhatsApp.

`telephony.pw.ts` cobre as três visualizações e suas preferências, todos os grupos de
filtros, múltipla escolha entre páginas, cancelamento, cidades homônimas e limpeza de
geografia dependente, dia/mês completo em America/Sao_Paulo, respostas atrasadas,
Retry-After, pausa, troca de aba/instância, remoção de chip sem aplicar outro rascunho
e detalhes somente leitura. As opções e resultados vêm de `telephony-fixtures.ts`.
O modal de detalhes do cliente é substituído por uma apresentação mínima: testa-se
o vínculo de cliente/permissão e o fechamento por escopo, não os históricos reais.
Não há chamada para iniciar/finalizar telefonia nem acesso ao Asterisk/CRM real.

As regras de negócio SQL da telefonia são exercitadas separadamente no
customers-service por `npm run test:telephony-monitor` (SQLite descartável em memória).
Esta suíte de navegador não substitui o smoke test e EXPLAIN no MySQL do destino.

Os testes de lógica executam via `npm run test:unit` (incluem a monitoria) e a
verificação de tipos via `npx tsc --noEmit --incremental false`.
