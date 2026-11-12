# Odim: build com URLs públicas

Base: `a6131fd`, que inclui o timeout de 60 segundos e o ajuste do modal. O build ativo observado em 12/11 é `R58l-5voTRZiPXebLKyo8`. Confirmar novamente antes de qualquer instalação.

O comando `node scripts/build-odim-production.mjs` gera um build `/nova` com os endereços públicos das APIs e do socket incorporados e recusa assets com fallback `localhost:8000`–`8008` ou URL de serviço não resolvida. Ele exige dependências instaladas. O teste local Windows passou, mas esse build não é um artefato Linux validado para implantação.

Para preparar a implantação, ainda falta gerar em ambiente Linux compatível, com Node 22.14.0 e dependências do lockfile, um build limpo desta revisão; executar o comando acima; validar login simulado no navegador com interceptação da requisição e preservar o ID e hash do artefato. Depois, conferir rotas e configuração com a instalação atual. Não usar o `.next` de teste Windows.

O instalador `scripts/install-odim-production.py` espera o código e `.next` Linux revisados em `/home/inpulse/odim-modern-20261110/odim-build-api-urls-20261112/source`. A inspeção `python3 scripts/install-odim-production.py --inspect` deve ser executada no servidor a partir da cópia revisada e retorna `build` e `treeSha256` do candidato. Depois de inspecionar esses valores e verificar o build ativo, o plano e aplicação são, respectivamente:

```sh
python3 scripts/install-odim-production.py --expected-build BUILD_ID_REVISADO --expected-tree-sha256 SHA256_REVISADO
python3 scripts/install-odim-production.py --expected-build BUILD_ID_REVISADO --expected-tree-sha256 SHA256_REVISADO --apply
```

O plano também cria/abre o arquivo de lock, e a aplicação troca `.next` e reinicia o processo: ambos são operações de escrita no servidor e exigem autorização segundo a skill de produção. Os placeholders somente podem ser preenchidos após gerar e revisar o artefato Linux. O instalador preserva assets estáticos e rejeita divergência de BUILD_ID, configurações e hash. Em erro de ativação, tenta restaurar o `.next` previamente ativo e reiniciar o mesmo processo. Esse rollback retorna ao estado anterior, inclusive ao defeito de URLs; não comprova que o login está funcionando. A implantação precisa de verificação pública do bundle e de um teste autenticado acompanhado pelo usuário.

O instalador foi adaptado do instalador anterior e analisado sintaticamente; ainda precisa de ensaio Linux isolado, incluindo falha e rollback, antes de ser considerado pronto para uso.
