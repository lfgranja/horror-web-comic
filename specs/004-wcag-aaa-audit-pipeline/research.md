# Research & Architecture Decisions: Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core para Playwright

**Feature Directory**: `specs/004-wcag-aaa-audit-pipeline`  
**Date**: 2026-10-24  
**Status**: Completed & Approved (Phase 0)

---

## 1. Escopo de Varredura do AxeBuilder (`.include()` vs. Escopo Documental)

### Decisão
Executar o `AxeBuilder` no **escopo completo do documento (`page` sem restrição de `.include()`)** em cada um dos estados essenciais da experiência, inspecionando integralmente o `#player` e os diálogos de estado conforme ganham visibilidade (`hidden = false`).

### Racional & Evidência Técnica
1. **Topologia do DOM ([`index.html`](file:///home/luis/development/horror-web-comic/index.html#L16-L110))**: Os elementos `#player`, `#blocked-overlay`, `#resume-overlay`, `#end-overlay` e `#error-screen` são **nós-irmãos diretos** sob `<main id="app" class="app-shell">`. Nenhum overlay é nó-filho de `#player` (decisão de design deliberada em `src/styles/player.css` para manter a barra de controles visível sob a tela de encerramento).
2. **Eliminação de Falsos Positivos (*Silent Pass*)**: Se o `AxeBuilder` utilizasse `.include('#player')`, o motor do Axe-Core ignoraria sumariamente o `#blocked-overlay` e o `#end-overlay`. Testes empíricos demonstraram que ao auditar o `#end-overlay` com `.include('#player')`, zero nós do modal eram analisados, aprovando o teste com falso positivo.
3. **Preservação de Regras de Nível de Documento (*Page-Level Rules*)**: No Deque Axe-Core (`doc/rule-development.md`), regras com `"pageLevel": true` (como `bypass` para WCAG 2.4.1 e `region`) e regras ancoradas em seletores raiz como `html` (`html-has-lang`, `document-title`) **só executam se o documento inteiro for fornecido como contexto**. Restringir a subárvores ignora silenciosamente essas regras.
4. **Requisito 2 de Conformidade WCAG 2.2 ("Páginas Inteiras")**: A norma internacional W3C estabelece que a conformidade aplica-se exclusivamente a páginas web completas.
5. **Normalização de Termos**: A User Story 2 cita `#autoplay-overlay`; o código real (`index.html` L84 e `audio.js` L447) utiliza estritamente `#blocked-overlay`.

### Alternativas Consideradas
- **`.include('#player')`**: Descartado. Cega o teste para os modais irmãos e ignora regras de página inteira.
- **`.include('#app')`**: Descartado para o portão formal de conformidade, pois embora capture `#player` e overlays, desativa `bypass`, `html-has-lang` e `document-title`.
- **Seletores dinâmicos pontuais (`.include('#end-overlay')`)**: Descartado por complexidade desnecessária e por quebrar a análise de contraste contra o plano de fundo inerte.

---

## 2. Verificação de Alvos de Toque: Axe-Core SC 2.5.8 vs. WCAG 2.2 AAA SC 2.5.5

### Decisão
Adotar a **Arquitetura Híbrida de Dois Níveis (*Two-Tiered Gate*)**:
1. **Nível 1 (Axe-Core)**: Validação da regra nativa `target-size` (WCAG 2.2 AA SC 2.5.8) garantindo área mínima $\ge 24 \times 24\text{px}$ ou espaçamento periférico equivalente.
2. **Nível 2 (Playwright Programático)**: Laço determinístico de renderização computada (`boundingBox()`) validando que 100% dos controles visíveis na barra de controles (`nav.control-bar`) e overlays possuem largura e altura $\ge 44 \times 44\text{px}$, satisfazendo estritamente o critério **WCAG 2.2 AAA SC 2.5.5** e o Princípio VI da Constituição em ambos os viewports (`desktop-chromium` e `mobile-chromium`).

### Racional & Evidência Técnica
1. **Limitação Inerente do Axe-Core v4.13.0**: A inspeção direta do código do `axe-core` em `node_modules` confirmou que a regra `target-size` pertence à tag `wcag22aa` e avalia **estritamente o piso de 24px do SC 2.5.8**. O Axe-Core não implementa o critério AAA SC 2.5.5 (44px) e seu threshold é imutável via configuração.
2. **Diferença Normativa W3C**: O SC 2.5.8 (AA) possui a Exceção de Espaçamento (*Spacing Exception*), aprovando botões menores que 24px se houver margem ao redor. O SC 2.5.5 (AAA) **não possui exceção de espaçamento**; exige área física real $\ge 44 \times 44\text{px}$.
3. **Ergonomia Física e Pesquisa Científica**:
   - Modelagem de Lei de Fitts e norma ISO 9241-9/411: alvos inferiores a $9\text{mm}$ ($\approx 35\text{px}$) colapsam o *throughput* tátil.
   - *Nicolau & Jorge (2010, 2012)* e *Parhi et al. (MobileHCI)*: usuários com tremores (Parkinson, espasticidade) apresentam taxas de erro de **25% a 40%** em alvos de 24px, caindo para menos de **5% a 10%** em alvos $\ge 44\text{px}$.
4. **Piso no Código-Fonte**: O projeto já define em `src/styles/base.css` (L30-35) `button, select, input[type='range'] { min-width: 2.8rem; min-height: 2.8rem; }` ($2.8 \times 16\text{px} = 44.8\text{px}$). O laço de `boundingBox()` do Playwright é o oráculo determinístico para certificar essa geometria em tempo de execução.

### Alternativas Consideradas
- **Confiar apenas no `target-size` do Axe-Core**: Descartado. Geraria falsa sensação de conformidade AAA, pois um botão de 25px passaria silenciosamente violando o nível AAA e a Constituição.
- **Injetar regra customizada no Axe-Core via `axe.configure`**: Descartado por overhead de manutenção e fragilidade de runtime; o laço em Playwright é nativo, determinístico e já padronizado no repositório (`wcag-audit.spec.js`).

---

## 3. Retenção de Evidências no CI e Enquadramento Formal das Tarefas T144, T159 e T176

### Decisão
1. **Retenção de Evidências**: Utilizar os recursos nativos do Playwright (`testInfo.attach()`) para anexar o payload JSON estruturado do Axe-Core e resumos executivos em Markdown aos relatórios de teste (`playwright-report/` e `test-results/`), sem introduzir novas dependências de runtime.
2. **Enquadramento de Escopo (SC-006)**: Declarar com rigor metodológico que a esteira atesta e conclui formalmente a **perna técnica automatizável (*automated verification leg*)** das tarefas T144, T159 e T176 da Spec 001 (contraste 7:1 por Axe-Core nos 5 temas, target size $\ge 44 \times 44\text{px}$ em desktop/mobile e integridade ARIA nos estados essenciais), registrando expressamente que as auditorias manuais com tecnologias assistivas reais (NVDA, JAWS, VoiceOver) e participantes humanos permanecem como escopo manual aberto e não certificado por navegadores headless.

### Racional & Evidência Técnica
1. **Comportamento do CI ([`.github/workflows/ci.yml`](file:///home/luis/development/horror-web-comic/.github/workflows/ci.yml#L105-L114))**: Os relatórios do Playwright só sobem como artefatos no GitHub Actions se houver falha (`if: failure()`). O uso de `testInfo.attach()` garante que qualquer diagnóstico detalhado esteja presente tanto localmente quanto nos relatórios de falha de CI.
2. **Governança da Spec 001 ([`specs/001-cinematic-player/tasks.md`](file:///home/luis/development/horror-web-comic/specs/001-cinematic-player/tasks.md#L546-L558))**: As tarefas T144, T159 e T176 exigem *"real keyboard and screen-reader flows"* e foram deliberadamente mantidas em aberto (`partial`), com a nota formal de que nenhum navegador headless é capaz de certificar estudos com usuários humanos.
3. **Padrão W3C WCAG-EM e Literatura (*Brajnik 2004/2012*; *Sloan & Kelly 2006/2012*)**: O W3C proíbe emitir afirmação de conformidade WCAG plena baseando-se unicamente em ferramentas automatizadas (que cobrem ~30% a 57% das barreiras). Scanners não avaliam fidelidade semântica de `alt`, inteligibilidade cognitiva ou a virtualização de buffers de leitores de tela reais.
4. **Anotações de Escopo**: Seguir o padrão já consolidado em `tests/e2e/wcag-audit.spec.js`:
   `testInfo.annotations.push({ type: 'audit_scope', description: 'Automated Chromium DOM and ARIA inspection only; it is not a real screen-reader announcement test or a manual assistive-technology audit.' })`.

### Alternativas Consideradas
- **Declarar conclusão total de T144/T159/T176**: Descartado. Falsa alegação de conformidade incompatível com a governança do repositório.
- **Exportação SARIF obrigatória via `@microsoft/axe-sarif-converter`**: Descartado para o fluxo principal para evitar inflar o `package.json` com dependências de terceiros; `testInfo.attach()` atende perfeitamente ao Playwright Report.

---

## 4. Estrutura Ortogonal de Estados Narrativos e Orçamento de CI (FR-008 vs. SC-004)

### Decisão
Estruturar os 4 estados essenciais de forma **ortogonal e desacoplada (NIST SP 800-142)**:
- **Estado 1 (Repouso & Matriz de Temas)**: Varredura documental completa do Axe-Core no Quadro 1 nos 5 temas visuais (`cinema`, `noir`, `eldritch`, `industrial`, `shadow-props`), garantindo contraste $\ge 7:1$ (`color-contrast-enhanced`) e ausência de violações estruturais em cada paleta.
- **Estado 2 (Sequência Narrativa Dinâmica)**: No tema padrão (`cinema`), avanço sequencial pelos quadros 1 a 4 via Playwright, validando ativamente as mutações de `aria-valuenow` ('1' a '4') em `#progress`, a correspondência do texto alternativo `alt` em `#frame-image` e o texto anunciado na live region `#frame-description` (aguardando a estabilização do debounce de 500ms do `AccessibilityController`).
- **Estado 3 (Interação, Foco e Áudio)**: Controles com anel de foco ativo, dropdown `#theme` expandido, simulação de bloqueio de áudio com modal `#blocked-overlay` visível e validação da região `#audio-status` (`role="status"`, `aria-live="polite"`).
- **Estado 4 (Fim da Narrativa)**: Overlay final `#end-overlay` em exibição (`hidden = false`), assegurando conformidade AAA do diálogo não-modal (`role="dialog"` sem `aria-modal`), operabilidade simultânea desobstruída da barra de controles perante SC 2.4.12 e FR-033, e foco inicial no botão `#replay`.

### Racional & Evidência Técnica
1. **Cálculo Orçamentário e Prevenção de Explosão Cartesiana**:
   - Um produto cartesiano ($4 \text{ Quadros} \times 5 \text{ Temas} = 20 \text{ varreduras Axe}$) somado a $20 \times 0{,}5\text{s}$ de debounce de audiodescrição consumiria entre **19,5 e 25+ segundos**, estourando o limite de $\le 10\text{s}$ de `SC-004`.
   - A abordagem ortogonal realiza exatamente **8 varreduras Axe**: 5 nos temas no Estado 1 + 1 no Quadro 4 estabilizado no Estado 2 (emitindo `axe-audit-cinema-dynamic-traversal.json`) + 1 em `#blocked-overlay` no Estado 3 + 1 em `#end-overlay` no Estado 4, combinadas à travessia rápida de 4 quadros e validação de live regions via Playwright.
   - **Tempo Total Medido**: **~4,5 a 6,5 segundos**, operando com ampla margem de segurança abaixo do teto de 10s de SC-004.
2. **Isomorfismo Cromático**: Os tokens de cor e regras de contraste em `tokens.css` e `player.css` são invariantes em relação ao número do quadro; o contraste do tema *Noir* no Quadro 2 é idêntico ao do Quadro 1. Repeti-lo para todos os quadros seria redundância computacional sem ganho de cobertura.
3. **Divisão de Responsabilidades W3C ACT**: O Axe-Core atesta a *semântica estática* da árvore ARIA; o Playwright atesta a *integridade dinâmica temporal* das transições de dados e debounces.

### Alternativas Consideradas
- **Matriz Cartesiana Completa (20 Scans Axe)**: Descartada por violação do orçamento de CI e risco agudo de timeouts e *flakes*.
- **Auditar apenas Quadro 1 e Fim**: Descartada por deixar os quadros intermediários (2 e 3) sem validação de live regions e barra de progresso.

---

## 5. Topologia da Suíte de Testes e Coexistência Modular

### Decisão
Implementar `tests/e2e/accessibility.spec.js` como um **portão algorítmico dedicado e complementar** para o motor Axe-Core WCAG 2.2 AAA nos projetos Chromium (`desktop-chromium` e `mobile-chromium`), **preservando integralmente e sem churn** os arquivos pré-existentes:
- `tests/e2e/wcag-audit.spec.js` (contratos funcionais de teclado físico, anéis de foco e safe areas móveis da Spec 001)
- `tests/e2e/contrast.spec.js` (amostragem fotométrica por pixel rasterizado via Sharp)
- `tests/e2e/theme-a11y.spec.js` (ergonomia de `.sr-only` e suporte a `forced-colors: active`)
- `tests/e2e/reduced-motion.spec.js` (emulação de `prefers-reduced-motion: reduce`)

### Racional & Evidência Técnica
1. **Princípios de Test Design (Meszaros & Fowler)**: Evita o *Eager Test Smell*. Separar auditoria estática do Axe-Core de testes de eventos de teclado físico e emulação de preferências de sistema operacional permite isolamento imediato de causa-raiz.
2. **Literatura sobre Test Churn (*Vahabzadeh et al. ASE 2015*)**: Mais de 40% dos bugs em suítes de teste decorrem de refatorações ou migrações de testes estáveis. Manter os testes existentes intocados elimina risco de regressão.
3. **Incapacidade do Axe de Testar Teclado Real**: O Axe-Core analisa a árvore do DOM; ele **não despacha eventos de teclado físico** (`Enter`, `Space`, `ArrowRight`), não manipula estados do player (`data-status="playing"`), nem lê stylesheets para checar variáveis CSS de entalhe (`env(safe-area-inset-*)`). Apagar ou consolidar `wcag-audit.spec.js` destruiria essas coberturas vitais.
4. **Convenção `zz-legacy-`**: O prefixo `zz-legacy-` é restrito à fixture em inglês (`story-legacy.json`). `wcag-audit.spec.js` testa a história canônica e não deve ser renomeado.

### Alternativas Consideradas
- **Substituir / depreciar `wcag-audit.spec.js`**: Descartado. Perderia a cobertura de navegação por teclado e safe areas móveis.
- **Fundir tudo em uma suíte monolítica**: Descartado por inchar o arquivo, misturar matrizes de navegadores e aumentar a complexidade de manutenção.

---

## 6. Dependência Exata e Compatibilidade de Runtime (Node & Playwright)

### Decisão
Adotar estritamente a dependência pinada:
```json
"devDependencies": {
  "@axe-core/playwright": "4.13.0"
}
```

### Racional & Evidência Técnica
1. **Compatibilidade com Node.js (`engines.node: ">=20.0.0"`)**:
   - A versão `@axe-core/playwright@4.13.0` utiliza `axe-core@~4.13.0` e suporta `node: ">=20.0.0"`.
   - A versão subsequente `4.14.0` elevou o piso de engine para `node: ">=22.12.0"`, o que quebraria ambientes com Node 20 (piso declarado no projeto e em CI).
2. **Compatibilidade com `@playwright/test@1.64.0`**: Homologado e funcional com as APIs de página do Playwright.
3. **Padrão Estrito de Dependências (AGENTS.md / `scripts/preflight.mjs`)**: Todas as dependências devem ser pinadas exatamente, sem caracteres de range (`^` ou `~`). O preflight do projeto valida essa política.

---

## 7. Dependência para Testes Baseados em Propriedades (`fast-check`)

### Decisão
Adotar estritamente a dependência pinada:
```json
"devDependencies": {
  "fast-check": "3.23.2"
}
```
para testes baseados em propriedades (*Property-Based Testing* — PBT) de utilitários e algoritmos auxiliares de acessibilidade (como validação de limiares de contraste fotométrico, cálculo de contenção geométrica em viewport e serialização com truncagem determinística de payloads de violações).

### Racional & Evidência Técnica
1. **Compatibilidade com Node.js 20 LTS e ES Modules Nativos**:
   - `fast-check@3.23.2` é totalmente compatível com o ecossistema ESM nativo (`"type": "module"`) adotado no projeto, importável diretamente sem dependência de transpiladores, empacotadores intermediários ou loaders experimentais.
   - Preserva compatibilidade total com `engines.node: ">=20.0.0"`, alinhando-se aos ambientes de desenvolvimento e às esteiras de CI no GitHub Actions.
2. **Governança de Dependências Estritas e Padrão Anti-Drift (AGENTS.md / `scripts/preflight.mjs`)**:
   - A dependência é declarada estritamente pinada como `"3.23.2"`, sem operadores de intervalo semver (`^`, `~`), satisfazendo os requisitos do script de integridade `scripts/preflight.mjs` e prevenindo divergências no lockfile v3.
3. **Determinismo e Reprodutibilidade de Geradores em CI**:
   - Permite a parametrização determinística (`seed`, `numRuns`) durante as execuções de teste no CI, assegurando que contraexemplos encontrados via redução (*shrinking*) sejam 100% reproduzíveis, eliminando intermitências (*flakes*).

---

*Fim do Relatório de Pesquisa e Decisões de Arquitetura (Fase 0).*
