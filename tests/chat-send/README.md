# Regressões de envio no compositor

Na raiz de `inpulse-frontend`, execute:

```powershell
npx playwright test --config tests/chat-send.config.ts
```

A configuração inicia um servidor Vite local na porta 4181 e executa os cenários no Chromium. O harness usa `ChatProvider`, seu reducer, armazenamento de tentativas, coordenador de verificações e `ChatPendingSends` reais, com um editor mínimo. Os contextos de autenticação, WhatsApp e chat interno são simulados; respostas de envio e verificação são resolvidas explicitamente pelos testes. Tráfego externo e chamadas `/api/` são bloqueados.

Os cenários cobrem a aceitação contínua de mensagens: cada envio limpa o editor imediatamente e recebe uma identificação própria, enquanto uma fila por conversa despacha as mensagens em ordem (FIFO), em segundo plano. O recibo `PENDING` mantém as próximas mensagens na fila até a confirmação, sem bloquear o editor nem o botão de envio. Conversas diferentes avançam independentemente, inclusive após navegar para outro chat. A primeira verificação automática ocorre após cinco segundos mesmo quando novas mensagens chegam à fila em intervalos menores.

Também são verificados duplo Enter sem novo conteúdo, repetição intencional do mesmo texto, preservação de novos rascunhos, anexos/citações/menções e destino/canal capturados antes de enfileirar, falhas definitivas e incertas, renovação do token, troca de tenant e reload. Uma tentativa incerta nunca é reenviada automaticamente; as próximas intenções podem continuar. Após reload, tentativas restauradas preservam a identificação para verificação, sem novos POSTs automáticos. Os cenários exercitam os ícones reais de verificação, recuperação e confirmação manual do chat interno. Não validam o layout completo da tela ou entrega real ao WhatsApp.

Mensagens sem confirmação são verificadas automaticamente mesmo sem recibo `messageId`. Os testes avançam o relógio do navegador para conferir os seis intervalos de 5/10/15/20/30/30 segundos, a pausa e a confirmação manual após a pausa. Também cobrem a ausência de verificações sobrepostas ou reenvios e a preservação do orçamento já gasto após reload.

Um recibo `PENDING` que permanece sem confirmação até o limite passa a `unconfirmed`, liberando as próximas mensagens da fila sem reenviar a primeira. Novas verificações automáticas deixam de ser agendadas ao atingir dois minutos; uma leitura já iniciada pode terminar depois. A verificação manual permanece disponível após a pausa.

Uma fixture com o CSS Tailwind da aplicação verifica os componentes de bolha pendente e ícones em telas de 390 e 1000 pixels, incluindo tema escuro, tooltip pelo teclado, descarte e substituição da bolha pelo recibo visível. As capturas ficam em `test-results/*/pending-send-*.png`. A bolha do recibo nessa fixture é simplificada; a integração com a lista completa de mensagens não é montada.

Para funcionar na aplicação, o backend precisa suportar o POST com `idempotencyKey` e a consulta `GET /api/whatsapp/:clientId/message-attempts/:idempotencyKey`, além da migração `whatsapp-service/prisma/migrations/20260908120000_operator_outbound_send/migration.sql` aplicada. Estes testes não iniciam o backend, aplicam migrações ou fazem deploy.
