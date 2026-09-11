# Regressões de envio no compositor

Na raiz de `inpulse-frontend`, execute:

```powershell
npx playwright test --config tests/chat-send.config.ts
```

A configuração inicia um servidor Vite local na porta 4181 e executa os cenários no Chromium. O harness usa `ChatProvider`, seu reducer, armazenamento de tentativas e `ChatPendingSends` reais, com um editor mínimo. Os contextos de autenticação, WhatsApp e chat interno são simulados; respostas de envio e consulta são resolvidas explicitamente pelos testes. Tráfego externo e chamadas `/api/` são bloqueados.

Os testes cobrem limpeza imediata, envios concorrentes, preservação de novos rascunhos, anexos/citações/menções, falhas incertas, recuperação de falhas definitivas, troca de chat/tenant, renovação do token, reload e manutenção do bloqueio após um recibo `PENDING`. Também exercitam os botões reais de consulta, recuperação e confirmação manual do chat interno. Não validam o layout completo da tela ou entrega real ao WhatsApp.

Para funcionar na aplicação, o backend precisa suportar o POST com `idempotencyKey` e a consulta `GET /api/whatsapp/:clientId/message-attempts/:idempotencyKey`, além da migração `whatsapp-service/prisma/migrations/20260908120000_operator_outbound_send/migration.sql` aplicada. Estes testes não iniciam o backend, aplicam migrações ou fazem deploy.
