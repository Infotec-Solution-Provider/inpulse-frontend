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

Uma rejeição explícita (`ERROR`) recebida na resposta, consulta da tentativa ou atualização da conversa aparece como falha com o motivo do provedor. A recuperação só restaura o rascunho e exige novo envio pelo operador. Os cenários também verificam que `UNKNOWN` continua incerto, sem recuperação ou reenvio automático.

Uma fixture com o CSS Tailwind da aplicação verifica os componentes de bolha pendente e ícones em telas de 390 e 1000 pixels, incluindo tema escuro, tooltip pelo teclado, descarte e substituição da bolha pelo recibo visível. As capturas ficam em `test-results/*/pending-send-*.png`. A bolha do recibo nessa fixture é simplificada; a integração com a lista completa de mensagens não é montada.

`chat-scroll.pw.ts` monta os três renderizadores reais de mensagens (WhatsApp, conversa interna e grupo interno) com o `ChatProvider` e as bolhas pendentes reais. O painel, cabeçalhos e editor são simplificados; há ancestrais com overflow proposital para detectar rolagem fora da lista, inclusive em um contêiner com `overflow: hidden`. Seis cenários combinam os três tipos com históricos curtos e longos. Cada cenário mede posição/tamanho do painel, cabeçalhos e editor, além da rolagem de todos os ancestrais, antes e depois de dois envios seguidos e suas confirmações em FIFO. A lista deve continuar no fim enquanto o restante da área mantém posição e tamanho. As bolhas de mensagens confirmadas usam um componente mínimo sem mídia; esta é uma regressão local de rolagem, não uma validação da tela completa em produção.

Para funcionar na aplicação, o backend precisa suportar o POST com `idempotencyKey` e a consulta `GET /api/whatsapp/:clientId/message-attempts/:idempotencyKey`, além da migração `whatsapp-service/prisma/migrations/20260908120000_operator_outbound_send/migration.sql` aplicada. Estes testes não iniciam o backend, aplicam migrações ou fazem deploy.
## Navegação entre páginas

A fila pertence ao `ChatProvider` do layout da instância, acima das páginas e dos modais. A fixture mantém esse mesmo tempo de vida: desmonta o editor ao sair da página, mantendo o provider. O teste de navegação aceita duas mensagens, sai enquanto a primeira está em andamento e verifica que a segunda continua na fila e é enviada uma única vez. Antes da correção, desmontar o provider da página convertia a segunda mensagem de `queued` para `failed`, sem chamar o serviço de envio. Logout/troca de tenant e reload continuam sendo testados separadamente; a fixture não monta o roteador Next completo.
