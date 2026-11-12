# Narrow Lights-Out — horror-web-comic (Fase 4, documentado)

Status: **desenhado / não habilitado operacionalmente** — 2026-11-11
Referência: `mdmv-dark-factory` research 07/11/12, `docs/adr/001-adocao-mdmv-dark-factory.md`, `docs/governance/brownfield-zones.md`.

## Princípio (022/025/042, 023)

- **Sem auto-merge cego.** Toda entrega automatizada/assistida abre PR; **humano aprova o merge**.
- **Verificação machine-checkable** antes de qualquer PR (gates determinísticos aplicáveis).
- **Execution record** (035, `docs/telemetry/execution-record.jsonl`) anexado/registrado para execuções relevantes.
- **Blast radius baixo** e consequência de erro contida (rollback trivial).
- **Julgamento humano** reservado a intenção, arquitetura, UX/a11y sensível, performance percebida e mudanças que quebram contratos.

## Pré-condições gerais (para qualquer classe)

1. Escopo restrito a zona **green** (ou yellow pontual com caracterização e revisão explícita) — nunca **red**.
2. Worktree limpo no escopo do job; sem tocar alterações pré-existentes não relacionadas.
3. Gates mínimos verdes conforme classe (ex.: `python3 scripts/ci/sdd-gate.py`, `npm run -s validate`, `npm run -s test:unit`, `python3 scripts/ci/check_policy_drift.py docs/governance/hub-policy-manifest.json docs/governance/satellite-manifest.json --help` para uso, ou o comando sem argumentos com manifestos, `python3 scripts/telemetry/validate_telemetry.py docs/telemetry/execution-record.jsonl --strict-redaction` quando aplicável). Note que `check_policy_drift.py` sem argumentos e com argumentos incompletos retorna código 2 (erro de uso), e somente com ambos os manifestos executa a verificação; `validate_telemetry.py --strict-redaction` falha com código 2 (não apenas aviso) se houver padrão de segredo.
4. Diff pequeno, auditável, sem segredos, sem bypass de review/CI/budgets.
5. PR com evidência dos comandos/gates; merge humano.

## Classes candidatas (elegíveis quando machine-checkable)

| Classe | Zona | Gates mínimos (exemplos) | Blast radius | Observações |
|---|---:|---|---:|---|
| Artefatos SDD textuais/evidência (R4/R7/notes) com fatos verificáveis | green | `sdd-gate`, `validate_telemetry` (se tocar telemetria), revisão humana do conteúdo factual | baixo | Nunca declarar APPROVED/released sem evidência citada |
| Correções determinísticas de manifesto/sidecar/refs detectadas por validação | yellow→green se trivial | `npm run -s validate`, `test:unit`, `preflight`/build conforme impacto | baixo | Não alterar intenção narrativa/contratos sem decisão |
| Atualização de `docs/governance`/registry append-only (escalation, checklist factual) | green | `sdd-gate`, `check_policy_drift` (se manifests), parse JSON/YAML | baixo | Append-only onde exigido; honestidade |
| Bump de dependência **patch** (npm) com lockfile consistente | yellow | `npm ci`, `npm run -s validate`, `npm run -s test:unit` (e idealmente `npm run build`); CI completa recomendada antes de merge | baixo-médio | **Minor/major proibidos** como narrow; exigir revisão humana reforçada |
| Correções de lint/format **apenas se** padronização/gate determinístico existir | yellow | gate de lint/format + `test:unit`/`validate` | baixo | Hoje não há script dedicado de format/lint no `package.json`; não habilitar sem gate explícito |

## Classes NÃO habilitadas (red / alto risco)

- Núcleo de runtime: `player.js`, `audio.js`, `storage.js`, `main.js`, boot/composição, contratos de acessibilidade/perf/WebKit/sync.
- Pipeline/gates de produto: `.github/workflows/ci.yml`, `build*.mjs`, `preflight`, `validate-manifest`, `delivery-fidelity`, budgets/lighthouse/playwright config.
- Mudanças de UX/a11y sensíveis, timing, transições, matrizes de browser/dispositivo, ou qualquer ajuste para “fazer passar” sem corrigir causa.
- Bumps minor/major, refactors amplos, alterações de segurança/validação, bypass de review/CI.
- **Auto-merge cego** (proibido).

## Estado operacional

- **Habilitado agora:** nenhum job narrow autônomo. Este documento define o envelope permitido.
- **Habilitação futura (por classe):** requer evidência de gates estáveis, runbook, e confirmação de zona/risco; sempre via PR + execution record + merge humano.

## Referências

- `docs/adr/001-adocao-mdmv-dark-factory.md`
- `docs/governance/brownfield-zones.md`
- `docs/governance/execution-record.schema.json`, `docs/telemetry/execution-record.jsonl`
- `.github/workflows/{sdd-gate,policy-drift,telemetry-ingest}.yml`
