# Console administrativo Infotec

A SPA em `admin-console/` é compilada separadamente do Next e publicada pelo `admin-service` sob `/infotec/admin/`. O menu dos layouts legado e moderno aparece para qualquer administrador autenticado no tenant `infotec`; o backend valida a autorização antes de criar a sessão administrativa.

```powershell
pnpm typecheck:admin
pnpm test:admin
pnpm build:admin
pnpm test:admin:e2e
```

O artefato é `dist-admin/`, incluindo a fonte Inter, CSS e JavaScript. O proxy deve encaminhar **todo** o prefixo `/infotec/admin/` ao admin-service antes da regra do frontend. A API usa exclusivamente `/infotec/admin/api`, sem os rewrites `/_svc` do Next. O contrato de integração é mantido em `admin-service/CONTRACT.md`.

## Comportamento

- Tenants: seleção explícita de ambiente, empresa, fonte, escopo e registro; busca por nome, chave e descrição; controles booleano, número, texto, enum, JSON e credencial.
- Servidor: consulta de processos existentes, configuração e start/stop/restart confirmados. Salvar configuração e aplicar a versão salva são ações distintas.
- Logs: PM2 ou processamento, filtros limitados, paginação e acompanhamento pausável. O conteúdo é exibido como texto e deve chegar redigido pelo backend.
- Histórico: ator, destino, operação, resultado e alterações redigidas. Credenciais não têm valores anteriores ou novos no histórico.

O frontend não guarda JWT, credenciais ou rascunhos em storage. Segredos começam vazios, vazio preserva a credencial e remoção é explícita. Somente identificadores de operações pendentes ficam no `sessionStorage`, vinculados ao ator e destino, para permitir conferência após recarga. Mutações não são repetidas automaticamente; falhas incertas exigem consulta do recibo. Conflito de revisão exige descartar e recarregar antes de salvar novamente.

Quando uma operação permanece `UNKNOWN`, “Encerrar acompanhamento” permite confirmar o encerramento somente local: remove o bookmark, descarta o rascunho e recarrega os valores atuais. O histórico continua indeterminado e nenhuma operação é reenviada ou marcada como concluída. Uma nova alteração exige revisão atual e uma nova ação explícita com outro identificador; navegação e logout ficam liberados.

A sessão HttpOnly dura 30 minutos e a SPA tenta renová-la a cada cinco minutos. A renovação revalida o ator no users-service. Se a autenticação estiver indisponível, a sessão original continua até expirar; após isso, a recuperação é via SSH.

## Validação local

Os testes Playwright servem o artefato real com uma API fixture em `127.0.0.1:4194`. A rota `/infotec` retorna 404 propositalmente, comprovando o carregamento sem Next. A suíte cobre segredos, revisão concorrente, resultado incerto sem replay, salvar/aplicar, ações de processo, logs como texto, sessão expirada e viewport móvel. Esses testes não representam homologação autenticada ou validação em produção.

Para executar a mesma suíte com HTTP, sessão HttpOnly/CSRF e máquina de operações reais do admin-service, configure `ADMIN_SERVICE_SOURCE` para o checkout desse serviço e rode `pnpm test:admin:integration`. Essa variante importa `createApp` e `OperationManager` reais, usa MemoryStore e substitui somente os serviços donos/PM2. O adaptador de histórico em memória segue o formato do MysqlStore, inclusive os alvos estruturados. As fontes por recurso são descobertas por `snapshot.resources`; fontes de IA por tenant abrem diretamente sem consultar alvos.
