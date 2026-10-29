# Contract: Interface de Execução e Protocolo da Suíte E2E de Acessibilidade

**Feature Directory**: `specs/004-wcag-aaa-audit-pipeline`  
**Date**: 2026-10-24  
**Status**: Contract Specification (Phase 1)

---

## 1. Identificação e Ponto de Entrada

- **Arquivo Canônico**: `tests/e2e/accessibility.spec.js`
- **Executor**: `@playwright/test` (versão fixada: `1.64.0`)
- **Motor Integrado**: `@axe-core/playwright` (versão fixada: `4.13.0` nas `devDependencies`)
- **Configuração de Execução**: `test.describe.configure({ retries: 0 })` declarada no topo da suíte para garantir execução determinística sem sobrecarga de CPU em runners de CI com 2 vCPUs.
- **Orçamento de Duração e Governança de Execução (C1, H1)**: O teto de duração de execução ($\le 10{,}0\text{s}$ por projeto Chromium) atua como um orçamento de execução (*execution budget*) verificado via timeout de teste do Playwright (`timeout: 30_000`) e métricas de benchmark anexadas ao relatório de auditoria (`AuditReportAttachment.metrics.durationMs`), em vez de asserções frágeis de relógio de parede (*wall-clock assertions* como `expect(duration).toBeLessThan(...)`) em `test.afterAll`. Isso previne falsos negativos decorrentes de oscilações ou contenções transientes de CPU no runner de CI. A flag `--workers=1` é um parâmetro opcional de perfilamento (*benchmark profiling*) para medições locais determinísticas, e não um pré-requisito mandatório em CI (o qual executa com a concorrência padrão do Playwright).
- **Servidor Web Local**: Gerenciado automaticamente pelo Playwright webServer (`http://127.0.0.1:8080` via `scripts/serve-e2e.mjs`) com suporte a RFC 7233 (HTTP Range).

---

## 2. Invocação por Linha de Comando (CLI API)

### 2.1 Execução Direta / Isolada
```bash
# Execução focada no projeto desktop de referência (concorrência padrão do executor)
npx playwright test tests/e2e/accessibility.spec.js --project=desktop-chromium

# Perfilamento de benchmark local com worker único (--workers=1 é opcional para diagnóstico local, não mandatório em CI)
npx playwright test tests/e2e/accessibility.spec.js --project=desktop-chromium --workers=1

# Execução no viewport móvel de referência (360x800)
npx playwright test tests/e2e/accessibility.spec.js --project=mobile-chromium

# Execução em ambos os projetos autorizados
npx playwright test tests/e2e/accessibility.spec.js --project=desktop-chromium --project=mobile-chromium

# Execução interativa para depuração local (--headed ou --debug)
npx playwright test tests/e2e/accessibility.spec.js --project=desktop-chromium --headed
npx playwright test tests/e2e/accessibility.spec.js --project=desktop-chromium --debug
```
*Nota de Depuração Local*: Em modos `--headed` e `--debug`, a suíte opera de acordo com a semântica padrão do Playwright: as asserções de acessibilidade permanecem estritas e os artefatos de evidência continuam sendo retidos em memória e salvos na pasta de resultados local (`test-results/`).

### 2.2 Execução no Portão de Integração Contínua (CI)
A esteira integra-se de forma transparente ao comando padrão de E2E:
```bash
# Executa todos os testes E2E (incluindo accessibility.spec.js)
npm run test:e2e

# Portão completo de CI (preflight -> validate -> test:unit -> build:images -> build -> test:e2e -> test:perf)
npm run ci
```

---

## 3. Matriz de Projetos e Restrições de Plataforma

| Projeto Playwright | Viewport | DPI / Mobile | Status do Teste | Racional |
| :--- | :--- | :---: | :---: | :--- |
| **`desktop-chromium`** | $1280 \times 720$ | $1\times$ (Desktop) | **Obrigatório / Gated** | Viewport canônico desktop (alinhado ao default $1280 \times 720$ em `playwright.config.js`); cálculo matemático exato de CSS e contraste 7:1. Orçamento $\le 10\text{s}$ (SC-004). |
| **`mobile-chromium`** | $360 \times 800$ | $2\times$ / Touch | **Obrigatório / Gated** | Viewport canônico mobile (Pixel 5 com override $360 \times 800$ em `playwright.config.js`); certifica áreas táteis computadas $\ge 44 \times 44\text{px}$ sob layout responsivo. |
| **`desktop-firefox`** | $1280 \times 720$ | $1\times$ | *Isento* (Clarification Q1) | Isento da suíte Axe para evitar cálculos redundantes de tokens CSS e economizar tempo de CI. Viewport default $1280 \times 720$ de `devices['Desktop Firefox']`. |
| **`desktop-webkit`** | $1280 \times 720$ | $1\times$ | *Isento* (Clarification Q1) | Isento de execução no Linux runner (WPE software rasterizer e dependência de ICU em hosts Fedora). Viewport default $1280 \times 720$ de `devices['Desktop Safari']`. |
| **`mobile-webkit`** | $360 \times 800$ | $3\times$ / Touch | *Isento* (Clarification Q1) | Isento pelo mesmo racional de WebKit em Linux. iPhone 14 com viewport override $360 \times 800$ em `playwright.config.js`. |

