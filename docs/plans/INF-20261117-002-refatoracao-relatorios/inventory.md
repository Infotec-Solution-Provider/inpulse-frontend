---
id: INF-20261117-002
title: Inventário técnico dos relatórios e da navegação
service: cross-service
type: refactor
status: in-progress
owner: codex
created_at: 2026-11-17
updated_at: 2026-11-17
depends_on: []
related_paths:
  - inpulse-frontend/src/app/(private)/[instance]/reports
  - inpulse-frontend/src/lib/ui-system/navigation.ts
  - reports-service/src/controllers
  - reports-frontend/src/app/[instance]/reports
source_docs:
  - AGENTS.md
---

# Inventário técnico

## Base e limites da evidência

Leitura estática local em 17/11/2026. Nenhum ambiente remoto, banco ou navegador autenticado foi acessado. “Disponível” abaixo descreve rotas e condições encontradas no código; não prova publicação, habilitação em algum tenant nem uso real.

| Repositório/base | SHA analisado | Observação |
|---|---|---|
| `inpulse-frontend`, `homolog` | `1776d05413317dbcefd032c43e15b052fb3c08a0` | Base principal para navegação compartilhada e componentes atuais; lida com `git show` e worktree isolado |
| `inpulse-frontend`, checkout aberto | `65d21eb1956a3ec9781bf4d79a5730cee5f1d770` | `feat/monitor-schedule-edit`; leitura inicial das telas. Alterações preexistentes em monitoria preservadas |
| `reports-service`, `main` | `fe2a2b68acb172ee474ea7cf63916e892be4ab42` | Controllers de consultas, arquivos e personalizados |
| `reports-frontend`, `master` | `14dc3d90e6c10776483c8e97bf0cceda1c2c6784` | Aplicação separada com dois relatórios no menu |
| `marketing-service` | `4a3aa7aa9982fefb0f0ccb773db52a7a585740de` | Referência local de repositório; origem dos contratos identificada também nos clientes do frontend; não auditados cálculos |
| `whatsapp-service` | `53fd9b37975ddb37992b583724b8f3792f2b2bef` | Referência local de repositório; endpoints identificados nos consumidores; não auditados cálculos |

Foi conferido também que a navegação de `integrate/admin-pilot-modern-20261117`, no worktree local `C:/Workspace/wt/admin-production-pilot-20261117/frontend-modern`, conserva os mesmos destinos de relatórios e duplicação de `/reports/operator-performance`. Isso não comprova que esse worktree seja a versão em execução.

## Relatórios prontos e sub-relatórios

Prefixo das rotas: `/{instance}`. Prefixo dos arquivos frontend: `src/app/(private)/[instance]/reports/`. Catálogo futuro deve distinguir relatório lógico de página: uma página hoje pode conter vários relatórios.

