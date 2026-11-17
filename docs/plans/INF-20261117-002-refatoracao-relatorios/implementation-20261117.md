---
id: INF-20261117-002
title: Primeira onda da refatoração de relatórios
service: cross-service
type: refactor
status: in-progress
owner: codex
created_at: 2026-11-17
updated_at: 2026-11-17
depends_on: []
related_paths:
  - inpulse-frontend/src/lib/reports
  - inpulse-frontend/src/components/reports
  - inpulse-frontend/src/app/(private)/[instance]/reports
  - inpulse-frontend/tests/reports
source_docs:
  - planejamento/cross-service/INF-20261117-002-refatoracao-relatorios/plan.md
  - planejamento/cross-service/INF-20261117-002-refatoracao-relatorios/inventory.md
---

# Primeira onda implementada

## Base e escopo

O usuário autorizou iniciar a implementação após receber o plano. Serviço alterado: **inpulse-frontend**. Worktree isolado `C:/Workspace/wt/reports-refactor-20261117/inpulse-frontend`, branch `feat/reports-refactor-20261117`, criado da `homolog` atualizada em `451d8127ecde96270ef066d4025b34c69331e0d7`. O snapshot inicial do plano foi incorporado por cherry-pick (`b71e996`, origem `3229bab`). Alterações locais do checkout original e branches de outras demandas foram preservadas.

Nenhum backend ou banco foi alterado. Não houve acesso a produção, consulta SQL ou publicação remota. O código usa as APIs HTTP existentes de WhatsApp, Marketing e Users.

## Navegação e catálogo

- Uma entrada direta “Relatórios” no menu compartilhado, apontando para `/{instance}/reports`.
- Catálogo tipado com IDs estáveis, descrição, categoria, tipo de saída e sinônimos. Pesquisa ignora caixa/acentos e combina termos.
- Exibir somente categorias com relatórios disponíveis. Preservar perfil ADMIN do menu, gates efetivos de feature e restrição de satisfação à Exatron. As APIs e os gates de acesso direto continuam sendo a autorização efetiva.
- A duplicação “Dashboard: WhatsApp”/“Performance Operadores” é representada por um único item autorizado. Um antigo atalho de salesReports para performance, bloqueado pelo gate reportsAdvanced, não passa a conceder acesso.
- Não habilitar Mailing/Régua, personalizados ou ferramentas anteriormente ocultas. Não promover o Funil com valores fixos.
- `/{instance}/reports/dashboard`, `?report=messagesPerUser` e queries inválidas preservam acesso ao relatório padrão por redirect para `/{instance}/reports/messages-per-operator`. Os demais sub-relatórios mantêm suas rotas; `generalPerformance` passa a aceitar o link direto do catálogo.
- Busca/categoria da central ficam na URL sem navegação de servidor a cada tecla. Usar o pathname real do navegador para preservar o prefixo `/nova` quando existir.
- A central, o novo relatório e Vendas usam o shell moderno; outros caminhos continuam com a apresentação anterior até suas migrações.

## Fundação compartilhada

`ReportPageShell`, `ReportFilterPanel` e `ReportExecutionStatus` padronizam cabeçalho, retorno à central, datas, atalhos, ações e feedback.

`useReportExecution` mantém filtros capturados/aplicados, horário e resultado da execução, separadamente dos filtros em edição. Não executa ao montar. Valida o período antes de consultar, bloqueia envios concorrentes, aceita cancelamento e descarta respostas de um contexto anterior. Preserva o último resultado em erro e informa que ele é anterior. Os pilotos são remontados por tenant/usuário para reiniciar o formulário no contexto correto.

Atalhos e Limpar alteram apenas o rascunho. Datas padrão: primeiro dia do mês até hoje, calculadas como datas civis locais. Comparação de Vendas mantém um intervalo anterior de mesma duração, sem conversão acidental do dia local para UTC. Limites de volume/período e fuso de negócio configurável ainda precisam de decisão por endpoint; não foram inventados nesta onda.

`SearchableEntityFilter` oferece pesquisa remota com debounce, cancelamento, seleção por ID, paginação e ações de carregar mais/repetir dentro da lista. O primeiro consumidor é Operador em Vendas. Reaproveita `GET /api/users`, com `NOME` ou `CODIGO`, `page` e `perPage=50`, de acordo com o controller e o serviço locais inspecionados. Essa fonte exclui os usuários ocultos pelo contrato existente; não se torna um cadastro universal de operadores financeiros.

