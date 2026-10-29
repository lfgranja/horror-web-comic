export const AUDIT_LEGAL_DISCLAIMER =
  'Automated Chromium DOM, ARIA, and geometric inspection gate only. ' +
  'This report certifies machine-verifiable criteria of WCAG 2.2 AAA (contrast, target size, and semantic tree integrity). ' +
  'It does not constitute full legal certification under ADA Title III, the European Accessibility Act (EAA), or Section 508, ' +
  'and does not replace manual audits with human participants and screen readers (NVDA, JAWS, VoiceOver).';

export const AUDIT_SCOPE_ANNOTATION =
  'Automated Chromium DOM and ARIA inspection only; it is not a real screen-reader announcement test or a manual assistive-technology audit.';

export const MAX_NODES_PER_RULE = 10;

/**
 * Template Padrão do Sumário Executivo Markdown (contracts/test-suite-api.md §6.2)
 *
 * @param {object} report - Relatório completo ou objeto estruturado do anexo
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
        `| **Alvos Conformes (>= 44px)** | ${targetSizeSummary.compliantCount} / ${targetSizeSummary.controls ? targetSizeSummary.controls.length : targetSizeSummary.compliantCount} | SC 2.5.5 AAA |`,
        `| **Alvos Não Conformes** | ${targetSizeSummary.nonCompliantCount} | Mandatório: 0 |`,
        `| **Menor Alvo Medido** | ${targetSizeSummary.smallestTarget ? `\`${targetSizeSummary.smallestTarget.id}\` (${targetSizeSummary.smallestTarget.width}x${targetSizeSummary.smallestTarget.height}px)` : 'N/A'} | Limite >= 44x44px |`,
        `| **Status Nível 1 (24px AA)** | \`${targetSizeSummary.tier1Status}\` | SC 2.5.8 AA |`,
        `| **Status Nível 2 (44px AAA)** | \`${targetSizeSummary.tier2Status}\` | SC 2.5.5 AAA |`
      ].join('\n')
    : '| *Avaliação de Alvos de Toque* | *Não avaliado / Isento neste estado* | Isento |';

  const violationsSection = violations.length === 0
    ? '✅ **Zero violações confirmadas.** Suíte em conformidade com WCAG 2.2 AAA automatizada.'
    : violations.map((v) => `- **[${(v.impact || 'unknown').toUpperCase()}] ${v.id}**: ${v.help} (${v.nodes.length} nós afetados)\n  - Guia: ${v.helpUrl}`).join('\n');

  const incompleteSection = incomplete.length === 0
    ? '✅ **Nenhum diagnóstico inconclusivo.**'
    : incomplete.map((i) => `- **[${(i.impact || 'aviso').toUpperCase()}] ${i.id}**: ${i.description} (${i.nodes.length} nós requerem inspeção visual)`).join('\n');

  return `# Relatório de Auditoria WCAG 2.2 AAA

| Metadado | Valor |
| :--- | :--- |
| **Tema** | \`${theme}\` |
| **Estado** | \`${state}\` |
| **Motor** | \`${metadata?.engine || 'axe-core'}@${metadata?.engineVersion || '4.13.0'}\` |
| **Playwright** | \`${metadata?.playwrightVersion || '1.64.0'}\` |
| **Navegador** | \`${metadata?.browser || 'chromium'}\` (${metadata?.viewport?.width || 1280}x${metadata?.viewport?.height || 720}) |
| **Timestamp** | \`${metadata?.timestamp || new Date().toISOString()}\` |
| **Duração** | \`${metrics?.durationMs ?? 0}ms\` |

## 1. Métricas de Conformidade Axe-Core

| Métrica | Contagem | Critério de Aceite |
| :--- | :---: | :--- |
| **Aprovadas (Passes)** | ${metrics?.passesCount ?? 0} | Regras conformes |
| **Violações (Violations)** | **${metrics?.violationsCount ?? 0}** | **Mandatório: 0 (Fail-Fast)** |
| **Inconclusivas (Incomplete)** | ${metrics?.incompleteCount ?? 0} | Warn-Only (Inspeção visual) |
| **Inaplicáveis (Inapplicable)** | ${metrics?.inapplicableCount ?? 0} | Fora de escopo |

## 2. Avaliação de Alvos de Toque (Target Size - SC 2.5.5 AAA & SC 2.5.8 AA)

| Métrica | Valor | Detalhes |
| :--- | :---: | :--- |
${targetSizeRows}

## 3. Detalhamento de Violações Confirmadas

${violationsSection}

## 4. Diagnósticos Inconclusivos (Requerem Inspeção Visual)

${incompleteSection}

---
*Classificação: ${metadata?.classification || 'audit_evidence'} | Norma: ${metadata?.targetStandard || 'WCAG 2.2 AAA'}*  
*Ressalva: ${metadata?.disclaimer || AUDIT_LEGAL_DISCLAIMER}*
`;
}

/**
 * Builds a default neutral targetSizeSummary conforming to contracts/audit-report.schema.json.
 */
