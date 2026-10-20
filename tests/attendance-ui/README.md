# Atendimento com dados fictícios

Execute `npx playwright test --config tests/attendance-ui.config.ts` na raiz do frontend.

As capturas são salvas em `test-results/attendance-ui-artifacts`. A variável opcional `ATTENDANCE_UI_ARTIFACTS_DIR` permite escolher outro diretório, como a pasta de evidências do planejamento. Para abrir apenas a prévia, execute `node tests/attendance-ui/server.mjs` e acesse `http://127.0.0.1:4210/tests/attendance-ui/index.html`; encerre a prévia antes de executar a suíte, que usa a mesma porta.

O servidor Vite local usa a porta 4210 e monta MonitorShell, Home, lista virtualizada, filtros, Chat, ChatProvider, compositor, bolhas e painéis de telefonia reais, com o CSS global real. Autenticação, dados, transporte SIP e serviços são simulados. Diálogos auxiliares carregados sob demanda, notificações e o seletor de emoji ficam fora desta suíte. Toda chamada a `/api/` e todo tráfego externo são bloqueados. O harness não se conecta a tenants nem ao WhatsApp.

A suíte cobre busca, filtro vazio, rascunho/cancelamento/aplicação dos filtros, ordenação, ação de fixar sem abrir a conversa, seleção por teclado, envio FIFO pelo compositor real, preservação do novo rascunho, citação, cancelamento de anexo, envio único de anexo com citação e legenda, estado UNKNOWN sem reenvio e voltar do navegador em celular. Enter nos menus, pesquisa e filtros não envia o rascunho; Shift + Enter cria uma linha. Captura os dois temas em sete dimensões, incluindo 320px, o breakpoint de 768px e paisagem, além do telefone ativo em desktop e celular. As capturas ficam em `planejamento/cross-service/INF-20261019-008-attendance-ui/artifacts`.

Os testes existentes em `chat-send`, `telephony` e `crm-shell` continuam responsáveis por detalhes de verificação automática, controle das ligações e persistência dos providers na navegação entre rotas. Esta validação local não comprova integração de APIs ou entrega real.