## Piloto Mensagens por Operador

- Endpoint preservado: `GET /api/whatsapp/dashboard/messages-per-user?date=início_fim`.
- Geração explícita, resultados identificados com período/horário, vazio/erro separados e gráficos de barras/linha/pizza.
- Tabela pesquisável por nome/código sobre todos os registros retornados, com paginação local. A pesquisa de tabela não altera os totais do gráfico.
- Gráfico mostra até 20 operadores na ordem da API, explicitamente identificado. Tabela e CSV contêm o conjunto completo retornado.
- CSV exporta a execução aplicada, sem nova consulta e sem se limitar à página/pesquisa da tabela. Exportação bloqueada durante carregamento, após alteração pendente ou falha da nova geração.

## Piloto Vendas

- Endpoint e fórmulas preservados: `GET /api/marketing/financial/dashboard` e detalhes existentes.
- Removida consulta automática na abertura. Preservados situação, agrupamento, comparação, indicadores, gráficos, metas e detalhamento de vendas.
- Operadores são pesquisados no cadastro paginado, independentemente de `data.byOperator`; é possível selecionar um operador sem vendas no recorte e obter um resultado vazio válido.
- Contexto mantém rascunho e filtros aplicados. O modal de detalhes usa os filtros aplicados. Editores de metas atualizam a execução atual sem absorver filtros pendentes e não iniciam a primeira geração por conta própria.
- Tabela de desempenho tem busca/paginação local. O CSV continua cobrindo o resultado completo; nomes com separadores/aspas têm escaping consistente.
- Controles do resultado ficam bloqueados durante alterações pendentes/carregamento/erro para impedir download ou detalhamento de um recorte apresentado como novo.

## Verificações executadas

| Verificação | Resultado e abrangência |
|---|---|
| Testes unitários relacionados | **67 passaram**, quatro arquivos: catálogo, datas/CSV, navegação e gates de módulos |
| Jornadas Playwright | **7 passaram**, com APIs simuladas e componentes reais: busca sem consultas; geração/CSV completo; datas inválidas/captura em voo/troca de tenant; paginação de operadores sem vendas; pesquisa nome/código e erro/retry; filtros de vendas/exportação; responsividade/temas |
| TypeScript | `tsc --noEmit --incremental false` passou, com o arquivo padrão local `next-env.d.ts` |
| Build | `next build --webpack` passou, incluindo compilação, TypeScript e geração das rotas |
| Visual | Capturas locais conferidas; layouts em 390, 768 e 1440 px, temas claro/escuro. Sem overflow horizontal da página; tabelas podem rolar dentro do próprio contêiner |

O primeiro build com Turbopack rejeitou a junction de `node_modules` compartilhada pelo worktree (“points out of the filesystem root”). A validação foi concluída com webpack; nenhuma configuração do aplicativo foi alterada para contornar isso. O primeiro teste de retry encontrou a ação encoberta pelo dropdown; a ação foi movida para dentro das opções. As capturas finais desabilitam animações para registrar cores estáveis após mudar o tema.

Comandos reproduzíveis, no worktree:

```powershell
node node_modules/vitest/vitest.mjs run src/lib/reports/catalog.test.ts src/lib/reports/filters.test.ts src/lib/ui-system/navigation.test.ts src/lib/module-feature-access.test.ts
node node_modules/@playwright/test/cli.js test --config tests/reports.config.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next build --webpack
```

Evidências em `artifacts/wave1-20261117/`: logs de navegador/build/typecheck e capturas `catalog-desktop.png`, `catalog-mobile.png`, `messages-mobile-dark.png`, `sales-mobile-dark.png`, `sales-768-dark.png` e `sales-1440-dark.png`. A barra superior das capturas pertence ao harness de teste, não à navegação entregue no CRM.

## Pendências e próximos passos

Não houve sessão autenticada em homolog, comparação de contagens reais, benchmark/p95 ou deploy. O estado da demanda permanece **in-progress**. É necessário validar os pilotos no ambiente com o tenant/perfil escolhido e então migrar os demais relatórios prontos, seguidos dos arquivos e especiais. Multisseleção de entidades e migração dos outros filtros não estão concluídas nesta primeira onda.

Rollback local: reverter o commit funcional deste recorte, preservando o snapshot documental e as URLs anteriores. Nenhum dado persistente precisa ser revertido. Antes de qualquer publicação, revalidar o conjunto atual da `homolog`, seus artefatos e o roteamento legado/moderno.