| Relatório/rota atual | Entrada atual no código | Filtros/execução observados | Fonte/ação de migração |
|---|---|---|---|
| Mensagens por Operador — `/reports/dashboard`, chave `messagesPerUser` | Seletor interno; padrão do dashboard | Período; consulta pelo contexto de dashboard | `whatsapp-service /api/whatsapp/dashboard/messages-per-user`; piloto do novo fluxo |
| Mensagens por Contato — mesma página, `messagesPerContact` | Seletor interno | Período e operador em select sem busca | `whatsapp-service /dashboard/messages-per-contact`; combobox e card próprio |
| Mensagens por Hora e Dia — mesma página, `messagesPerHourDay` | Seletor interno | Setores em multiselect sem pesquisa; minDate/maxDate | `whatsapp-service /dashboard/messages-per-hour-day`; padronizar significado temporal |
| Contatos aguardando retorno — mesma página, `contactsAwaitingReturn` | Seletor interno | Situação atual; não impor período fictício | `whatsapp-service /dashboard/contacts-awaiting-return`; distinguir posição atual de relatório de período |
| Performance Geral — mesma página, `generalPerformance` | Seletor interno | Operadores, setores e período; o allowlist de query da página não inclui essa chave | Contexto/renderizador de performance; corrigir deep link e conferir a semântica antes de agrupar |
| Funil de Vendas — mesma página, `salesFunnel` | Seletor interno | Componente com `SALES_FUNNEL_STAGES` e números fixos, como 1248/864 | Não promover a relatório operacional sem fonte validada |
| Pesquisa de Satisfação — `/reports/dashboard?report=satisfactionSurvey` | Atalho exclusivo Exatron e seletor | Período, operadores sem busca; visões analítica/sintética | `reports-service /api/reports/satisfaction-survey`, com restrição de instância no controller |
| Performance por Operador — `/reports/operator-performance` | Menu como “Performance Operadores” e “Dashboard: WhatsApp” | Reutiliza DashboardFilters/contexto; abertura também chama `loadReport` no componente | `whatsapp-service /dashboard/operator-performance`; deduplicar atalho, revisar efeitos duplicados |
| Dashboard de Operadores — `/reports/operators` | `reportsAdvanced` | Rascunho/aplicados; período, setores/operadores sem busca; detalhes e agenda | Mesmo endpoint de performance mais `/:operatorId/details` e `/schedules/unified`; preservar detalhes e provar equivalência antes de fusão |
| Vendas — `/reports/sales` | `salesReports` | Datas, operador sem busca, situação, agrupamento; Buscar e carga inicial | Cliente `financial.service`; opções de operador derivadas de `data.byOperator`; piloto comercial |
| Metas e Indicadores — `/reports/goals-dashboard` | `reportsAdvanced` | Período com recarga por mudança; edição de meta geral na tela | `getFinancialDashboard`, `getFinancialGoals`, `upsertGeneralGoal`; distinguir consulta de configuração |
| Equipe x Metas — `/reports/team-goals` | `reportsAdvanced` | Período com recarga por mudança; operador sem busca no cadastro de meta | `getFinancialDashboard`, `getFinancialGoals`, `upsertOperatorGoal`; preservar ações de edição autorizadas |
| Origem x Qualidade — `/reports/lead-origin-quality` | `reportsAdvanced` | Datas com recarga por mudança e Atualizar; exportação própria | `marketing-service /api/marketing/reports/lead-origin-quality`; separar rascunho/aplicado |
| Motivos de Perda — `/reports/lost-reasons` | `reportsAdvanced` | Datas/canal com recarga por mudança | `marketing-service /api/marketing/reports/lost-reasons`; enum Canal pode continuar select |
| Conversas — `/reports/chats` | `chatExport` | Datas, formato e usuário com Autocomplete; Exportar inicia geração e lista acompanha socket | `reports-service GET/POST /api/reports/chats`; preservar processamento e download, renomear ação primária |

`/dashboard/...` abreviado nas linhas acima fica sob `/api/whatsapp`. A habilitação do menu não representa toda a autorização: verificar também layout, módulos e APIs na implementação.

## Especiais, personalizados e configuração

| Rota | Estado no código e atenção necessária |
|---|---|
| `/reports/mailing-analysis` | Entrada comentada em `reportsRoutes`; página CRM abre iframe HTML do reports-service; reports-frontend tem implementação própria. Controller já oferece pesquisa de carteiras/operadores, filtros JSON e exportação PDF/CSV. Preservar isso ao migrar |
| `/reports/regua-carteira-sintetico-whatsapp` | Entrada comentada; iframe HTML no CRM e tela própria no reports-frontend. Contrato especial de carteiras/operadores; inventariar integralmente antes de substituir |
| `/reports/generated` e `/reports/generated/[reportId]` | Listagem de cards sem busca na página analisada; backend exige perfil gerencial, filtra por tenant/visibilidade e limita a 100 registros. Viewer oferece filtros dinâmicos com Autocomplete quando há opções; sem opções, entidades podem exigir IDs numéricos. Executa ao abrir e possui ações de salvar/copiar/layout/exportar |
| `/reports/dashboards` e `/reports/dashboards/[id]` | Rotas presentes e entradas comentadas no menu; tratar como ferramenta de configuração/consulta personalizada e validar uso/habilitação antes de expor |
| `/reports/metrics` e `/reports/metrics/new` | Configuração de métricas; não confundir com um relatório pronto no catálogo |
| `/reports/report-generator` | Formulário SQL SELECT, descrição, resultado em modal e exportação, mais histórico. Entrada comentada; manter separado da jornada comum e sem ampliar acesso |

