---
id: INF-20261117-002
title: Execução da refatoração de relatórios
service: cross-service
type: refactor
status: in-progress
owner: codex
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

Execução iniciada em 17/11/2026 por autorização do usuário. Central e pilotos implementados e testados localmente; sem publicação. `done` em tarefas de código não significa implantação ou paridade autenticada em homolog.

| ID | Tarefa e entrega | Estado | Depende de | Dono sugerido |
|---|---|---|---|---|
| T01 | Inventário estático de rotas, navegação, filtros e contratos; registrar SHAs e incertezas | done | — | codex |
| T02 | Plano do catálogo, filtros, geração, migração e aceite | done | T01 | codex |
| T03 | Confirmar runtime/roteamento dos frontends, matriz tenant/perfil/flags e uso real; completar contratos por relatório | in-progress | T01 | Frontend + operação |
| T04 | Wireframes central/lista e tela de relatório em desktop/mobile; revisar terminologia e regras temporais com operação | in-progress | T02, T03 | Produto + frontend |
| T05 | Classificar Funil demonstrativo, equivalências de performance e ferramentas ocultas; registrar destino de cada item | in-progress | T03 | Produto + donos dos dados |
| T06 | Registro tipado de relatórios, regras de disponibilidade, central pesquisável, breadcrumbs, aliases/deep links e roteamento legado/moderno | done | T04, T05 | inpulse-frontend |
| T07 | Componentes compartilhados e estado rascunho/aplicado; estados de resultado, validação e controle de concorrência | done | T04 | inpulse-frontend |
| T08 | Combobox de entidades com busca, multisseleção e paginação; reaproveitar APIs autorizadas ou especificar faltantes | in-progress | T03, T07 | Frontend + APIs donas |
| T09 | Piloto Mensagens por Operador: catálogo → filtros → gerar → resultado/saídas suportadas | done | T06, T07, T08 | Frontend + whatsapp-service |
| T10 | Piloto Vendas: mesmo fluxo e fonte independente de opções de operadores; preservar situação, agrupamento e comparação | done | T06, T07, T08 | Frontend + marketing-service |
| T11 | Validar pilotos: permissões, paridade dos números, requisições, datas, exportações suportadas, mobile/temas/teclado | in-progress | T09, T10 | QA + operação |
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

Validar os pilotos com dados e sessão reais de homolog, comparar números/formatos com a versão anterior e fechar as regras temporais com operação. Depois migrar os demais relatórios (T12/T13) sobre a fundação implementada, mantendo `homolog` como integração.

## Pendências da primeira onda

- T03: roteamento/catálogos locais confirmados; runtime remoto, uso real e matriz autenticada não verificados.
- T04: telas funcionais e capturas em 390/768/1440 px disponíveis; revisão com operação pendente.
- T05: Funil com valores fixos mantido fora da central; equivalência entre apresentações de performance e destino das ferramentas ocultas pendentes.
- T08: seletor simples de operadores com busca remota por nome/código, paginação, erro/retry e cancelamento implementado. Multisseleção/setores e demais entidades ainda pertencem às migrações seguintes.
- T11: 67 testes unitários relacionados, sete jornadas locais com APIs simuladas, TypeScript e build webpack passaram. Falta validação autenticada, conferência de números reais e benchmark. Não houve deploy.

## Registro exigido por relatório migrado

Rota/ID; base anterior/nova; serviço dono; permissões/flags; filtros e data de referência; formatos; comparação dos resultados; evidências desktop/mobile; testes; SHAs; artefatos; validação homolog; condição de rollback. Atualizar este arquivo e o catálogo central conforme a execução avançar.