*Nota*: No arquivo `tests/e2e/accessibility.spec.js`, a restrição é implementada declarativamente no topo:
```javascript
test.skip(({ project }) => !['desktop-chromium', 'mobile-chromium'].includes(project.name),
  'A suíte de acessibilidade Axe-Core é executada exclusivamente nos projetos Chromium para evitar redundância de cálculo CSS.');
```

---

## 4. Contrato de Configuração do AxeBuilder

A fábrica do `AxeBuilder` exporta `createAxeBuilder` como função primária canônica (padronizada nas tarefas e no plano), disponibilizando também `makeAxe` como alias de retrocompatibilidade:

```javascript
/**
 * Cria e configura a instância do AxeBuilder com o conjunto normativo WCAG 2.2 AAA.
 * Exportada primariamente como createAxeBuilder (alinhada aos planos e tarefas).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@axe-core/playwright').default}
 */
export const createAxeBuilder = (page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'])
    .options({
      rules: {
        'color-contrast-enhanced': { enabled: true },
        'target-size': { enabled: true }
      }
    });

// Alias de retrocompatibilidade
export const makeAxe = createAxeBuilder;
```

### Regras de Configuração:
1. **Tags Normativas**: Obrigatório incluir `wcag2aaa` (que engloba `color-contrast-enhanced`, `identical-links-same-purpose`, `meta-refresh-no-exceptions`).
2. **Ativação Explícita de Regras via `.options()` (Finding C1)**: Utilizar `.options({ rules: { 'color-contrast-enhanced': { enabled: true }, 'target-size': { enabled: true } } })` em vez de `.withRules(...)`. O método `.withRules()` do `@axe-core/playwright` sobrescreve e descarta o conjunto de regras selecionadas via `.withTags(...)`. O uso de `.options()` assegura que todas as 73 regras associadas às tags WCAG permaneçam ativas, garantindo a habilitação explícita de `target-size` (SC 2.5.8 AA, 24px) e `color-contrast-enhanced` (SC 1.4.6 AAA, 7:1) sem supressão colateral.
3. **Escopo Documental**: **PROIBIDO** o uso de `.include('#player')` ou `.include('#app')`. O escopo é o documento raiz (`page`).
4. **Isenção de `exclude`**: Não são permitidas exclusões arbitrárias de nós (`.exclude()`) no shell da aplicação.

### 4.1 Utilitários Normativos de Contraste WCAG AAA (`axe-helper.js`)

Para suporte a testes unitários, testes de invariantes com `fast-check` (T008b) e validação matemática determinística de contraste sob o critério WCAG 2.2 SC 1.4.6 (Contrast (Enhanced) - Nível AAA), o módulo `tests/e2e/helpers/axe-helper.js` exporta as seguintes funções analíticas:

```javascript
/**
 * Calcula a luminância relativa de uma cor RGB sRGB conforme fórmula canônica do W3C WCAG 2.2.
 * Cada canal de cor c em [0, 255] é normalizado para [0, 1] e linearizado:
 *   c_lin = (c <= 0.04045) ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4)
 * L = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
 *
 * @param {{ r: number, g: number, b: number } | [number, number, number] | string} rgb
 * @returns {number} Luminância relativa L em [0.0, 1.0]
 */
export function relativeLuminance(rgb);

/**
 * Calcula a razão de contraste entre duas cores conforme WCAG 2.2:
 * ratio = (L1 + 0.05) / (L2 + 0.05), onde L1 é a maior luminância e L2 é a menor.
 * Retorna valor no intervalo [1.0, 21.0].
 *
 * @param {string | object} foreground - Cor de primeiro plano (hex, rgb(), rgba() ou {r, g, b})
 * @param {string | object} background - Cor de fundo (hex, rgb(), rgba() ou {r, g, b})
 * @returns {number} Razão de contraste calculada
 */
export function calculateContrastRatio(foreground, background);

/**
 * Avalia se o par de cores atende aos limites WCAG 2.2 Nível AAA (SC 1.4.6 Contrast Enhanced).
 * Piso normativo:
 * - Texto padrão: ratio >= 7.0:1
 * - Texto grande (>= 18pt / 24px ou >= 14pt / 18.66px negrito): ratio >= 4.5:1
 *
 * @param {string | object} foreground
 * @param {string | object} background
 * @param {boolean} [isLargeText=false]
 * @returns {boolean} True se a razão de contraste for conforme com WCAG 2.2 AAA
 */
export function meetsContrastEnhanced(foreground, background, isLargeText = false);
```

