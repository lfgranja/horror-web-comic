# Checklist de Adoção — Satélite MDMV (hub-only)

Fonte: `mdmv-dark-factory/docs/governance/SATELLITE-ADOPTION-CHECKLIST.md` (repo hub, fora deste)
Hub avaliado: `2535843cf572c708319c53b1bbab7a7be2dd36f5` (2026-11-11)
Satélite: `horror-web-comic` (github.com/lfgranja, branch default `dev`)
Status geral: **parcial** — ver `docs/adr/001-adocao-mdmv-dark-factory.md`.

## Identidade
- [x] `target_repo` (`horror-web-comic`), host (`github`), owner (`lfgranja`), branch default (`dev`).
- [x] `hub_sha` do mdmv-dark-factory avaliado (ADR 001 + `docs/governance/satellite-manifest.json`, 2026-11-11).

## Políticas (022/026)
- [x] Manifesto `docs/governance/satellite-manifest.json` (schema 026.1.0, baseado no template do hub).
- [x] Manifesto hub vendorizado/adaptado `docs/governance/hub-policy-manifest.json` (equivalentes locais/GitHub; 028 omitida; paths Forgejo do hub não aplicáveis).
- [x] `adopted_policies` declaradas honestamente: 022, 023, 024, 026, 031, 035 adotadas localmente; 025 **não** adotada (sem auto-merge cego), registrada como **exceção explícita com razão** em `exceptions` do satellite-manifest — o check falha (`missing_policy:025`) sem ela. `policies_affected` não inclui políticas não adotadas.
- [x] Override 022 marcado **local-only/proposta-pendente** (host GitHub ≠ Forgejo; adaptações de CI/proteções tratadas localmente).

## Gates determinísticos (G2/G4)
- [x] CI de produto determinístico maduro existente (`.github/workflows/ci.yml`: `preflight→validate→test:unit→build:images→build→test:e2e→test:perf`, trailers, Lighthouse; jobs `webkit-layout-gate`, `macos-webkit-compositor`).
- [x] Gate SDD determinístico local (`scripts/ci/sdd-gate.py` + `.github/workflows/sdd-gate.yml`) com baseline explícita (`docs/governance/sdd-chain-baseline.json`) para estado real das specs — roda em paralelo, cadeia de produto intacta.
- [~] Required status checks / branch protection GitHub — estado real verificado em 2026-11-11: `dev` tem proteção com review policy (0 approvals exigidos) e **sem required checks**; `main` exige `head-must-be-dev` (check não produzido por nenhum workflow deste repo) + 1 aprovação; `require_code_owner_reviews=false`, `enforce_admins=false`; CODEOWNERS é consultivo. Nenhum required status check coberto pelo gate está configurado. Configurar é **decisão/adminização do repositório, pendente de autorização explícita** — não foi feito nesta adoção.
- [ ] Runner self-hosted seguro (Forgejo/hub) — **N/A** (host GitHub, runners GitHub-hosted). Reavaliar se mudar de host/runner.

## Cadeia SDD por feature (R4/R7) — Fase 1
- [x] `.specify/validations/<slug>/validate.md` presente por spec (001–005), com **vereditos honestos** e evidência/limites citados.
- [x] `.specify/releases/<slug>/release.md` presente por spec (001–005); releases aprovadas apenas quando suportadas por R4/evidência.
- [x] Baseline explícita `docs/governance/sdd-chain-baseline.json` aceita estado real: `001` parcial/condicionado, `005` bloqueado (T047/CI #42825569449 falho, webkit-layout-gate 320x568) — **não** promovidos a aprovado integral.
- [~] Retroativos `003/004` apoiados em evidência disponível (tasks/attestation/histórico + `npm run validate` e `npm run test:unit` (234/234 em 2026-11-11, 246/246 em 2026-11-12)); E2E/perf/lighthouse específicos por feature **[NV]** nesta rodada. **002 rebaixado** para CONDITIONAL/NOT APPROVED em 2026-11-12 (E2E vermelho nos runs #42825569449/#43020030961; correção em PR #182 aguardando run verde).

## Telemetria (G3/G5/035/039) — Fase 2
- [x] Schema local `docs/governance/execution-record.schema.json` (base 035.1.0, adaptado a `horror-web-comic`).
- [x] JSONL append-only `docs/telemetry/execution-record.jsonl` (seed inicial desta adoção).
- [x] Scripts `scripts/telemetry/{validate,emit,wrap,telemetry_report,ingest}_telemetry.py` (stdlib, sem rede, adaptados do padrão hub/stardew).
- [x] Workflow `.github/workflows/telemetry-ingest.yml` (validate `--strict-redaction` — falha com código 2 diante de padrão de segredo — + ingest + artifact).
- [x] Fixture seed marcada com `seed: true` em cada linha e `docs/telemetry/README.md` declarando que os eventos são backfill de adoção (não execução viva de produto).
- [ ] Publicação/ingestão no hub — **NV** (sem mecanismo/contrato ativo no hub); formato 035.1.0 mantido compatível.

## Drift e escalonamentos (G4/026, 024) — Fase 3
- [x] `scripts/ci/check_policy_drift.py` + `.github/workflows/policy-drift.yml` (cron semanal, dispatch, PR/push em mudanças nos manifestos e no próprio workflow) comparando hub manifest vendorizado × satellite manifest. Escopo: **coerência local dos artefatos vendorizados**, não detecção de drift contra o hub vivo (sem rede).
- [x] Registry de escalonamentos `specs/024-pilha-escalonamentos-nivel5/registry/escalations.yaml` semeado (CI WebKit 320x568/T047, evidências manuais 001, ambiente WebKit local).
- [x] `CODEOWNERS` para `specs/`, `.specify/`, `docs/governance/`, `docs/adr/`, `docs/telemetry/`, `scripts/`, `.github/workflows/` e módulos core (`src/scripts/{player,audio,storage,main,story-loader,a11y,light-variants,capabilities,safe-reference,sensory-taxonomy}.js`, `src/styles/`, configs: `budget.json`, `playwright.config.js`, `lighthouserc.json`).

## Narrow lights-out — Fase 4 (opcional, documentado)
- [x] `docs/governance/brownfield-zones.md` e `docs/governance/narrow-lights-out.md` (green/yellow/red, classes elegíveis/excluídas, gates machine-checkable).
- [~] Classes elegíveis **não habilitadas operacionalmente** nesta rodada (requer PR+evidence+merge humano por execução); sem auto-merge cego.

## Segurança (036/018)
- [x] Sem segredos em manifests/telemetria/logs (redação/heurísticas nos scripts; custos rotulados NV billing).
- [x] **Sem auto-merge cego** (022/025/042). Merge humano obrigatório.
- [~] Branch protections/rulesets/required checks no GitHub — **NV** (não alterados; dependem de admin/autorização).

## Notas
- `~` = parcialmente atendido / pendente de ação externa.
- Constituição do produto **v2.1.0** preservada como autoridade; MDMV compõe governança/evidência.
- Worktree possui alterações pré-existentes não relacionadas a esta adoção (não versionadas aqui por esta mudança de governança, salvo intenção explícita futura).
