# Cadastro completo de clientes

Administradores podem abrir **Novo cadastro completo** na lista de clientes ou **Abrir cadastro completo** na ficha existente. As rotas são `/[instance]/crm-customers/new` e `/[instance]/crm-customers/:customerId`.

O formulário usa campos permitidos e limites reais retornados pelo backend, organizados em Identificação, Endereço, Telefones e e-mails, Origem e classificação, e Informações administrativas. Campos financeiros/derivados não são expostos para edição. Ativo permite a desativação existente sem apagar histórico. O cliente de sistema é somente leitura.

As opções de grupos, origens, mídias, unidades, segmentos, usuários, campanhas e cargos vêm de consultas reais. Busca de opções é assíncrona e limitada; o usuário pode refinar o texto. Um código histórico ausente/zero continua identificável e preservado enquanto não for alterado. Esvaziar um campo opcional emite NULL explícito; omissão e valores históricos zero/NULL permanecem distintos. Rótulos e grupos são em português, sem expor nomes físicos de SQL na tela.

Cada edição usa a versão original e somente os campos alterados. Conflitos mantêm o rascunho. Falhas de resposta/releitura ou resultado UNKNOWN bloqueiam gravações até **Conferir dados**, com descarte explícito do rascunho antes da releitura. Uma falha de releitura não libera o bloqueio. A renovação da sessão preserva rascunhos e não repete gravações. Respostas de outro tenant/cliente/sessão não são aplicadas ao formulário atual.

O cliente HTTP fixa token e tenant por chamada antes dos hooks assíncronos globais. Ele desabilita injeção/renovação/replay automáticos nas operações deste módulo. O backend trata x-crm-instance apenas como precondição adicional e nunca como seletor de banco. A renovação global de sessão continua sendo responsabilidade do AuthProvider; uma nova sessão provoca revalidação explícita quando há rascunho ou gravação em andamento.

Resultado incerto ao criar não oferece repetição automática: o usuário deve conferir a lista de clientes e confirmar que pode iniciar outro cadastro. O bloqueio é guardado na sessionStorage por tenant/usuário/contexto, somente estado e horário, sem dados do cliente nem credenciais.

Contatos possuem criar/editar/excluir por cliente, cargo real e versão original. Quando a identidade física é manual, o formulário exige código positivo explícito. Marcas mostram cada vínculo separadamente, nome da marca e data de compra. Um vínculo com compra não pode ser removido; não se substituem arrays nem se deduplica histórico.

Os testes de navegador usam a implementação real dos componentes com serviços sintéticos isolados em `tests/crm-registration`. Foram verificados15 cenários distintos: cadastro, edição parcial/NULL, lookup e valor histórico, CRUD de contato, marca/histórico, conflito, UNKNOWN, rede, resposta tardia de tenant, troca de sessão durante escrita, renovação sem escrita, persistência de bloqueio de criação após reload, perfil não ADMIN, mobile e tema escuro. Suites focadas repetiram os fluxos de sessão/bloqueio após a correção da preservação do rascunho.

`npm run test:crm-registration:e2e` usa porta4194 e saída isolada `test-results-crm-registration`. `vitest run src/lib/crm-customer-form.test.ts src/lib/sdk-local/customer-crm-api.test.ts` cobre24 casos de contrato/transporte. Screenshots são evidência local de componentes com dados sintéticos; a validação autenticada em homologação é registrada separadamente no plano central.
