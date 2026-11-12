# ADR 001 — Adoção do processo mdmv-dark-factory (parcial, nível 4)

- **Status:** Aceito (decisão registrada)
- **Data:** 2026-11-11
- **Satélite:** `horror-web-comic` (`lfgranja/horror-web-comic`, GitHub, branch default `dev`)
- **Hub avaliado:** `mdmv-dark-factory` @ `2535843cf572c708319c53b1bbab7a7be2dd36f5` (commit avaliado em 2026-11-11; repositório Forgejo do hub, fora deste repo)
- **Relacionado:** `docs/governance/satellite-manifest.json`, `docs/governance/hub-policy-manifest.json`, `docs/governance/satellite-adoption-checklist.md`, `docs/governance/sdd-chain-baseline.json`, `.specify/memory/constitution.md` (v2.1.0)

## Decisão

Adotar **parcialmente** o processo do **mdmv-dark-factory** (hub de Spec-Driven Development/governança), no **nível 4 (“light factory”, luzes acesas)**, como padrão operacional de governança/evidência para este repositório. Adoção integral (nível 5 / dark) fica restrita, no futuro, a jobs estreitos de **baixo blast radius** com verificação **machine-checkable**, sempre com revisão/aprovação humana de merge.

A adoção **compõe** o processo existente: **não substitui** a constituição do produto `.specify/memory/constitution.md` **v2.1.0** (autoridade do produto) nem os gates determinísticos de produto/CI já maduros (`preflight → validate → test:unit → build:images → build → test:e2e → test:perf`, trailers, budgets, Lighthouse). Evidência acima de narrativa: nenhuma conformidade/validação/release é declarada sem evidência reproduzível citada; lacunas ficam explícitas (`[NV]`, bloqueado, pendente).

## O que adotamos agora (Fase 0–4, escopo desta adoção)

- **Fase 0 — Identidade/governança:** ADR, `docs/governance/satellite-manifest.json` (schema `026.1.0`), `docs/governance/hub-policy-manifest.json` **vendorizado e adaptado** (equivalentes locais/GitHub, sem paths Forgejo do hub), `docs/governance/satellite-adoption-checklist.md`.
- **Fase 1 — Cadeia SDD (R4/R7) + gate:** `.specify/validations/<slug>/validate.md` e `.specify/releases/<slug>/release.md` por spec com **honestidade de evidência**; `docs/governance/sdd-chain-baseline.json` para estado real (specs em progresso/bloqueadas) sem aprovação falsa; `scripts/ci/sdd-gate.py` (stdlib, sem rede) + workflow `.github/workflows/sdd-gate.yml`, **em paralelo** aos gates de produto existentes (cadeia atual intacta).
- **Fase 2 — Telemetria 035/039 (local):** `docs/governance/execution-record.schema.json` (base 035.1.0, adaptado), `docs/telemetry/execution-record.jsonl` (append-only), `scripts/telemetry/{validate,emit,wrap,telemetry_report,ingest}_telemetry.py` (stdlib, sem rede) + workflow `.github/workflows/telemetry-ingest.yml`. Publicação/ingestão no hub: **NV** (sem contrato/mecanismo ativo) — formato mantido compatível.
- **Fase 3 — Drift, escalonamentos, ownership (024/026):** `scripts/ci/check_policy_drift.py` + `.github/workflows/policy-drift.yml` (periódico/dispatch/PR) comparando manifestos vendorizado × satélite. **Escopo explícito:** o check é uma verificação de **coerência local dos artefatos vendorizados** (manifestos, arquivos obrigatórios, exceções documentadas). Ele **não descreve o estado do hub vivo** — não há acesso de rede; a SHA do hub nos manifestos é a referência fixa e o gate compara os dois arquivos entre si. 025 é registrada como **exceção explícita com razão** no satellite-manifest; 025 removida de `policies_affected`. O gate falha por ausência da exceção (`missing_policy:025`), não aceita “affected” como adoção. Escalonamentos validados pelo gate (`sdd-gate.py`): schema mínimo (id/status/owner/bloqueio/impacto) e refs locais existentes.
- **Política 025:** não adotada — sem auto-merge cego; merge humano obrigatório (`docs/governance/narrow-lights-out.md`).
- **Fase 4 — Narrow lights-out (documentado, opcional):** `docs/governance/brownfield-zones.md`, `docs/governance/narrow-lights-out.md` (green/yellow/red, classes elegíveis, gates machine-checkable, **PR + execution record + merge humano; sem auto-merge cego**).

Políticas adotadas localmente nesta rodada (conforme artefatos presentes): **022** (hub-first) como override **local-only/proposta-pendente** (host GitHub, não Forgejo); **023** (autonomia/escalonamento, governança/review humano); **024** (registry de escalonamentos); **026** (drift check); **031** (gate determinístico SDD/CI local); **035** (telemetria local, schema 035.1.0). **025** (auto commit/merge condicionado) **não adotado**.

## O que fica de fora / não adotado agora (e por quê)

