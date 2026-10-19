# Segmentos de clientes

Rota administrativa `/{instance}/customer-segments`, disponível em Cadastros > Clientes · Segmentos e na lista de Clientes > Cadastros auxiliares · Segmentos. A tela exige usuário ADMIN; a API também aplica autorização e deriva o tenant da sessão.

Esta primeira entrega lista, busca por nome/código, ordena, pagina, cria e edita nome/ordem. Código é atribuído pelo banco; unidade existente é exibida por código e preservada. Exclusão e manutenção de unidade dependem das regras de integridade e catálogo de unidades do plano INF-20261019-001.

A edição envia `changes` e os valores originais completos (`NOME`, `ordem`, `COD_UNIDADE`). Conflito de edição preserva o rascunho; somente a ação explícita de recarregar substitui esse rascunho pelos dados atuais. Nome duplicado permite correção. Gravação com resultado desconhecido bloqueia repetição e orienta conferir os dados persistidos.

Criar com ordem em branco omite a coluna, permitindo o default do banco. Editar com ordem em branco envia NULL. Alterar a ordem de um registro legado sem nome preserva seu nome nulo. Os nomes antigos não são normalizados ao editar outro campo.

Novos nomes aceitam os caracteres preserváveis pelo transporte Latin1 atual. Unicode acima de U+00FF (incluindo € e travessão), emoji e controles U+0080–U+009F são recusados antes de salvar, conforme falha de round-trip identificada em teste MySQL real.

A ficha de cliente oferece seleção de segmento existente a administradores autorizados a editar o cliente. O comando envia o vínculo original como precondição, preserva opções legadas ausentes e exige releitura após conflito ou resultado desconhecido. Esse bloqueio persiste ao trocar de aba; somente uma leitura validada do cliente o libera. Respostas de outro cliente/tenant ou contexto anterior são descartadas. Limpar vínculo, excluir segmento e editar unidade continuam na T23.

Após uma gravação confirmada, a lista é recarregada, o cache de clientes do usuário/tenant é invalidado e `customer-segments-events` avisa os consumidores do lookup no tenant atual. O lookup `/api/customers/segments` continua com seu contrato anterior.

## Validação local

```powershell
node node_modules/vitest/vitest.mjs run src/lib/customer-segments-form.test.ts src/lib/sdk-local/customer-segments-api.test.ts
node node_modules/@playwright/test/cli.js test --config tests/customer-segments.config.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

O harness Playwright renderiza o componente real da página com fixtures locais isoladas, sem autenticação real e sem acessar serviços ou bancos. Cobre paginação, busca, ordenação, criar/editar, validação, precondição de edição, conflitos, duplicidade, gravação desconhecida, acesso, falha de leitura, vazio, mobile/landscape e aparência escura. Isso não substitui validação autenticada com o backend e os bancos de homologação.