---

## 5. Contrato de Asserções e Critérios de Falha (Pass / Fail Oracles)

### 5.1 Critério de Violações Confirmadas (Fail-Fast)
```javascript
// Violações objetivas falham o teste imediatamente
expect(results.violations).toEqual([]);
```
Se `results.violations.length > 0`, o teste falha listando o ID da regra, o impacto, o seletor do elemento e a recomendação de remediação.

### 5.2 Critério de Diagnósticos Inconclusivos (Warn-Only)
```javascript
/**
 * Projeta e formata diagnósticos inconclusivos por nó individual afetado.
 *
 * @param {Array} incomplete - Array de resultados incompletos do Axe
 * @returns {Array<{ id: string, impact: string, help: string, target: string }>}
 */
export function formatIncompleteDiagnostics(incomplete) {
  return incomplete.flatMap(i =>
    i.nodes.map(n => ({
      id: i.id,
      impact: i.impact || 'unspecified',
      help: i.help || i.description,
      target: n.target.join(', ')
    }))
  );
}

if (results.incomplete.length > 0) {
  console.warn(`[A11Y-WARN] ${results.incomplete.length} diagnósticos inconclusivos requerem inspeção visual humana:`);
  const diagnostics = results.incomplete.flatMap(i =>
    i.nodes.map(n => ({
      id: i.id,
      impact: i.impact || 'unspecified',
      help: i.help || i.description,
      target: n.target.join(', ')
    }))
  );
  console.table(diagnostics);
}
```
Não falha a suíte, mantendo determinismo em fundos de imagem ou gradientes transparentes.

### 5.3 Critério de Alvo de Toque AAA (Programático com Predicado de Elegibilidade)
O laço programático de Nível 2 avalia todos os controles interativos elegíveis nos contêineres ativos (`nav.control-bar`, `#blocked-overlay:not([hidden])`, `.overlay:not([hidden])`, `.error-screen:not([hidden])`). No Estado 3, inclui explicitamente os botões ativos no diálogo modal `#blocked-overlay:not([hidden])` (como `#continue-silent`), assegurando que controles de desfecho de áudio cumpram o piso dimensional de $\ge 44 \times 44\text{px}$.
Para respeitar o princípio de **Anexação Antecipada (*Eager Milestone Attachment*)**, a função `evaluateTargetSizes` computa e retorna um objeto estruturado de avaliação geométrica sem disparar asserções (`expect`) diretamente, permitindo que os artefatos de evidência sejam persistidos antes de qualquer falha na suíte.

#### 5.3.1 Interface do Resultado (`TargetSizeEvaluation`)
```typescript
interface TargetSizeEvaluation {
  tested: boolean;
  status: 'pass' | 'fail';
  tier1Status: 'pass' | 'fail' | 'not-applicable';
  tier2Status: 'pass' | 'fail' | 'not-applicable';
  compliantCount: number;
  nonCompliantCount: number;
  /**
   * Menor alvo de toque computado.
   * Se o elemento interativo não possuir id HTML, utiliza o fallback determinístico:
   * el.id || el.getAttribute('aria-label') || el.tagName.toLowerCase() + '.' + el.className.split(' ')[0]
   */
  smallestTarget: { id: string; width: number; height: number } | null;
  controls: Array<{
    selector: string;
    id?: string;
    width: number;
    height: number;
    isCompliant: boolean;
    box: { x: number; y: number; width: number; height: number };
  }>;
  isCompliantAAA: boolean;
}
```

*Nota sobre Identificação de Alvos (`smallestTarget.id` - Finding L5)*: Em `TargetSizeEvaluation.smallestTarget.id`, se um elemento interativo não possuir um atributo HTML `id`, é utilizado um fallback determinístico para sua identificação unívoca no relatório (`el.id || el.getAttribute('aria-label') || el.tagName.toLowerCase() + '.' + el.className.split(' ')[0]`).