No `reports-frontend/src/app/[instance]/reports/layout.tsx`, há navegação própria com Análise de Mailing e Régua por Carteira. Não foi verificado quantos usuários a utilizam ou se ela está publicada.

## Arquivos para retomar

Referências pontuais na base `homolog` congelada acima (linhas dessa base, não necessariamente do checkout aberto): `src/lib/ui-system/navigation.ts:95` (catálogo de menu), `:125` (alias WhatsApp), `:370` (roteamento moderno); `reports/dashboard/dashboard-filters.tsx:144`/`:163`/`:194` (selects de entidades) e `:352`/`:361` (Atualizar/Recarregar); `reports/chats/form.tsx:45` (Autocomplete); `reports/dashboard/sales-funnel-report.tsx:13` (valores fixos); `reports/lead-origin-quality/lead-origin-quality-report.tsx:152` (efeito de carga); `reports/sales/financial-filters.tsx:53` (origem das opções de operador); `reports/mailing-analysis/page.tsx:22` (iframe). Nos caminhos abreviados `reports/...`, aplica-se o prefixo frontend declarado acima.

No `reports-service` local analisado: `src/controllers/mailing-analysis.controller.ts:247`/`:264` (busca já existente) e `:395`–`:397` (HTML e APIs); `src/services/generated-report.service.ts:320` (listagem, visibilidade e teto de 100). Essas referências permitem revisar o diagnóstico sem assumir comportamento publicado.

- Navegação `homolog`: `src/lib/ui-system/navigation.ts`, especialmente `reportsRoutes`, `getNavigationItems` e `isModernCrmPath`. Este último trata apenas alguns subcaminhos de reports como modernos, exigindo revisar a nova central e cada rota migrada.
- Navegação do checkout inicial: `src/app/(private)/[instance]/header.tsx`; gates em `layout.tsx`. A refatoração deve considerar as variantes efetivamente implantadas.
- Layout e controles: `reports/_components/report-ui.tsx`, `reports/dashboard/dashboard-filters.tsx`, `reports/sales/financial-filters.tsx`, `src/lib/ui-system/crm-filters.tsx`.
- Execução: `reports/dashboard/dashboard-context.tsx`, `reports/sales/financial-context.tsx`, `reports/chats/chats-reports-context.tsx`.
- Demonstração a classificar: `reports/dashboard/sales-funnel-report.tsx` na `homolog`.
- Personalizados: `reports/generated/page.tsx`, `reports/generated/[reportId]/page.tsx`, `src/lib/reports/api.ts` e `reports-service/src/services/generated-report.service.ts`.
- Endpoints: `reports-service/src/controllers/{reports,chat-report,generated-reports,mailing-analysis,regua-carteira-sintetico-whatsapp}.controller.ts` e UI HTML compartilhada `controllers/shared/report-page-ui.ts`.
- Contratos comerciais: `src/lib/services/marketing.service.ts`, `src/lib/services/financial.service.ts`.

## Pendências de descoberta para implementação

Registrar para cada relatório: tenant/perfil/flags autorizados; filtros e defaults; significado das datas; endpoint/parâmetros; opções paginadas disponíveis; colunas/indicadores; formatos; tempo/volume; links externos; estado de publicação. Capturar telas autenticadas e repetir a jornada real. Medir uso antes de definir ordem definitiva. Nenhuma conclusão deste inventário foi baseada em SQL ou inferência de schema.
