# Quickstart & Validation Guide: Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core para Playwright

**Feature Directory**: `specs/004-wcag-aaa-audit-pipeline`  
**Date**: 2026-10-24  
**Status**: Validation Guide (Phase 1)

---

## 1. Pré-requisitos do Ambiente

Certifique-se de que as ferramentas base do repositório estão instaladas conforme exigido pelo `scripts/preflight.mjs`:
- **Node.js**: $\ge 20.0.0$
- **npm**: $\ge 10.0.0$
- **Playwright Browsers**: Chromium instalado (`npx playwright install chromium`) para execução dos cenários locais 1 e 2. Para a execução completa do Cenário 4 (`npm run ci`), são necessários todos os navegadores da matriz (`npx playwright install --with-deps chromium firefox webkit`).
- **Sistema de Áudio**: Em ambientes headless de CI, null audio sink ativo (`pulseaudio`)

---

## 2. Instalação e Verificação da Dependência Pinada

Adicione a dependência exata nas `devDependencies` de `package.json` (sem prefixos `^` ou `~`):

```bash
# Instalação com pinagem exata
npm install --save-dev --save-exact @axe-core/playwright@4.13.0 fast-check@3.23.2

# Verificação do portão de preflight
npm run preflight
```
> O comando `npm run preflight` deve passar 16 de 16 verificações, confirmando que não há drift de lockfile nem ranges semver não permitidos.
> 
> *Nota sobre Hosts Fedora (P10)*: Conforme documentado em `AGENTS.md`, hosts Fedora não executam o WebKit localmente devido à divergência de versão da biblioteca ICU (o binário fixado do WebKit depende do ICU 74 enquanto versões recentes do Fedora utilizam ICU 77, impedindo que `npx playwright install-deps` resolva a dependência em distros não-Debian). Portanto, em ambientes de desenvolvimento locais sob Fedora, o preflight passa 15 de 16 verificações (falhando estritamente na verificação de `browser-launch` do WebKit, enquanto Chromium e Firefox inicializam normalmente). O portão completo de 16/16 verificações é formalmente aplicado e garantido no runner de CI (`ubuntu-latest`).

---

## 3. Cenários de Validação Executáveis

### Cenário 1: Auditoria em Modo Desktop (Orçamento de Execução $\le 10\text{s}$)
Valida os 5 temas visuais (`cinema`, `noir`, `eldritch`, `industrial`, `shadow-props`), a razão de contraste reforçada ($\ge 7:1$) e os diálogos de estado no viewport $1280 \times 720$:

```bash
npx playwright test tests/e2e/accessibility.spec.js --project=desktop-chromium --workers=1
```

**Resultado Esperado**:
```text
Running 4 tests using 1 worker
  ✓  [desktop-chromium] › tests/e2e/accessibility.spec.js:25:5 › Estado 1: Repouso e Matriz de Temas (resting) (1.8s)
  ✓  [desktop-chromium] › tests/e2e/accessibility.spec.js:65:5 › Estado 2: Sequência Narrativa Dinâmica (dynamic-traversal) (1.5s)
  ✓  [desktop-chromium] › tests/e2e/accessibility.spec.js:105:5 › Estado 3: Interação, Foco e Overlays (interactive-audio) (0.8s)
  ✓  [desktop-chromium] › tests/e2e/accessibility.spec.js:145:5 › Estado 4: Fim da Narrativa (end-state) (0.6s)

  4 passed (4.7s)
```
- Duração total $\le 10\text{ segundos}$ (satisfaz `SC-004`).
- Zero violações confirmadas de WCAG 2.2 AAA (`SC-001`, `SC-002`).

---

### Cenário 2: Auditoria em Viewport Móvel Tátil (Alvos de Toque $\ge 44 \times 44\text{px}$)
Valida a ergonomia responsiva em viewport móvel de $360 \times 800$, atestando que os botões da barra de controles e diálogos modais preservam as dimensões mínimas físicas:

```bash
npx playwright test tests/e2e/accessibility.spec.js --project=mobile-chromium
```

**Resultado Esperado**:
- Aprovação de 100% dos controles na regra `target-size` do Axe-Core (SC 2.5.8 AA, $\ge 24\text{px}$).
- Aprovação de 100% dos controles no laço determinístico do Playwright (`boundingBox().width >= 44 && height >= 44`, SC 2.5.5 AAA).
- Diálogo modal `#blocked-overlay` aprovado com `role="dialog"`, `aria-labelledby="blocked-title"`, `aria-modal="true"`, foco confinado em `#continue-silent` e blindagem com `#player.inert = true`.

---

### Cenário 3: Inspeção de Relatórios e Evidências Geradas
Inspecione visualmente o relatório do Playwright e os anexos estruturados gerados:

```bash
npx playwright show-report
```

> **Nota de Automação**: O comando `npx playwright show-report` inicia um servidor web local interativo voltado para inspeção manual humana. Rotinas automatizadas de verificação (como a tarefa `T030`) devem inspecionar a existência física e integridade dos artefatos em `playwright-report/` de forma não interativa.

1. Abra o relatório no navegador.
2. Navegue até o teste `Estado 1: Repouso e Matriz de Temas (resting)`.
3. Verifique na seção **Attachments**:
   - `axe-audit-noir-resting.json`: JSON estruturado contendo catálogo de regras e 0 violações ($\le 50\text{ KB}$).
   - `audit-summary-noir-resting.md`: Tabela Markdown com resumo de conformidade ($\le 10\text{ KB}$).
4. Verifique na seção **Annotations**:
   - Anotação `audit_scope` registrando o assertor algorítmico e a ressalva de escopo manual.

---

### Cenário 4: Execução do Portão Completo de CI
Certifique-se de que o comando oficial de CI do repositório passa integralmente em sequência:

```bash
npm run ci
```

A cadeia completa executará:
1. `npm run preflight` (16 verificações)
2. `npm run validate` (validação de manifesto)
3. `npm run test:unit` (testes de unidade Node)
4. `npm run build:images` (geração de variantes com sharp/ffmpeg)
5. `npm run build` (build de produção e orçamentos esbuild)
6. `npm run test:e2e` (matriz de testes E2E incluindo `accessibility.spec.js`)
7. `npm run test:perf` (orçamentos de desempenho e FPS)

Todos os passos devem terminar com código de saída 0 (`green`).
