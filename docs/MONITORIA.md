# Monitoria de conversas e telefonia

A rota `/{instance}/monitor` exige perfil ADMIN, assim como os novos endpoints do
whatsapp-service. A autorização de instância e setor continua sendo validada pelo
backend. Publicar o backend antes do frontend: a tela depende dos endpoints de busca,
resumo e histórico paginado; não faz fallback para carregar históricos completos.

## Operação

- Os filtros são editados como rascunho e aplicados por **Aplicar filtros** ou Enter.
  Os indicadores do topo aplicam apenas seu próprio filtro rápido, sem aplicar um
  rascunho ainda não confirmado. **Limpar** restaura os filtros padrão.
- Períodos incluem todo o último dia escolhido, no fuso do navegador; os limites
  são enviados como instantes ISO para não depender do fuso da API.
- Preferências de filtro, tamanho de página, modo compacto e atualização automática
  são isoladas por instância e usuário. O texto pesquisado não é salvo no navegador.
- A ordenação inicial é por urgência. Os indicadores representam o conjunto filtrado
  completo, não apenas os itens da página. Agendamentos incluem pendentes vencidos e
  os previstos para as próximas 24 horas. **Em atendimento** inclui os subconjuntos
  aguardando atendente e aguardando cliente; não se devem somar esses três indicadores.
- O prazo de resposta usa o parâmetro de sessão `monitor:sla_minutes` do backend.
  Sem um valor positivo configurado, a tela mostra **SLA não configurado** e desabilita
  o filtro de SLA. A implantação não escolhe um prazo para os clientes.
- Eventos do socket solicitam atualização agrupada, no máximo a cada cinco segundos;
  há também conferência a cada 60 segundos enquanto a aba estiver visível. A cobertura
  instantânea depende dos eventos recebidos pela sessão. Reconexão e retorno à aba
  solicitam reconciliação. É possível pausar ou atualizar manualmente.
- Um modal aberto pausa temporariamente a atualização automática da lista. Visualizar
  um histórico não marca mensagens como lidas. **Responder nesta conversa** abre o
  fluxo de envio existente mediante ação explícita do supervisor.
- Falhas de consulta permanecem visíveis e permitem nova tentativa. HTTP 429 respeita
  Retry-After inclusive em solicitações manuais e mudanças de filtros.
- Transferir/finalizar bloqueia clique duplicado e só fecha e atualiza a lista após
  confirmação. Erros mantêm o modal aberto; troca de instância/usuário invalida a ação.

## Validação local

`npm run test:monitor:e2e` cobre os fluxos com APIs simuladas; `npm run test:unit`
inclui armazenamento, contrato HTTP e proteção contra respostas antigas. Consulte
`tests/monitor/README.md`. A validação SQL e os limites de desempenho/replicação
estão documentados no whatsapp-service. O ganho de tempo de consulta deve ser medido
com dados e EXPLAIN no ambiente correspondente antes de afirmar resultado em produção.

## Telefonia

A aba **Telefonia** consulta o customers-service; a aba **Conversas** continua usando
o whatsapp-service. Somente a aba ativa mantém sua consulta e atualização automática.
Publicar os novos endpoints do customers-service antes desta versão do frontend.
Não há execução de migração ou alteração de dados ao abrir a monitoria.

- **Agendamentos:** uma linha por compromisso telefônico pendente.
- **Ligações:** uma linha por tentativa registrada nas fontes de histórico suportadas;
  não é uma captura de áudio nem prova de atendimento pela operadora telefônica.
  Quando o início é desconhecido, a data de finalização identifica o registro e a
  duração permanece não informada, sem inventar uma duração de zero segundos.
- **Sem agendamento:** uma linha por cliente para o qual **não existe nenhum**
  `campanhas_clientes` com `CONCLUIDO = 'NAO'`. Datas, campanha selecionada e operador
  do agendamento não restringem essa verificação. `NULL` não equivale a `'NAO'`.
- A campanha filtrada é a **do agendamento**, não `clientes.COD_CAMPANHA`. Em Sem
  agendamento, selecionar campanhas exige vínculo histórico do cliente com alguma
  dessas campanhas; um cliente sem vínculo não corresponde ao filtro.
- Operador do cliente significa o responsável no cadastro do cliente, não o autor
  da chamada ou o operador do agendamento.
- **Nunca trabalhado:** não há tentativa de atendimento registrada nas fontes CRM
  consultadas de telefonia ou WhatsApp. Criar apenas uma agenda não constitui uma
  tentativa; uma tentativa sem contato efetivo já caracteriza cliente trabalhado.
  Esta definição não comprova ausência de interações fora do histórico integrado.
- **Recompra:** próxima data estimada pelo histórico de compras, com pelo menos duas
  datas distintas, desconsiderando compras canceladas. Não utiliza `PERIODO_RECOMPRA`. Sem histórico suficiente, a data
  não é estimada e o cliente não corresponde a um período de recompra preenchido.
- Última compra e último contato filtram a ocorrência mais recente do cliente;
  encontrar uma ocorrência antiga dentro do período não basta. Contato efetivo é
  identificado pelo resultado de atendimento, não pelo cadastro de um telefone.
  Último contato considera telefonia e WhatsApp registrados no CRM; última compra
  e produtos comprados desconsideram compras canceladas.
- Os filtros **menos de dois contatos/ligações** incluem zero e um, no mês de
  referência selecionado. As contagens mensais são de telefonia, independentemente
  do período de agendamento; ausência de registro não prova que uma chamada externa
  não aconteceu. Consulte as fontes e deduplicação em `customers-service/docs`.
- Múltiplas opções no mesmo campo usam **OU**; campos diferentes usam **E**. Produto
  comprado significa qualquer dos produtos selecionados no histórico. O período de
  última compra não obriga o produto a pertencer à última compra.
- Cidades são identificadas por UF e nome; bairros por UF, cidade e nome. Mudar os
  filtros geográficos remove seleções descendentes incompatíveis.

Os seletores avançados têm pesquisa e paginação remotas, seleção preservada entre
páginas e confirmação/cancelamento. Confirmar uma seleção altera o rascunho; a lista
só muda ao **Aplicar filtros**. As preferências são separadas por instância, usuário
e modo. Texto livre, cliente individual e localização detalhada não são persistidos.
Os detalhes do cliente abrem somente para consulta; não iniciam ligação.

O período de agendamento só é aplicado no modo Agendamentos e o de chamada no modo
Ligações. Todos os períodos de data incluem o último dia completo no fuso do
navegador. O mês de referência fica explícito para permitir auditoria de consultas
salvas. Falhas não são convertidas em lista vazia; HTTP 429 respeita Retry-After.

A validação de navegador usa respostas fictícias, não confirma dados do CRM real,
CDR/Asterisk, permissões de produção ou desempenho MySQL. Antes de publicar, validar
os totais com exemplos reais de clientes, chamadas repetidas, reagendamentos, campos
nulos e limites de dia/mês. Não há reenvio, discagem ou finalização automática.
