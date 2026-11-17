---
id: INF-20261117-002
title: Execução da refatoração de relatórios
service: cross-service
type: refactor
status: planned
owner: unassigned
created_at: 2026-11-17
updated_at: 2026-11-17
depends_on: []
related_paths:
  - inpulse-frontend
  - reports-service
  - reports-frontend
  - marketing-service
  - whatsapp-service
source_docs:
  - planejamento/cross-service/INF-20261117-002-refatoracao-relatorios/plan.md
  - planejamento/cross-service/INF-20261117-002-refatoracao-relatorios/inventory.md
---

# Tarefas

O planejamento foi entregue. As tarefas de implementação abaixo permanecem `todo`; não confundir conclusão da análise com refatoração implantada.

| ID | Tarefa e entrega | Estado | Depende de | Dono sugerido |
|---|---|---|---|---|
| T01 | Inventário estático de rotas, navegação, filtros e contratos; registrar SHAs e incertezas | done | — | codex |
| T02 | Plano do catálogo, filtros, geração, migração e aceite | done | T01 | codex |
| T03 | Confirmar runtime/roteamento dos frontends, matriz tenant/perfil/flags e uso real; completar contratos por relatório | todo | T01 | Frontend + operação |
| T04 | Wireframes central/lista e tela de relatório em desktop/mobile; revisar terminologia e regras temporais com operação | todo | T02, T03 | Produto + frontend |
| T05 | Classificar Funil demonstrativo, equivalências de performance e ferramentas ocultas; registrar destino de cada item | todo | T03 | Produto + donos dos dados |
| T06 | Registro tipado de relatórios, regras de disponibilidade, central pesquisável, breadcrumbs, aliases/deep links e roteamento legado/moderno | todo | T04, T05 | inpulse-frontend |
| T07 | Componentes compartilhados e estado rascunho/aplicado; estados de resultado, validação e controle de concorrência | todo | T04 | inpulse-frontend |
| T08 | Combobox de entidades com busca, multisseleção e paginação; reaproveitar APIs autorizadas ou especificar faltantes | todo | T03, T07 | Frontend + APIs donas |
| T09 | Piloto Mensagens por Operador: catálogo → filtros → gerar → resultado/saídas suportadas | todo | T06, T07, T08 | Frontend + whatsapp-service |
| T10 | Piloto Vendas: mesmo fluxo e fonte independente de opções de operadores; preservar situação, agrupamento e comparação | todo | T06, T07, T08 | Frontend + marketing-service |
| T11 | Validar pilotos: permissões, paridade dos números, requisições, datas, exportações suportadas, mobile/temas/teclado | todo | T09, T10 | QA + operação |
| T12 | Migrar mensagens restantes, contatos aguardando retorno e apresentações de desempenho, preservando detalhes/agenda | todo | T11, T05 | Frontend + whatsapp-service |
| T13 | Migrar metas, origem/qualidade, perdas e satisfação; separar configuração e consulta | todo | T11 | Frontend + marketing/reports-service |
| T14 | Conversas: filtros comuns, geração de arquivo, histórico pesquisável e recuperação de status/download | todo | T11 | Frontend + reports-service |
| T15 | Personalizados: catálogo/lista pesquisável, filtros de entidade, estados de execução, privacidade e exportações | todo | T11 | Frontend + reports-service |
| T16 | Mailing/Régua: conferir paridade e migrar UI para React aproveitando APIs; preservar app externo/links até validar retirada | todo | T03, T11 | Frontend + reports-service/reports-frontend |
| T17 | Ferramentas avançadas e limpeza dos seletores/menus antigos após cobertura; redirects sem perda de contexto | todo | T12, T13, T14, T15, T16 | inpulse-frontend |
| T18 | Integrar alterações funcionais atuais em homolog, gerar artefatos e executar matriz autenticada/comparativa de regressão | todo | T17 | Donos dos serviços + QA |
| T19 | Liberação gradual, evidências por tenant, métricas e rollback; produção somente após preparar/verificar release concreta | todo | T18 | Operação + donos dos serviços |

## Entregas e checkpoints

- Onda 0: T03–T05. Matriz e desenho completos; sem publicação de código funcional.
- Onda 1: T06–T11. Fundação e dois pilotos utilizáveis; pode integrar e validar esse recorte em homolog antes das ondas seguintes.
- Onda 2: T12–T13. Relatórios prontos consistentes.
- Onda 3: T14–T17. Arquivos, personalizados, externos e ferramentas.
- Onda 4: T18–T19. Validação integral e publicação gradual. A integração em homolog acontece também a cada onda, não apenas no final.

## Próxima ação

Na abertura da implementação, executar T03 e T04 na base atualizada da `homolog`, preservando as branches e alterações locais. Prioridade sugerida: catálogo e pilotos de Mensagens por Operador/Vendas. Não iniciar reescrita de todos os cálculos ou dos backends.

## Bloqueios e estimativa

Sem bloqueio para a entrega do plano. Implementação precisa de escolha de tenant piloto, acesso de homolog e validação de regras/uso; isso ainda não foi realizado. Não há estimativa fechada: primeiro dimensionar as APIs de pesquisa e os contratos especiais em T03, depois estimar cada onda. Não declarar prazo com base apenas em quantidade de telas.

## Registro exigido por relatório migrado

Rota/ID; base anterior/nova; serviço dono; permissões/flags; filtros e data de referência; formatos; comparação dos resultados; evidências desktop/mobile; testes; SHAs; artefatos; validação homolog; condição de rollback. Atualizar este arquivo e o catálogo central conforme a execução avançar.