function createDefaultTargetSizeSummary() {
  return {
    tested: false,
    status: 'pass',
    tier1Status: 'not-applicable',
    tier2Status: 'not-applicable',
    compliantCount: 0,
    nonCompliantCount: 0,
    smallestTarget: null,
    controls: [],
    isCompliantAAA: true
  };
}

/**
 * Eager evidence retention helper.
 * Strips raw node arrays from passes and inapplicable, enforces budget limits (<= 50 KB JSON, <= 10 KB MD),
 * appends formal test annotations, and attaches artifacts via testInfo.attach().
 *
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {object} results - Axe analysis results
 * @param {string} theme - 'cinema' | 'noir' | 'eldritch' | 'industrial' | 'shadow-props'
 * @param {string} state - 'resting' | 'dynamic-traversal' | 'interactive-audio' | 'end-state'
 * @param {object} [targetSizeSummary] - Summary from evaluateTargetSizes
 * @param {number} [durationMs=0]
 */
export async function attachAuditArtifacts(testInfo, results, theme, state, targetSizeSummary = null, durationMs = 0) {
  // 1. Append formal annotation if not already present
  const hasAnnotation = testInfo.annotations?.some(
    (a) => a.type === 'audit_scope' && a.description === AUDIT_SCOPE_ANNOTATION
  );
  if (!hasAnnotation && testInfo.annotations) {
    testInfo.annotations.push({
      type: 'audit_scope',
      description: AUDIT_SCOPE_ANNOTATION
    });
  }

  const projectName = testInfo.project?.name || 'desktop-chromium';
  const viewport = testInfo.project?.use?.viewport || { width: 1280, height: 720 };

  let normalizedTargetSummary;
  if (!targetSizeSummary) {
    normalizedTargetSummary = createDefaultTargetSizeSummary();
  } else {
    normalizedTargetSummary = {
      tested: Boolean(targetSizeSummary.tested),
      status: targetSizeSummary.status || (targetSizeSummary.isCompliantAAA ? 'pass' : 'fail'),
      tier1Status: targetSizeSummary.tier1Status || 'pass',
      tier2Status: targetSizeSummary.tier2Status || 'pass',
      compliantCount: targetSizeSummary.compliantCount ?? (targetSizeSummary.isCompliantAAA ? 1 : 0),
      nonCompliantCount: targetSizeSummary.nonCompliantCount ?? (targetSizeSummary.isCompliantAAA ? 0 : 1),
      smallestTarget: targetSizeSummary.smallestTarget
        ? {
            id: String(targetSizeSummary.smallestTarget.id || 'control'),
            width: Number(targetSizeSummary.smallestTarget.width) || 44,
            height: Number(targetSizeSummary.smallestTarget.height) || 44
          }
        : null,
      controls: (targetSizeSummary.controls || []).map((c) => ({
        selector: c.selector || '#control',
        id: c.id ? String(c.id) : undefined,
        width: Number(c.width) || 0,
        height: Number(c.height) || 0,
        isCompliant: Boolean(c.isCompliant),
        box: {
          x: Number(c.box?.x) || 0,
          y: Number(c.box?.y) || 0,
          width: Number(c.box?.width) || 0,
          height: Number(c.box?.height) || 0
        }
      })),
      isCompliantAAA: Boolean(targetSizeSummary.isCompliantAAA)
    };
  }

  // 2. Build filtered structured JSON payload
  const reportPayload = {
    metadata: {
      engine: '@axe-core/playwright',
      engineVersion: '4.13.0',
      playwrightVersion: '1.64.0',
      browser: projectName.includes('mobile') ? 'mobile-chromium' : 'desktop-chromium',
      viewport: {
        width: viewport.width,
        height: viewport.height
      },
      timestamp: new Date().toISOString(),
      classification: 'Machine-Verifiable Automated Regression Gate',
      targetStandard: 'W3C WCAG 2.2 (Automated Subset)',
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'],
      assertor: {
        type: 'earl:Software',
        name: '@axe-core/playwright',
        operator: 'CI/CD Pipeline'
      },
      disclaimer: AUDIT_LEGAL_DISCLAIMER
    },
    theme,
    state,
    metrics: {
      passesCount: results?.passes?.length || 0,
      violationsCount: results?.violations?.length || 0,
      incompleteCount: results?.incomplete?.length || 0,
      inapplicableCount: results?.inapplicable?.length || 0,
      durationMs: Math.max(0, Math.round(durationMs))
    },
    violations: (results?.violations || []).map((v) => {
      const allNodes = v.nodes || [];
      const isTruncated = allNodes.length > MAX_NODES_PER_RULE;
      const slicedNodes = isTruncated ? allNodes.slice(0, MAX_NODES_PER_RULE) : allNodes;
      const violationObj = {
        id: v.id,
        impact: v.impact || 'minor',
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags || [],
        nodes: slicedNodes.map((n) => ({
          target: n.target || [],
          html: n.html ? (n.html.length > 120 ? n.html.slice(0, 120) : n.html) : '',
          failureSummary: n.failureSummary || ''
        }))
      };
      if (isTruncated) {
        violationObj.truncated = true;
        violationObj.totalNodes = allNodes.length;
      }
      return violationObj;
    }),
    incomplete: (results?.incomplete || []).map((i) => {
      const allNodes = i.nodes || [];
      const isTruncated = allNodes.length > MAX_NODES_PER_RULE;
      const slicedNodes = isTruncated ? allNodes.slice(0, MAX_NODES_PER_RULE) : allNodes;
      const incObj = {
        id: i.id,
        impact: i.impact ?? null,
        description: i.description,
        help: i.help || undefined,
        helpUrl: i.helpUrl || undefined,
        tags: i.tags || [],
        nodes: slicedNodes.map((n) => ({
          target: n.target || [],
          html: n.html ? (n.html.length > 120 ? n.html.slice(0, 120) : n.html) : ''
        }))
      };
      if (isTruncated) {
        incObj.truncated = true;
        incObj.totalNodes = allNodes.length;
      }
      return incObj;
    }),
    targetSizeSummary: normalizedTargetSummary
  };

  const jsonString = JSON.stringify(reportPayload, null, 2);
  const jsonBuffer = Buffer.from(jsonString, 'utf-8');
  if (jsonBuffer.byteLength > 50 * 1024) {
    throw new Error(`Audit report payload size (${jsonBuffer.byteLength} B) exceeds maximum ceiling of 50 KB`);
  }

  // 3. Generate concise Markdown Executive Table via contract formatAuditSummaryMarkdown
  const markdownSummary = formatAuditSummaryMarkdown(reportPayload);

  const markdownBuffer = Buffer.from(markdownSummary, 'utf-8');
  if (markdownBuffer.byteLength > 10 * 1024) {
    throw new Error(`Audit summary markdown size (${markdownBuffer.byteLength} B) exceeds ceiling of 10 KB`);
  }

  // 4. Eagerly attach artifacts
  if (testInfo.attach) {
    await testInfo.attach(`axe-audit-${theme}-${state}.json`, {
      body: jsonString,
      contentType: 'application/json'
    });

    await testInfo.attach(`audit-summary-${theme}-${state}.md`, {
      body: markdownSummary,
      contentType: 'text/markdown'
    });
  }

  return reportPayload;
}

