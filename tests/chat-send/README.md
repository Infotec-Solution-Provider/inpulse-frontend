# Regressões de envio no compositor

Na raiz de `inpulse-frontend`, execute:

```powershell
npx playwright test --config tests/chat-send.config.ts
```

A configuração inicia um servidor Vite local na porta 4181 e executa os cenários no Chromium. O harness usa `ChatProvider`, seu reducer, armazenamento de tentativas e `ChatPendingSends` reais, com um editor mínimo. Os contextos de autenticação, WhatsApp e chat interno são simulados; respostas de envio e consulta são resolvidas explicitamente pelos testes. Tráfego externo e chamadas `/api/` são bloqueados.

Os 20 cenários cobrem a aceitação contínua de mensagens: cada envio limpa o editor imediatamente e recebe uma identificação própria, enquanto uma fila por conversa despacha as mensagens em ordem (FIFO), em segundo plano. O recibo `PENDING` mantém as próximas mensagens na fila até a confirmação, sem bloquear o editor nem o botão de envio. Conversas diferentes avançam independentemente, inclusive após navegar para outro chat. A consulta periódica continua a cada cinco segundos mesmo quando novas mensagens chegam à fila em intervalos menores.

Também são verificados duplo Enter sem novo conteúdo, repetição intencional do mesmo texto, preservação de novos rascunhos, anexos/citações/menções e destino/canal capturados antes de enfileirar, falhas definitivas e incertas, renovação do token, troca de tenant e reload. Uma tentativa incerta nunca é reenviada automaticamente; as próximas intenções podem continuar. Após reload, tentativas restauradas preservam a identificação para consulta, sem novos POSTs automáticos. Os cenários exercitam os botões reais de consulta, recuperação e confirmação manual do chat interno. Não validam o layout completo da tela ou entrega real ao WhatsApp.

Para funcionar na aplicação, o backend precisa suportar o POST com `idempotencyKey` e a consulta `GET /api/whatsapp/:clientId/message-attempts/:idempotencyKey`, além da migração `whatsapp-service/prisma/migrations/20260908120000_operator_outbound_send/migration.sql` aplicada. Estes testes não iniciam o backend, aplicam migrações ou fazem deploy.