#### 5.3.2 Implementação do Avaliador (`evaluateTargetSizes`)
```javascript
// Constante de tolerância numérica para renderização subpixel (Finding A10)
export const EPSILON = 0.05;

// Seletor normativo de controles interativos
export const INTERACTIVE_TARGET_SELECTOR = [
  'button',
  'select',
  'input:not([type="hidden"])',
  'textarea',
  'a[href]',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="slider"]',
  '[role="combobox"]'
].join(', ');

/**
 * Avalia programaticamente as dimensões dos alvos de toque interativos
 * sem lançar asserções antecipadas (preservando o Eager Milestone Attachment).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [containerSelector='nav.control-bar, #blocked-overlay:not([hidden]), .overlay:not([hidden]), .error-screen:not([hidden])']
 * @returns {Promise<TargetSizeEvaluation>}
 */
export async function evaluateTargetSizes(page, containerSelector = 'nav.control-bar, #blocked-overlay:not([hidden]), .overlay:not([hidden]), .error-screen:not([hidden])') {
  // 1. Estabilização de animações e posicionamento neutro do ponteiro
  await page.evaluate(async () => {
    const animations = document.getAnimations().filter(a => a.effect?.getTiming?.().iterations !== Infinity);
    await Promise.race([
      Promise.all(animations.map(a => a.finished.catch(() => {}))),
      new Promise(resolve => setTimeout(resolve, 500))
    ]);
  });
  await page.mouse.move(0, 0);

  const viewport = page.viewportSize();

  // 2. Extrai geometria de todos os controles elegíveis em um único roundtrip CDP
  const candidatesData = await page.evaluate(
    ({ selector, containerSel }) => {
      const containers = containerSel ? Array.from(document.querySelectorAll(containerSel)) : [document.body];
      const elements = Array.from(new Set(containers.flatMap(c => Array.from(c.querySelectorAll(selector)))));

      return elements
        .filter((el) => {
          if (el.closest('[aria-hidden="true"], [hidden], [inert]') || el.inert) return false;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility !== 'visible' || parseFloat(style.opacity) === 0) return false;
          if (el.disabled || el.getAttribute('aria-disabled') === 'true' || style.pointerEvents === 'none') return false;
          return true;
        })
        .map((el) => {
          const rect = el.getBoundingClientRect();
          // Fallback determinístico caso o elemento careça de ID HTML (Finding L5, P8)
          const classStr = typeof el.className === 'string' ? el.className : (el.className?.baseVal || '');
          const id = el.id || el.getAttribute('aria-label') || (classStr ? el.tagName.toLowerCase() + '.' + classStr.split(' ')[0] : el.tagName.toLowerCase());
          const selector = el.id
            ? `#${el.id}`
            : (el.getAttribute('aria-label')
                ? `${el.tagName.toLowerCase()}[aria-label="${el.getAttribute('aria-label')}"]`
                : (classStr ? `${el.tagName.toLowerCase()}.${classStr.trim().split(/\s+/).join('.')}` : el.tagName.toLowerCase()));
          return {
            id,
            selector,
            box: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          };
        });
    },
    { selector: INTERACTIVE_TARGET_SELECTOR, containerSel: containerSelector }
  );

  let smallestTarget = null;
  let minArea = Infinity;
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let tier1Pass = true; // SC 2.5.8 AA >= 24x24px
  let tier2Pass = true; // SC 2.5.5 AAA >= 44x44px
  const controls = [];

  for (const { id, selector, box } of candidatesData) {
    if (!box) {
      nonCompliantCount++;
      tier1Pass = false;
      tier2Pass = false;
      controls.push({
        selector,
        id: id || undefined,
        width: 0,
        height: 0,
        isCompliant: false,
        box: { x: 0, y: 0, width: 0, height: 0 }
      });
      continue;
    }

    // Aplica tolerância de ponto flutuante EPSILON para subpixel rendering (Finding A10)
    const meetsTier1 = (box.width >= 24 - EPSILON) && (box.height >= 24 - EPSILON);
    const meetsTier2 = (box.width >= 44 - EPSILON) && (box.height >= 44 - EPSILON);
    const withinViewport = !viewport || (
      box.x >= -EPSILON &&
      box.y >= -EPSILON &&
      box.x + box.width <= viewport.width + 1 + EPSILON &&
      box.y + box.height <= viewport.height + 1 + EPSILON
    );

    const isCompliant = meetsTier2 && withinViewport;

    if (isCompliant) {
      compliantCount++;
    } else {
      nonCompliantCount++;
    }

    if (!meetsTier1) tier1Pass = false;
    if (!meetsTier2 || !withinViewport) tier2Pass = false;

    const area = box.width * box.height;
    if (area < minArea) {
      minArea = area;
      smallestTarget = {
        id,
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10
      };
    }

    controls.push({
      selector,
      id: id || undefined,
      width: Math.round(box.width * 10) / 10,
      height: Math.round(box.height * 10) / 10,
      isCompliant,
      box
    });
  }

  const tested = candidatesData.length > 0;
  const isCompliantAAA = tested ? (nonCompliantCount === 0 && tier2Pass) : true;
  const status = isCompliantAAA ? 'pass' : 'fail';
  const tier1Status = tested ? (tier1Pass ? 'pass' : 'fail') : 'not-applicable';
  const tier2Status = tested ? (tier2Pass ? 'pass' : 'fail') : 'not-applicable';

  return {
    tested,
    status,
    tier1Status,
    tier2Status,
    compliantCount,
    nonCompliantCount,
    smallestTarget,
    controls,
    isCompliantAAA
  };
}
```

#### 5.3.3 Protocolo de Execução e Asserção em Testes (Eager Milestone Attachment)
Nos testes, o fluxo obrigatório consiste em avaliar, anexar evidências antecipadamente e, somente então, asserir:

```javascript
// 1. Avalia as dimensões de alvos de toque no contêiner desejado (no Estado 3, inclui a barra de controles e botões ativos no modal #blocked-overlay)
const targetSizeEvaluation = await evaluateTargetSizes(page, 'nav.control-bar, #blocked-overlay:not([hidden])');

