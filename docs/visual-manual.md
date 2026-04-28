# Manual Visual

## Objetivo

Este manual registra o vocabulario visual ja consolidado no frontend do InPulse CRM. Sempre que uma nova tela ou modulo for criado, a implementacao deve partir destes padroes antes de introduzir variacoes.

## Layout base

- Shell de pagina: `box-border h-full overflow-y-auto bg-white px-4 py-8 text-black dark:bg-gray-900 dark:text-white`
- Container principal: `mx-auto grid w-full max-w-[1480px] gap-6`
- Espacamento entre blocos: usar `gap-6` como ritmo padrao.
- Conteudo interno de cards: usar `p-6` para secoes principais e `p-4` para paineis internos.

## Superficies

- Card principal: `rounded-md border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900`
- Painel interno: `rounded-md bg-slate-50 p-4 dark:bg-slate-800/40`
- Faixa de chrome ou cabecalho operacional: `bg-slate-200 dark:bg-slate-800`
- Evitar `Paper` MUI cru sem borda, fundo e sombra explicitos.

## Cores

- Texto primario: `text-slate-900 dark:text-slate-100`
- Texto secundario: `text-slate-600 dark:text-slate-400`
- Labels e sobrancelhas: `text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400`
- Borda padrao: `border-slate-200 dark:border-slate-700`
- Hover neutro: branco no light e `slate-900/70` no dark.
- Evitar azuis saturados fora de feedback semantico; o produto usa base neutra em `slate`.

## Bordas e raios

- `rounded-md` para cards, faixas, filtros e blocos de informacao.
- `rounded-lg` para elementos encaixados dentro de cards.
- `rounded-2xl` reservado para bolhas de conversa e elementos claramente conversacionais.
- Bordas sempre sutis; sombra forte nao faz parte do padrao atual.

## Tipografia

- Titulo de pagina: `Typography variant="h4"` com `fontWeight={700}`.
- Titulos de secao: `text-sm` ou `text-xl` semibold, conforme densidade da tela.
- Texto descritivo: `text-sm text-slate-600 dark:text-slate-400`.
- Labels tecnicos ou pequenos: uppercase, `text-xs`, `tracking-wide`.

## Icones

- Icone principal de secao deve vir em um tile neutro: `rounded-md bg-slate-100 p-2` no light e `dark:bg-slate-800` no dark.
- Icones MUI sao apoio visual, nao o elemento principal da composicao.
- Evitar mais de um icone de destaque por cabecalho.

## Estados de conversa

- Mensagem enviada pelo usuario: `bg-green-200 text-slate-800 dark:bg-green-800 dark:text-slate-100`.
- Mensagem recebida/assistente: `bg-white border border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200`.
- Mensagem de sistema: base amarela (`yellow-200` / `yellow-800`).
- Excecoes ou alertas operacionais: base vermelha clara com borda explicita.

## Listas, filtros e chips

- Listas selecionaveis devem usar card interno claro, com item selecionado em branco + borda + sombra leve.
- Chips informativos: `size="small"`, `variant="outlined"`, com fundo branco ou `slate-900` no dark.
- Campos de filtro/entrada devem sentar sobre fundo branco no light e `slate-900` no dark, com borda `slate-200/700`.

## Regras praticas

- Antes de criar um estilo novo, tentar compor com os blocos: shell de pagina, card principal, painel interno e label uppercase.
- Se uma tela conversa com o modulo de chat, manter o mesmo vocabulário visual das mensagens existentes.
- Se um componente MUI conflitar com o visual da aplicacao, ajustar com `sx` ou classes explicitas.

## Nao fazer

- Nao usar fundos azuis fortes como base da tela.
- Nao misturar varias familias de raio na mesma secao sem motivo funcional.
- Nao usar cards sem borda em telas de CRUD, IA ou relatorios.
- Nao criar uma linguagem paralela so para um modulo isolado.

## Referencias atuais

- `src/app/(private)/[instance]/header.tsx`
- `src/app/(private)/[instance]/reports/dashboard/dashboard-report-card.tsx`
- `src/app/(private)/[instance]/(main)/(chat)/chat-header.tsx`
- `src/app/(private)/[instance]/(main)/(chat)/message.tsx`
- `src/app/(private)/[instance]/(cruds)/internal-groups/(table)/table-header.tsx`