---
id: INF-20261117-002
title: Cópia versionada do plano de relatórios
service: cross-service
type: refactor
status: in-progress
owner: codex
created_at: 2026-11-17
updated_at: 2026-11-18
depends_on: []
related_paths:
  - inpulse-frontend/src/app/(private)/[instance]/reports
source_docs:
  - planejamento/cross-service/INF-20261117-002-refatoracao-relatorios/plan.md
---

# Plano de refatoração dos relatórios

O serviço dono principal da interface é `inpulse-frontend`; impactos condicionais nos serviços de dados estão descritos no plano.

- [Plano e critérios de aceite](plan.md)
- [Inventário e evidências de código](inventory.md)
- [Tarefas e dependências](tasks.md)
- [Primeira onda implementada e validações](implementation-20261117.md)
- [Publicação da padronização em homologação](release-20261118.md)

A fonte central para execução e histórico é `C:/Workspace/infotec/planejamento/cross-service/INF-20261117-002-refatoracao-relatorios/`, incluindo `journal.md` e `handoff.md`. Atualizações futuras devem partir da pasta central e sincronizar este snapshot quando necessário, evitando dois planos independentes.

A central e as telas de relatórios do CRM foram padronizadas e publicadas em homologação. A conferência comparativa dos números segue no aceite operacional.