// 2. Anexa antecipadamente o artefato completo de evidência (Eager Milestone Attachment)
await attachAuditArtifacts(testInfo, results, theme, 'interactive-audio', targetSizeEvaluation, durationMs);

// 3. Executa a asserção após a anexação das evidências
expect(
  targetSizeEvaluation.isCompliantAAA,
  `Alvos interativos não conformes com WCAG 2.2 AAA (>= 44x44px): ${targetSizeEvaluation.nonCompliantCount} falha(s)`
).toBe(true);
```

### 5.4 Limiar de Orçamento de Duração e Governança de Execução (Findings C1 & H1)

O teto de duração de execução ($\le 10{,}0\text{s}$ por projeto Chromium) é estritamente um **orçamento de execução (*execution budget*)**, verificado através do timeout nativo de teste do Playwright (`timeout: 30_000`) e pelo registro de métricas de benchmark anexadas ao relatório de auditoria (`AuditReportAttachment.metrics.durationMs`).

- **Proibição de Asserções Wall-Clock Frágeis**: É expressamente proibido o uso de asserções de tempo de relógio no gancho `test.afterAll` (como `expect(duration).toBeLessThan(...)`), prevenindo falsos negativos e instabilidade decorrentes de flutuações e concorrência de CPU em runners de CI.
- **Concorrência e Workers**: No ambiente de CI, a suíte executa com a concorrência padrão de workers do Playwright. A execução com worker único (`--workers=1`) é uma flag opcional de perfilamento (*benchmark profiling*) para medições locais determinísticas, e não um pré-requisito mandatório em CI.

### 5.5 Governança do Gancho `test.afterAll` e Orçamentos de Artefatos (Finding P1)

O gancho `test.afterAll` na suíte E2E do Playwright NÃO executa compilação ou validação de esquemas via `Ajv2020`.
- **Isolamento da Validação de Esquema**: A validação estrutural contra os esquemas JSON Schema Draft 2020-12 (`contracts/audit-report.schema.json` e `contracts/failure-telemetry.schema.json`) é executada estritamente na suíte de testes unitários do Node (`tests/unit/*.test.js`), prevenindo sobrecarga de compilação JIT de esquemas durante o encerramento do Playwright.
- **Responsabilidade Estrita de `test.afterAll`**: No encerramento da suíte E2E, o gancho `test.afterAll` restringe-se a:
  1. Anexar e consolidar artefatos de auditoria acumulados (`testInfo.attach`).
  2. Asserir o cumprimento dos tetos orçamentários de tamanho de payload (*budget ceilings*):
     - Payloads JSON estruturados: $\le 50\text{ KB}$ (`Buffer.byteLength(jsonString) <= 50 * 1024`).
     - Sumário executivo Markdown: $\le 10\text{ KB}$ (`Buffer.byteLength(mdString) <= 10 * 1024`).

---

## 6. Contrato de Artefatos, Anexos e Armadilha de Diagnóstico (`testInfo.attach`)

Cada caso de teste executado DEVE produzir e registrar no relatório do Playwright através do padrão de **Anexação Antecipada (*Eager Attachment*)**, persistindo as evidências antes do lançamento das asserções:

1. **Anotação de Escopo (`testInfo.annotations`)**:
   - `type`: `"audit_scope"`
   - `description`: `"Automated Chromium DOM and ARIA inspection only; it is not a real screen-reader announcement test or a manual assistive-technology audit."`
2. **Payload Estruturado JSON Filtrado**:
   - `name`: `axe-audit-<theme>-<state>.json` (onde `<state>` assume: `resting`, `dynamic-traversal`, `interactive-audio` ou `end-state`).
   - `contentType`: `"application/json"`
   - `body`: Serialização JSON válida conforme `contracts/audit-report.schema.json`.
   - **Teto Orçamentário**: $\le 50\text{ KB}$ por anexo (nós brutos de `passes` e `inapplicable` são omitidos, preservando contagens escalares e detalhando nós apenas para `violations` e `incomplete`).
   - **Isolamento de Validação de Esquema via Ajv2020 (I2, Finding P1)**: O esquema adota a especificação JSON Schema Draft 2020-12 (`https://json-schema.org/draft/2020-12/schema`). A compilação e validação do esquema com `Ajv2020` é executada **estritamente em testes unitários do Node** (`tests/unit/*.test.js`), utilizando explicitamente `import Ajv2020 from 'ajv/dist/2020.js'` e `addFormats(ajv)`. É **proibida** a compilação do Ajv2020 no gancho `test.afterAll` do Playwright; no E2E, `test.afterAll` restringe-se a anexar os artefatos estruturados e asserir os tetos orçamentários ($\le 50\text{ KB}$ para JSON, $\le 10\text{ KB}$ para Markdown):
     ```javascript
     // Executado exclusivamente na suíte de testes unitários Node (ex.: tests/unit/audit-report-schema.test.js)
     import Ajv2020 from 'ajv/dist/2020.js';
     import addFormats from 'ajv-formats';

     const ajv = new Ajv2020({ allErrors: true });
     addFormats(ajv);
     const validate = ajv.compile(schema);
     ```
3. **Sumário Executivo Markdown**:
   - `name`: `audit-summary-<theme>-<state>.md`
   - `contentType`: `"text/markdown"`
   - `body`: Documento Markdown gerado conforme o template padronizado na Seção 6.2 (contendo metadados, tabela de regras Axe-Core, tabela de alvos táteis e lista de violações/avisos).
   - **Teto Orçamentário**: $\le 10\text{ KB}$ por anexo.
4. **Armadilha de Diagnóstico em Falha (`test.afterEach`)**:
   Em caso de falha intermediária antes ou durante asserções, o gancho invoca `captureFailureArtifacts(testInfo, page, state, theme)` que anexa automaticamente:
   - `<state>-failure-dom.html` (`text/html`): Snapshot integral do DOM no instante da falha (`await page.content()`).
   - `<state>-failure-screenshot.png` (`image/png`): Screenshot visual da página inteira (`await page.screenshot({ fullPage: true })`).
   - `<state>-failure-telemetry.json` (`application/json`): Telemetria estruturada do player e DOM conforme `contracts/failure-telemetry.schema.json`.
   *Proteção Defensiva contra Browser Crash*: Toda a coleta em `captureFailureArtifacts` DEVE ser protegida com um bloco defensivo `try...catch` contra quedas inesperadas do navegador ou desconexões do protocolo CDP (como `TargetClosedError` do Playwright). Em cenários de crash do browser, o helper registra um aviso defensivo (`console.warn`) e anexa telemetria básica de fallback, garantindo que o gancho `test.afterEach` não falhe secundariamente e não mascare a causa raiz original do teste.

### 6.1 Assinaturas Contratuais dos Helpers de Evidências

#### 6.1.1 Helper de Anexo de Auditoria (`attachAuditArtifacts`)
```javascript
export async function attachAuditArtifacts(
  testInfo,
  results,
  theme,
  state,
  targetSizeSummary = null,
  durationMs = 0
)
```
- `targetSizeSummary`: Objeto estruturado opcional em conformidade com o esquema `targetSizeSummary` de `contracts/audit-report.schema.json` ou instância de `TargetSizeEvaluation` retornada por `evaluateTargetSizes()`. Se omitido ou `null` (em estados onde alvos de toque não são auditados, e.g., traversal de quadros sem alteração de UI), o helper injeta um sumário neutro válido (`{ tested: false, status: 'pass', tier1Status: 'not-applicable', tier2Status: 'not-applicable', compliantCount: 0, nonCompliantCount: 0, smallestTarget: null, controls: [], isCompliantAAA: true }`), preservando a conformidade estrita com o esquema.
- `durationMs`: Duração escalar em milissegundos da execução do teste/tema, incorporada em `metrics.durationMs` (conforme `AuditReportAttachment.metrics.durationMs`).
- **Resolução do Viewport**: As dimensões de `metadata.viewport` no relatório são lidas diretamente de `page.viewportSize()` ou `testInfo.project.use?.viewport` (com fallback default `{ width: 1280, height: 720 }`), garantindo que os metadados reflitam fidedignamente o viewport de execução do Playwright.

#### 6.1.2 Helper de Armadilha de Diagnóstico em Falha (`captureFailureArtifacts`)
```javascript
/**
 * Captura e anexa artefatos de diagnóstico forense (DOM snapshot, screenshot e telemetria JSON)
 * quando um teste falha ou aborta inesperadamente. Protegido defensivamente com try...catch
 * contra falhas de processo do navegador (TargetClosedError).
 *
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {import('@playwright/test').Page} page
 * @param {'resting' | 'dynamic-traversal' | 'interactive-audio' | 'end-state'} state
 * @param {'cinema' | 'noir' | 'eldritch' | 'industrial' | 'shadow-props'} theme
 * @returns {Promise<void>}
 */
