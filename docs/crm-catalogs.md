# Cadastros auxiliares CRM

O hub `/{instance}/crm-catalogs` reúne Segmentos e os sete catálogos administrados pelo customers-service: grupos de clientes, cargos de contatos, origens, marcas, mídias CRM, cidades CRM e estados CRM. A administração é restrita a ADMIN; a API aplica a mesma autorização.

O formulário mostra os campos reais, usa unidades e estados consultados no tenant e preserva referências históricas desconhecidas quando não são alteradas. Códigos numéricos são informados no cadastro, exceto em Marcas, cujo código é gerado pelo banco. A sigla identifica o Estado. A identificação de um registro existente é permanente.

Edição e exclusão enviam o snapshot completo original. Conflito preserva o rascunho e exige recarregar o registro. Uma resposta com `outcome: UNKNOWN`, inclusive HTTP 409, bloqueia reenvio. O usuário deve conferir a lista antes de iniciar outra alteração. Nenhuma escrita é repetida automaticamente. Renovação da sessão durante uma escrita conserva esse bloqueio; mudança de tenant descarta o estado visual anterior e ignora respostas atrasadas.

Exclusão utiliza o endpoint protegido pelo serviço; a UI não remove vínculos e mostra a recusa por dependências. Cidades com referências textuais podem manter sua identidade e editar seus campos de ordem; renomear segue a proteção da API. Campos de ordenação e fuso mantêm os valores do CRM e não são apresentados como configuração de calendário ou ativação de uma campanha.

SDK: `listCrmCatalog`, `getCrmCatalog`, `createCrmCatalog`, `updateCrmCatalog`, `deleteCrmCatalog`, `getCrmCatalogUnits`, `getCrmCatalogStates`. Contratos publicados em `types/crm-catalogs.types.ts` são mantidos iguais na cópia sdk-local e na fonte inpulse-libs. Esta alteração não publica pacote npm.

Verificação local: `npx vitest run src/lib/crm-catalogs-form.test.ts src/lib/sdk-local/crm-catalogs-api.test.ts src/lib/ui-system/navigation.test.ts`, `npm run test:crm-catalogs:e2e`, `npx tsc --noEmit`, `npx next build --webpack`. O navegador isolado usa fixtures sem API remota; não equivale a uma sessão autenticada em homologação.
