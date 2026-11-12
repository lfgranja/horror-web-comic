# Brownfield Zone Map — horror-web-comic (MDMV, rascunho)

Status: **definido (rascunho operacional)** — 2026-11-11
Referência: `mdmv-dark-factory` `docs/research/11-greenfield-brownfield-migracao.md` (Addy Osmani, brownfield agentic engineering), `docs/adr/001-adocao-mdmv-dark-factory.md`, `AGENTS.md`.
Contexto: player cinematográfico estático (vanilla ES modules, Node/Playwright/CI), produto sensível a acessibilidade, performance, sync e contratos WebKit/layout.

## Princípio

Antes de agentes autônomos tocarem o código, uma pessoa mantém o mapa de zonas. Zonas só mudam quando ganhas (evidência de testes/estabilidade). A zona define os verbos permitidos. Nunca deixar shims; migrar em unidades completas. "Write down what the code can't say" (memos em `docs/`/specs). Testes de caracterização travam o comportamento atual antes de refatorar (**nunca** a mesma sessão escreve os testes e os faz passar sem separação/revisão adequada).

## Zonas

### 🟢 Green — loop apertado (baixo risco)

Artefatos textuais/governança e dados de baixo blast radius, com verificação determinística fácil.

- `docs/adr/`, `docs/governance/`, `docs/telemetry/` (governança/evidência/relatórios redigidos)
- `.specify/validations/`, `.specify/releases/`, `.specify/assessments/`, `.specify/bugs/*` (artefatos SDD/bug, append-only onde exigido)
- `specs/**` (documentação de spec/plan/tasks/checklists/notas) — **respeitar** `converge` append-only e honestidade R4/R7. **Exceção explícita:** `specs/024-pilha-escalonamentos-nivel5/registry/escalations.yaml` é **yellow** (ver abaixo), nunca green.
- `CODEOWNERS`, `AGENTS.md` (somente ajustes factuais/governança; manter coerência com constituição)
- `tests/fixtures/**` e dados de teste **quando cobertos** por `npm run validate`/`test:unit`/suites relevantes

**Regras:** agente pode editar com loop apertado; rodar checks relevantes (`python3 scripts/ci/sdd-gate.py`, `npm run -s validate`, `npm run -s test:unit` conforme escopo). Sem segredos. Sem alterar contratos de runtime.

### 🟡 Yellow — caracterização/testes antes

Qualidade mista, superfície com impacto indireto em comportamento/entrega; exige leitura de padrões existentes e testes/gates antes/depois.

- `src/styles/*.css` (tokens/base/player) — sensível a layout/reflow/CLS/temas/a11y
- `scripts/*.mjs`, `scripts/**/*.mjs` auxiliares de build/validação — **exceto** mudanças que enfraqueçam gates
- `src/scripts/capabilities.js`, `src/scripts/a11y.js`, `src/scripts/light-variants.js`, `src/scripts/safe-reference.js`, `src/scripts/sensory-taxonomy.js` (módulos com testes unitários/cobertura parcial)
- `src/scripts/story-loader.js` (validação/carregamento; segurança de refs)
- `src/data/**` manifests/stories/catalog (com `npm run validate` e impacto em runtime/build)
- `.github/workflows/{sdd-gate,policy-drift,telemetry-ingest}.yml`, `scripts/ci/*.py`, `scripts/telemetry/*.py` (governança) — mudanças pequenas, verificadas por execução local dos scripts
- `specs/024-pilha-escalonamentos-nivel5/registry/escalations.yaml` (append/atualização rastreável)

**Regras:** caracterização/gates antes de mudar; rodar checks aplicáveis (`validate`, `test:unit`, scripts Python, e se pertinente build/E2E). Revisão humana recomendada; cuidado com budgets/contratos.

### 🔴 Red — humano no passo a passo (ou não fazer)

Estado compartilhado, boot, playback/áudio/sync, acessibilidade crítica, segurança/validação estrutural e pipeline/gates de produto/CI. Alto risco de regressão (WebKit/layout/perf/a11y/budgets).