export async function captureFailureArtifacts(testInfo, page, state, theme) {
  if (testInfo.status === testInfo.expectedStatus) return;

  try {
    // 1. Snapshot integral do DOM
    const domHtml = await page.content().catch(() => '<!-- DOM indisponível: TargetClosedError -->');
    await testInfo.attach(`${state}-failure-dom.html`, {
      contentType: 'text/html',
      body: domHtml
    });

    // 2. Screenshot visual
    const screenshot = await page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      await testInfo.attach(`${state}-failure-screenshot.png`, {
        contentType: 'image/png',
        body: screenshot
      });
    }

    // 3. Telemetria estruturada do player e DOM conforme contracts/failure-telemetry.schema.json
    const telemetry = await page.evaluate(() => {
      const activeEl = document.activeElement;
      const selector = activeEl && activeEl !== document.body
        ? (activeEl.id ? `#${activeEl.id}` : (activeEl.getAttribute('aria-label') ? `${activeEl.tagName.toLowerCase()}[aria-label="${activeEl.getAttribute('aria-label')}"]` : activeEl.tagName.toLowerCase()))
        : 'none';
      const visibleOverlay = document.querySelector('.overlay:not([hidden]), #blocked-overlay:not([hidden]), #resume-overlay:not([hidden]), #end-overlay:not([hidden])');

      return {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        domState: {
          activeElementSelector: selector,
          modalVisible: Boolean(visibleOverlay),
          overlayId: visibleOverlay ? (visibleOverlay.id ? `#${visibleOverlay.id}` : null) : null
        },
        playerState: {
          currentFrameIndex: Math.max(0, parseInt(document.querySelector('#progress')?.getAttribute('aria-valuenow') || '1', 10) - 1),
          totalFrames: parseInt(document.querySelector('#progress')?.getAttribute('aria-valuemax') || '4', 10),
          isPlaying: document.querySelector('#player')?.getAttribute('data-status') === 'playing',
          isPaused: document.querySelector('#player')?.getAttribute('data-status') === 'paused',
          audioActive: document.querySelector('#audio-toggle')?.getAttribute('aria-pressed') === 'true',
          inert: document.querySelector('#player')?.hasAttribute('inert') || false
        }
      };
    }).catch(() => ({
      timestamp: new Date().toISOString(),
      url: page.url() || 'unknown',
      domState: {
        activeElementSelector: 'unknown',
        modalVisible: false,
        overlayId: null
      }
    }));

    const fullTelemetry = {
      ...telemetry,
      theme,
      state
    };

    await testInfo.attach(`${state}-failure-telemetry.json`, {
      contentType: 'application/json',
      body: JSON.stringify(fullTelemetry, null, 2)
    });
  } catch (error) {
    console.warn(`[DIAGNOSTIC-TRAP-WARN] Falha defensiva ao capturar artefatos de diagnóstico (${error.message}). Protegido contra TargetClosedError.`);
  }
}
```

#### 6.1.3 Protocolo de Compilação do Esquema com Ajv (Draft 2020-12) — Testes Unitários Node (Finding P1)
A compilação e validação do esquema com `Ajv2020` é executada **estritamente na suíte de testes unitários do Node** (`tests/unit/*.test.js`), e **NUNCA** dentro do gancho `test.afterAll` da suíte E2E do Playwright. Na suíte E2E, `test.afterAll` apenas anexa os artefatos e assere o cumprimento dos tetos orçamentários ($\le 50\text{ KB}$ para JSON e $\le 10\text{ KB}$ para Markdown).

Para uso nos testes unitários Node contra `contracts/audit-report.schema.json` e `contracts/failure-telemetry.schema.json`:
```javascript
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

/**
 * Cria um validador Ajv compatível com JSON Schema Draft 2020-12.
 * Utilizado estritamente na suíte de testes unitários Node.
 *
 * @param {object} schema - Esquema JSON Draft 2020-12
 * @returns {import('ajv').ValidateFunction} Função de validação compilada
 */