/**
 * Captures forensic diagnostic artifacts (DOM snapshot, screenshot, and failure telemetry JSON)
 * when a test fails. Defensively protected against TargetClosedError.
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
    if (testInfo.attach) {
      await testInfo.attach(`${state}-failure-dom.html`, {
        contentType: 'text/html',
        body: domHtml
      });
    }

    // 2. Screenshot visual
    const screenshot = await page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot && testInfo.attach) {
      await testInfo.attach(`${state}-failure-screenshot.png`, {
        contentType: 'image/png',
        body: screenshot
      });
    }

    // 3. Telemetria estruturada do player e DOM conforme contracts/failure-telemetry.schema.json
    const telemetry = await page
      .evaluate(() => {
        const activeEl = document.activeElement;
        const selector =
          activeEl && activeEl !== document.body
            ? activeEl.id
              ? `#${activeEl.id}`
              : activeEl.getAttribute('aria-label')
                ? `${activeEl.tagName.toLowerCase()}[aria-label="${activeEl.getAttribute('aria-label')}"]`
                : activeEl.tagName.toLowerCase()
            : 'none';
        const visibleOverlay = document.querySelector(
          '.overlay:not([hidden]), #blocked-overlay:not([hidden]), #resume-overlay:not([hidden]), #end-overlay:not([hidden])'
        );

        return {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          domState: {
            activeElementSelector: selector,
            modalVisible: Boolean(visibleOverlay),
            overlayId: visibleOverlay ? (visibleOverlay.id ? `#${visibleOverlay.id}` : null) : null
          },
          playerState: {
            currentFrameIndex: Math.max(
              0,
              parseInt(document.querySelector('#progress')?.getAttribute('aria-valuenow') || '1', 10) - 1
            ),
            totalFrames: parseInt(document.querySelector('#progress')?.getAttribute('aria-valuemax') || '4', 10),
            isPlaying: document.querySelector('#player')?.getAttribute('data-status') === 'playing',
            isPaused: document.querySelector('#player')?.getAttribute('data-status') === 'paused',
            audioActive: document.querySelector('#audio-toggle')?.getAttribute('aria-pressed') === 'true',
            inert: document.querySelector('#player')?.hasAttribute('inert') || false
          }
        };
      })
      .catch(() => ({
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

    if (testInfo.attach) {
      await testInfo.attach(`${state}-failure-telemetry.json`, {
        contentType: 'application/json',
        body: JSON.stringify(fullTelemetry, null, 2)
      });
    }
  } catch (error) {
    console.warn(
      `[DIAGNOSTIC-TRAP-WARN] Falha defensiva ao capturar artefatos de diagnóstico (${error.message}). Protegido contra TargetClosedError.`
    );
  }
}