- **022 como Forgejo-native:** este repo vive no **GitHub** (Actions, branch protection/rulesets). Runner self-hosted Forgejo, auto-merge condicionado Forgejo e integrações específicas do hub são **referência**; equivalentes GitHub verificáveis são tratados como adaptação **local-only/proposta-pendente** quando divergirem do hub.
- **Runtime sandbox / harness de execução de agentes (G1/G2 do hub):** hub em evolução; este repo já possui CI/gates de produto maduros. Sem ganho imediato proporcional ao custo.
- **Ingestão/publicação real de telemetria no hub (G5):** **NV** no hub; adotamos padrão JSONL 035.1.0 local compatível.
- **Auto-merge cego (022/025/042):** proibido. Merge humano obrigatório; qualquer auto-merge futuro condicionado exigiria CI+review+proteções rigorosamente verificados e autorização explícita.
- **Nível 5 / automação autônoma ampla:** fora do alvo atual.

## Política 022 (hub-first)

Qualquer regra tratada como **padrão MDMV** deve ser proposta/avaliada no hub. Aplicação local antes de aprovação no hub deve ser marcada como `local-only` ou `proposta-pendente` com racional (em especial adaptações de CI, branch protection e required checks no GitHub).

## Cadeia SDD e honestidade de evidência (R4/R7)

- `validate.md` aprovado/suportado por evidência **antes** de `release.md` (R4→R7). `converge` append-only.
- Estado real respeitado: specs em progresso/bloqueadas ficam **parciais/condicionadas/bloqueadas** com baseline explícita (`docs/governance/sdd-chain-baseline.json`), nunca promovidas a “aprovado integral” sem evidência.
  - `001-cinematic-player`: tarefas/evidências manuais/dispositivo/matriz abertas — validação **parcial/condicionada**.
  - `002-theme-switcher`, `004-wcag-aaa-audit-pipeline`: tarefas concluídas — validação/release **retroativos** com evidência citada e limites `[NV]` declarados.
  - `003-artcraft-local-authoring`: forte base (`attestation.md`, 68/68, gates de autoria/entrega) — candidato a validação/release retroativa com evidência citada.
  - `005-korean-horror-mechanics`: **não aprovar R4/release** enquanto T047/CI verde não comprovados. Runs: `#42825569449` (merge #180) falho (webkit-layout-gate end-overlay 320x568); `#43020030961` (merge #181) com a matriz E2E falhando em 26 testes (causa raiz: loop cross-tab de escrita sensorial/tema — corrigida em `fix/spec005-cross-tab-sync-loop`, PR #182). Baseline mantém 005 bloqueado até run verde.
- Evidência local verificada nesta adoção (2026-11-11, `dev@222a775` + worktree com alterações pré-existentes não relacionadas): `npm run validate` **PASS**; `npm run test:unit` **234/234 PASS**. Após os fixes do ciclo (gate SDD, telemetria, storage), **246/246** em 2026-11-11.

## Zoneamento brownfield (rascunho, Fase 4)

- **Green (baixo risco):** docs/prosa, notas de evidência, artefatos SDD textuais (`.specify/validations|releases`, `docs/governance`, ADRs/checklists), fixtures/dados de teste quando cobertos por gates.
- **Yellow (caracterização/testes antes):** `src/styles/*`, `scripts/*` auxiliares, `src/scripts/{capabilities,a11y,light-variants,safe-reference,story-loader}.js`, manifests/sidecars, workflows/gates de governança novos (com verificação).
- **Red (humano passo a passo):** `src/scripts/{player,audio,storage,main}.js`, boot/composição, contratos a11y/perf/WebKit, pipeline/gates de CI/build/fidelidade/segurança/validação, mudanças com impacto em orçamento/matriz/comportamento sensível.

## Consequências

- **Positivas:** governança de satélite rastreável, cadeia R4/R7 e telemetria locais, detecção de drift e escalonamentos explícitos, alinhamento com hub com baixo risco e sem duplicar CI de produto.
- **Custos:** manutenção de manifestos/checklist/baseline/artefatos por feature; workflows adicionais; disciplina de evidência.
- **Riscos:** baseline mal mantida pode mascarar dívida (mitigado por explicitação por spec e revisão); R4/R7 retroativos dependem de honestidade documental; 005/001 permanecem condicionados a evidência futura.

## Alternativas consideradas

- **Adoção integral (nível 5) imediata:** rejeitada — risco alto para núcleo de playback/a11y/perf e sem evidência operacional proporcional neste contexto.
- **Não adotar:** rejeitada — governança/evidência por feature e rastreabilidade trazem ganho claro com custo contido, compondo o SDD já existente.

## Referências

- Hub: `AGENTS.md`, `docs/research/07-roadmap-adocao.md`, `docs/research/11-greenfield-brownfield-migracao.md`, `docs/research/12-adocao-integral-parcial.md`, `docs/governance/GUARDRAILS-HUB-ONLY.md`, `docs/governance/SATELLITE-ADOPTION-CHECKLIST.md`, `docs/governance/satellite-manifest.template.json`, `docs/governance/hub-policy-manifest.json`.
- Satélite modelo (referência, fora deste repo): `stardew-raizes-vivas/docs/adr/002-adocao-mdmv-dark-factory.md` e `docs/governance/*`.
- Local: `.specify/memory/constitution.md` v2.1.0, `AGENTS.md`, `.github/workflows/ci.yml`, `specs/001-005/*`.