export function createSchemaValidator(schema) {
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  return ajv.compile(schema);
}
```

---

### 6.2 Template Padrão do Sumário Executivo Markdown (Finding U2)

Para garantir consistência estrutural, legibilidade nos relatórios e respeito ao teto orçamentário de $\le 10\text{ KB}$, o sumário Markdown anexado via `testInfo.attach('audit-summary-<theme>-<state>.md', ...)` DEVE ser gerado a partir do seguinte contrato de formatação:

```javascript
/**
 * Gera o documento Markdown padronizado para anexação no relatório Playwright.
 *
 * @param {object} report - Relatório completo ou objeto estruturado do anexo
 * @param {object} report.metadata - Metadados de execução (engine, viewport, browser, etc.)
 * @param {string} report.theme - Tema ativo avaliado
 * @param {string} report.state - Estado narrativo avaliado
 * @param {object} report.metrics - Contadores escalares de regras e duração
 * @param {Array} report.violations - Lista de violações confirmadas
 * @param {Array} report.incomplete - Lista de diagnósticos inconclusivos
 * @param {TargetSizeEvaluation} report.targetSizeSummary - Sumário geométrico de alvos de toque
 * @returns {string} Markdown formatado
 */
export function formatAuditSummaryMarkdown({
  metadata,
  theme,
  state,
  metrics,
  violations = [],
  incomplete = [],
  targetSizeSummary
}) {
  const targetSizeRows = targetSizeSummary && targetSizeSummary.tested
    ? [
        `| **Alvos Conformes (>= 44px)** | ${targetSizeSummary.compliantCount} / ${targetSizeSummary.controls.length} | SC 2.5.5 AAA |`,
        `| **Alvos Não Conformes** | ${targetSizeSummary.nonCompliantCount} | Mandatório: 0 |`,
        `| **Menor Alvo Medido** | ${targetSizeSummary.smallestTarget ? `\`${targetSizeSummary.smallestTarget.id}\` (${targetSizeSummary.smallestTarget.width}x${targetSizeSummary.smallestTarget.height}px)` : 'N/A'} | Limite >= 44x44px |`,
        `| **Status Nível 1 (24px AA)** | \`${targetSizeSummary.tier1Status}\` | SC 2.5.8 AA |`,
        `| **Status Nível 2 (44px AAA)** | \`${targetSizeSummary.tier2Status}\` | SC 2.5.5 AAA |`
      ].join('\n')
    : '| **Alvos de Toque** | *Não avaliado / Isento neste estado* | Isento |';

  const violationsSection = violations.length === 0
    ? '✅ **Zero violações confirmadas.** Suíte em conformidade com WCAG 2.2 AAA automatizada.'
    : violations.map(v => `- **[${(v.impact || 'unknown').toUpperCase()}] ${v.id}**: ${v.help} (${v.nodes.length} nós afetados)\n  - Guia: ${v.helpUrl}`).join('\n');

  const incompleteSection = incomplete.length === 0
    ? '✅ **Nenhum diagnóstico inconclusivo.**'
    : incomplete.map(i => `- **[${(i.impact || 'aviso').toUpperCase()}] ${i.id}**: ${i.description} (${i.nodes.length} nós requerem inspeção visual)`).join('\n');

  return `# Relatório de Auditoria WCAG 2.2 AAA

| Metadado | Valor |
| :--- | :--- |
| **Tema** | \`${theme}\` |
| **Estado** | \`${state}\` |
| **Motor** | \`${metadata.engine}@${metadata.engineVersion}\` |
| **Playwright** | \`${metadata.playwrightVersion}\` |
| **Navegador** | \`${metadata.browser}\` (${metadata.viewport.width}x${metadata.viewport.height}) |
| **Timestamp** | \`${metadata.timestamp}\` |
| **Duração** | \`${metrics.durationMs}ms\` |

## 1. Métricas de Conformidade Axe-Core

| Métrica | Contagem | Critério de Aceite |
| :--- | :---: | :--- |
| **Aprovadas (Passes)** | ${metrics.passesCount} | Regras conformes |
| **Violações (Violations)** | **${metrics.violationsCount}** | **Mandatório: 0 (Fail-Fast)** |
| **Inconclusivas (Incomplete)** | ${metrics.incompleteCount} | Warn-Only (Inspeção visual) |
| **Inaplicáveis (Inapplicable)** | ${metrics.inapplicableCount} | Fora de escopo |

## 2. Avaliação de Alvos de Toque (Target Size - SC 2.5.5 AAA & SC 2.5.8 AA)

| Métrica | Valor | Detalhes |
| :--- | :---: | :--- |
${targetSizeRows}

## 3. Detalhamento de Violações Confirmadas

${violationsSection}

## 4. Diagnósticos Inconclusivos (Requerem Inspeção Visual)

${incompleteSection}

---
*Classificação: ${metadata.classification} | Norma: ${metadata.targetStandard}*  
*Ressalva: ${metadata.disclaimer}*
`;
}
```