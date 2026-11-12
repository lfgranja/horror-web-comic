# Release — 003-artcraft-local-authoring

- **Slug:** 003-artcraft-local-authoring
- **Spec:** `specs/003-artcraft-local-authoring/spec.md`
- **Gate:** R7 (SemVer, changelog com IDs FR/T/bug, rollback, comunicação)
- **Tipo:** retroativo (governança SDD; registro de entrega já integrada ao histórico)
- **Data:** 2026-11-11
- **Status:** **RELEASED (retroativo)**

## Validação (R4)

- Aprovada: `.specify/validations/003-artcraft-local-authoring/validate.md` (retroativa), sustentada por `specs/003-artcraft-local-authoring/attestation.md` (Approved/Closed), tarefas 68/68 e evidência de regressão atual (`npm run validate`, `npm run test:unit` 234/234 em 2026-11-11; 246/246 em 2026-11-12, após fixes do gate/telemetria/storage).

## Escopo / versão (SemVer)

- **Classificação:** entrega de capacidade/pipeline de autoria local e gates associados (feature/infra de conteúdo) integrada à linha de produto; escopo conforme spec 003. Registro retroativo de governança (sem tag de publicação criada por esta adoção). Versionamento do produto segue o repositório (`package.json` 0.1.0) e histórico de merges em `dev`.

## Changelog (síntese rastreável)

- **FR-001..FR-014 / SC-001..SC-007b:** adoção local de ferramentas ArtCraft para autoria de masters em `media-src/`, pipeline `build:images`→`assets/` (AVIF/WebP/JPEG + srcset/light), sanitizer SVG fail-closed, sidecars/proveniência SHA-256, gate de fidelidade Tier B, atomic writes, trailers de autoria/revisão, validação de manifesto/refs/budgets — sem alterar runtime/player/schema/contratos fora do escopo (conforme spec/plan/attestation).
- **Tasks:** T001–T054 concluídas (incl. convergence T046–T054). Evidência detalhada em `specs/003-artcraft-local-authoring/attestation.md`.

## Rollback

- Reverter commits/PRs que introduziram a feature 003 no branch de integração (histórico git) e regenerar artefatos de build conforme pipeline; masters/sidecars em `media-src/` versionados permitem restauração determinística via rebuild. Budgets/gates de `npm run build`/`validate` permanecem como proteção.

## Comunicação

- **Mantenedores/contribuidores:** fluxo de autoria local documentado em `docs/`/`specs/003-artcraft-local-authoring/*` e attestation; proveniência/sidecars obrigatórios conforme política da feature.
- **Usuários finais:** sem mudança de contrato de runtime; impacto é de qualidade/proveniência de assets entregues.

## Limitações

- Registro retroativo: publicação/tag externa não criada nesta adoção (NV). Ressalvas subjetivas/ambiente registradas na attestation permanecem válidas.
