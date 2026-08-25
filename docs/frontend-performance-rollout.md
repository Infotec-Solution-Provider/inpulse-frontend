# Rollout incremental de performance

## Estado das branches

- `temp/stable-with-pannel`: somente telemetria opt-in.
- `performance`: experimentos independentes, todos desligados por padrão.
- O backend (`whatsapp-service`) deve ser implantado antes do frontend.

## Flags

| Flag                                             | Finalidade                        | Padrão  |
| ------------------------------------------------ | --------------------------------- | ------- |
| `feature_frontend_performance_telemetry_enabled` | coleta sanitizada                 | `false` |
| `feature_perf_paginated_chat_history_enabled`    | resumos e páginas de 50 mensagens | `false` |
| `feature_perf_virtualized_chat_list_enabled`     | lista virtualizada de chats       | `false` |
| `feature_perf_stable_socket_listeners_enabled`   | listeners estáveis por referência | `false` |

Ative uma flag por vez e apenas na instância piloto. Não ligue os três experimentos simultaneamente antes de congelar a linha de base.

## Implantação segura da telemetria

1. Faça backup do MySQL e registre os SHAs dos dois artefatos.
2. Confirme que não existe migration pendente ou tabela conflitante para `frontend_performance_sessions` e `frontend_performance_samples`.
3. Implante `whatsapp-service`, execute `prisma migrate deploy` e valide que a flag continua `false`.
4. Faça smoke autenticado do `POST /api/whatsapp/frontend-performance/batches` com a flag desligada; a API deve rejeitar/desconsiderar a coleta sem persistir amostras.
5. Implante o frontend instrumentado e percorra autenticação, chats WhatsApp/internos e rotas administrativas com a flag desligada.
6. Ative apenas `feature_frontend_performance_telemetry_enabled` nas instâncias piloto.
7. Monitore erros HTTP, crescimento das duas tabelas, latência do batch e uso de CPU/IO do MySQL.
8. Colete quatro horas exatas e exporte o baseline antes de ativar qualquer experimento.

Rollback: desligue as flags primeiro; depois reverta os artefatos se necessário. Não remova as tabelas, pois elas preservam a linha de base e a rotina diária já aplica retenção de 30 dias.

## Consulta e congelamento do baseline

- Resumo ADMIN: `GET /api/whatsapp/frontend-performance/summary`.
- Amostras sanitizadas: `GET /api/whatsapp/frontend-performance/export.csv`.
- Registre filtros, horário inicial/final, build SHA e o CSV exportado em armazenamento operacional versionado.
- Compare coleta ligada/desligada no mesmo build. A instrumentação não é aprovada se piorar p75 em mais de 3% ou criar long tasks.

## Laboratório reproduzível

Antes dos testes, execute `pnpm build`.

```powershell
pnpm test:performance

$env:PERF_CHAT_COUNT = "2000"
$env:PERF_CPU_RATE = "6"
pnpm test:performance
Remove-Item Env:PERF_CHAT_COUNT
Remove-Item Env:PERF_CPU_RATE
```

O laboratório usa build de produção, rede 3G limitada, paginação por cursor, 50 eventos de socket e salva métricas/traces em `.performance-artifacts/`. O orçamento absoluto é apenas um guard rail; aprovação deve comparar p75/p95 e tempo total de long tasks contra o baseline congelado do mesmo equipamento.

## Ordem dos experimentos

1. `feature_perf_paginated_chat_history_enabled`.
2. `feature_perf_virtualized_chat_list_enabled`.
3. `feature_perf_stable_socket_listeners_enabled`.
4. Próximos candidatos: segmentação de providers, virtualização de mensagens e lazy boundaries para emoji, planilhas, gráficos, Data Grid e modais.

Para cada flag: rode TypeScript, unitários, build, Playwright funcional, laboratório 500/4x e 2.000/6x; compare A/B; só mantenha ligada se superar a variação, não piorar métrica crítica acima de 5% e preservar todos os fluxos funcionais do plano.
