# Hipóteses de falha no envio pelo frontend

Executar `npx playwright test -c tests/send-transport.config.ts --workers=2` a partir do frontend.

Esta fixture monta `ChatProvider`, `WhatsappProvider`, `WhatsappClient`, `ApiClient`, o coordenador real de autenticação e o fluxo real de preparação de arquivos. Ao contrário de `tests/chat-send`, não substitui `sendMessage` nem os interceptadores Axios. As respostas HTTP são controladas pelo Playwright e qualquer endereço externo é bloqueado. O canal simulado é `GUPSHUP`.

Não monta o roteador Next, o editor completo nem o `AuthProvider` que administra login/logout e suas tentativas de renovação. A função de renovação configurada usa HTTP local controlado. Não chama o backend real, banco ou Gupshup. A reprodução de uma resposta injetada demonstra o comportamento do frontend diante dela; não comprova que essa resposta ocorreu em produção.

| Hipótese | Resultado local |
| --- | --- |
| Troca de conversa durante envios | Destino e conteúdo preservados; 20 mensagens aceitas em um evento continuam em FIFO enquanto outra conversa envia independentemente. |
| Token expirado + renovação HTTP 503 | Nenhum POST da mensagem sai. Antes da correção, a tentativa virava `unconfirmed` e tentava consultar um registro inexistente. Agora é recuperável, com motivo de autenticação e sem consulta/reenvio automático. |
| POST rejeitado com 401 + renovação falha | A primeira requisição foi rejeitada; não há segundo POST. Agora o rascunho é recuperável. |
| Token ainda válido + renovação em segundo plano falha | Mensagem enviada normalmente com o token válido. |
| POST recebe 401 + renovação funciona | Repete apenas após a rejeição, preservando chave e formulário originais. |
| Consulta de arquivo falha | Bolha `failed`, sem prefixo, com recuperação; nenhum POST ao whatsapp-service. |
| Arquivo já cadastrado | Envia uma vez por `fileId`, sem anexar novamente os bytes. |
| Rejeição HTTP 400 de mensagem citada | Bolha local `failed`, sem consulta de tentativa; a requisição chegou à entrada do backend simulada. A existência de regras reais de validação deve ser conferida no backend. |
| Resposta do POST perdida + recibo disponível | Consulta a mesma chave, recupera o recibo, sem segundo POST. |
| Resposta perdida + recibo ausente | Mantém `unconfirmed`, sem oferecer recuperação/reenvio como se fosse falha confirmada. |

O teste de token expirado falhou antes da correção porque esperava `failed` e recebeu `unconfirmed`, mesmo com zero requisições ao endpoint de mensagem. A correção só marca como seguramente não enviado quando a autenticação impede o despacho ou após um 401 explícito. Uma falha de autenticação durante a consulta posterior não altera a incerteza do POST original; há teste unitário dessa proteção em `reliable-message-send.test.ts`.

## Reload antes da confirmação

Quatro cenários adicionais cobrem reload com mensagem ainda na fila local, POST original atrasado (texto e anexo já preparado) e retomada rejeitada enquanto o primeiro POST ainda pode terminar. O botão **Verificar envio** só faz GET; um 404 mantém a incerteza. Sem `messageId`, uma consulta que não encontrou a tentativa permite **Retomar envio**, uma ação manual que repete o POST identificado com a mesma chave, destino e conteúdo. A fixture modela a deduplicação do backend por chave e verifica um único registro mesmo quando a primeira requisição termina depois da retomada. Os testes do repositório backend verificam transação, unicidade e concorrência separadamente.

O `fileId` preparado é preservado junto à tentativa antes do POST. Anexos antigos ou ainda não preparados cujos bytes foram perdidos no reload não recebem essa ação, pois seu conteúdo original não está disponível. Mensagens com recibo, incluindo `UNKNOWN`, permanecem somente para consulta. Uma falha da retomada mantém a mensagem incerta; não libera edição com uma chave nova. Duplo clique não agenda dois POSTs de retomada.
