# Campanhas CRM

O menu administrativo Campanhas CRM reúne `/crm-campaigns`, `/crm-results`, `/crm-exceptions` e `/crm-ordering`. A configuração do público fica em `/crm-campaigns/:id/configure`. As telas usam o CRM do tenant; os recursos de disparo WhatsApp e metas existentes permanecem independentes.

Campanhas e resultados usam `/api/marketing/crm` e o schema de campos retornado pelo backend. O cadastro informa código explícito, mantém snapshots completos e diferencia null, zero e campos omitidos. SQL_CAMPANHA/GERADO_LISTA são somente leitura no cadastro. Ações de resultado e opções de unidade, grupo, segmento, origem, usuário, cidade e estado usam catálogos reais e paginados.

Configurar público aceita situação, unidade, segmentos, grupos, origens, usuários, cidade e estado. Exige prévia dos clientes antes de salvar critérios estruturados; alterações invalidam a prévia anterior. A geração usa o customers-service: escolhe usuário, data/hora civil no CRM, consulta elegíveis e vínculos existentes, e envia expectedCount=batchCount com snapshot de configuração e contagens. Públicos maiores são divididos em lotes de até 2.000. Após um lote confirmado com hasMore, a tela consulta a prévia seguinte, mas cada gravação exige um novo clique. UNKNOWN nunca dispara repetição automática. GERADO_LISTA só é tratado como concluído quando o backend retorna SIM. Agendas existentes são preservadas pelo contrato do backend.

Ordenar oferece os oito critérios conhecidos, com botões subir/descer/remover, e preserva o parâmetro legado de cidade até uma alteração explícita. Prioridades de campanhas e ordens de cidades, estados e segmentos são mantidas nos seus cadastros. Exceções têm abas por tipo; código ERP continua textual. Duplicidades históricas aparecem e bloqueiam alteração/exclusão ambígua.

Os SDKs administrativos usam clientes Axios próprios, sem interceptores de refresh. Cada escrita fixa JWT/tenant capturados e inclui skipAuthInjection, skipAuthRefresh e x-crm-instance. Um novo token cria novo cliente; requisições em voo conservam a identidade original. O servidor rejeita divergência de tenant antes do SQL. As telas descartam respostas tardias de outro tenant/registro e bloqueiam gravações após 409/UNKNOWN até leitura explícita confirmada. O bloqueio sobrevive ao fechamento do editor e troca de abas; rascunhos de configuração/ordenação são preservados durante refresh de token. Reload explícito pode descartar o rascunho após confirmação.

`src/lib/sdk-local/crm-marketing.client.ts`, `crm-campaign-generation.client.ts` e `types/crm-marketing.types.ts` são cópias do SDK central. Alterações nesses contratos precisam manter ambos idênticos.

Validação local:

- `npx vitest run src/lib/crm-marketing-form.test.ts src/lib/sdk-local/crm-marketing-api.test.ts`: 17 testes de validação/snapshot/contexto e geração sem replay de autenticação.
- `npm run test:crm-marketing:e2e`: 15 fluxos com componentes reais, tema MUI e doubles de backend/autenticação, incluindo conflitos, confirmação perdida, troca de tenant/token, exceções, preview/configuração, geração por lotes, ordenação e controles visíveis no celular/paisagem. Não representa teste HTTP com sessão real em homolog.
- `npx next build --webpack`: validação integrada executada com as outras entregas CRM. O harness usa porta 4197 e diretório test-results-crm-marketing independente para não colidir com outras suítes.

O backend tem testes HTTP e MySQL próprios. A validação autenticada de ponta a ponta em homolog e o registro do deploy são coordenados no plano INF-20261019-001.