- `src/scripts/player.js`, `src/scripts/audio.js`, `src/scripts/storage.js`, `src/scripts/main.js` (núcleo runtime/boot/sync/progress/gestos)
- `index.html`, `alojamento.html`, composição/contratos de UI críticos
- `scripts/build.mjs`, `scripts/build-images.mjs`, `scripts/preflight.mjs`, `scripts/validate-manifest.mjs`, `scripts/serve-e2e.mjs`, `scripts/delivery-fidelity.mjs`, `scripts/svg-sanitize.mjs`, `scripts/ci-trailers.mjs` e gates de integridade/fidelidade/budget
- `.github/workflows/ci.yml` e jobs de produto/matriz/perf/lighthouse/WebKit
- `budget.json`, `lighthouserc.json`, `playwright.config.js`, contratos/schemas de manifesto, regras de segurança de refs/CSP-equivalentes
- Mudanças que afetem SC/FR de acessibilidade, performance (SC-018/CLS/LCP), comportamento WebKit, sync cross-tab, ou persistência/ordenação

**Regras:** humano no passo a passo; pair/review. Nunca alterar comportamento sensível sem evidência (testes/E2E/perf/CI relevante). Nunca enfraquecer gates ou burlar budgets/matriz. Nunca auto-merge.

## Zonas em YAML (consumo por agentes)

```yaml
zones:
  green:
    paths:
      - docs/adr/
      - docs/governance/
      - docs/telemetry/
      - .specify/validations/
      - .specify/releases/
      - .specify/assessments/
      - .specify/bugs/
      - specs/
      - CODEOWNERS
      - AGENTS.md
      - tests/fixtures/
    exceptions:
      # 024 registry is yellow; never treat it as green even though specs/ wins elsewhere.
      - specs/024-pilha-escalonamentos-nivel5/registry/escalations.yaml
    rule: "tight loop for textual/governance artifacts; run relevant deterministic checks; no runtime contract changes; no secrets"
  yellow:
    paths:
      - src/styles/
      - scripts/
      - src/scripts/capabilities.js
      - src/scripts/a11y.js
      - src/scripts/light-variants.js
      - src/scripts/safe-reference.js
      - src/scripts/sensory-taxonomy.js
      - src/scripts/story-loader.js
      - src/data/
      - .github/workflows/sdd-gate.yml
      - .github/workflows/policy-drift.yml
      - .github/workflows/telemetry-ingest.yml
      - scripts/ci/
      - scripts/telemetry/
      - specs/024-pilha-escalonamentos-nivel5/registry/escalations.yaml
    rule: "characterization/tests before change; run validate/test:unit and applicable scripts; human review recommended; do not weaken gates"
  red:
    paths:
      - src/scripts/player.js
      - src/scripts/audio.js
      - src/scripts/storage.js
      - src/scripts/main.js
      - index.html
      - alojamento.html
      - scripts/build.mjs
      - scripts/build-images.mjs
      - scripts/preflight.mjs
      - scripts/validate-manifest.mjs
      - scripts/serve-e2e.mjs
      - scripts/delivery-fidelity.mjs
      - scripts/svg-sanitize.mjs
      - scripts/ci-trailers.mjs
      - .github/workflows/ci.yml
      - budget.json
      - lighthouserc.json
      - playwright.config.js
    rule: "human step-by-step; evidence required (tests/E2E/perf/CI); never weaken gates/budgets/matrix; never auto-merge"
```

## Regras transversais

1. Pessoa desenha/mantém o mapa; zonas só mudam com evidência.
2. Zona define verbos; incerteza → tratar como zona superior.
3. Registrar o que o código não diz (specs/notas/ADR).
4. Testes de caracterização antes de refatorar comportamento existente.
5. Migrar em unidades completas (sem shims).
6. Paralelizar por último; merge humano sempre (022/025/042).

## Referências

- `mdmv-dark-factory/docs/research/11-greenfield-brownfield-migracao.md`
- `docs/adr/001-adocao-mdmv-dark-factory.md`
- `AGENTS.md`, `.github/workflows/ci.yml`, `.specify/memory/constitution.md`
