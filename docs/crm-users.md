# Usuários e cadastros CRM

`/{instance}/user-catalogs` reúne grupos e membros, expedientes com três intervalos, motivos de pausa e o cadastro legado de vendas. A navegação e todas as telas exigem ADMIN; os serviços verificam autorização e tenant.

Os cadastros usam códigos explícitos positivos, preservam identificações históricas e enviam todos os valores originais em operações por snapshot. Horários históricos, NULL e zero não são normalizados. Desativar uma faixa não apaga sua entrada/saída. Vendas mantém ID textual e PAGAMENTO decimal exato sem presumir moeda, percentual ou remuneração. Identidades duplicadas ficam visíveis com edição/exclusão bloqueadas.

Os membros são mantidos por identidade do vínculo, com seleção de usuários reais e confirmação antes de remover a associação. O cadastro do usuário é preservado. O expediente é associado pela operação própria com o valor original de HORARIO; a remoção exige confirmação e envia NULL explícito.

O modal de usuários usa `/api/crm/user-registration`, os campos e as opções do schema do tenant e uma versão opaca. Não lê senha; edição com senha vazia omite esse campo. Avatar e seleção de setores WhatsApp são preservados. Após criar, o registro retornado identifica o usuário e permite associar expediente. SIP e metas existentes mantêm seus fluxos próprios.

Erros de concorrência preservam rascunhos e exigem releitura. UNKNOWN não gera repetição automática; nova tentativa depende de conferir o estado atual. As requisições capturam token e instância na chamada e desativam injeção e refresh globais de autenticação. Troca de tenant remonta o estado; renovação de sessão durante escrita bloqueia confirmação e exige conferência. O cliente envia `x-crm-instance`; o serviço recusa divergência com a sessão antes do SQL.

Verificação: `npm run test:crm-users:e2e` usa fixtures locais, `npx vitest run src/lib/crm-user-catalogs-form.test.ts src/lib/sdk-local/crm-users-api.test.ts src/lib/sdk-local/crm-request-context.test.ts src/lib/ui-system/navigation.test.ts`, `npx tsc --noEmit` e `npx next build --webpack`. Esses testes não substituem validação autenticada de homologação.
