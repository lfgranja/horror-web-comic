# Idea Research: Esteira Automatizada de Auditoria WCAG 2.2 AAA com Axe-Core para Playwright

- **Slug**: wcag-aaa-audit-pipeline
- **Created**: 2026-10-24
- **Evidence confidence (overall)**: high

## Users & Demand

- **Leitores com necessidades visuais específicas**: Usuários com fotofobia, astigmatismo, daltonismo ou baixa visão necessitam de contraste reforçado de pelo menos 7:1 (`color-contrast-enhanced`) e alvos de toque confortáveis ($\ge 44 \times 44\text{px}$) em todos os 5 temas dramáticos da obra para garantir legibilidade prolongada sem fadiga visual. — [source: .specify/assessments/theme-switcher/problem.md | constitution.md Princípio VI] (confidence: high)
- **Usuários de leitores de tela**: A navegação por teclado e a percepção de mudanças de quadro exigem que live regions (`aria-live="polite"`), diálogos de bloqueio e rótulos acessíveis estejam sintaticamente perfeitos e anunciáveis. — [source: specs/001-cinematic-player/spec.md §FR-011] (confidence: high)
- **Equipe de Engenharia / Mantenedor**: Necessidade crítica de blindagem automatizada contra regressões em CSS/DOM. Sem testes automatizados de acessibilidade, qualquer ajuste em tokens visuais (`tokens.css`) ou layout (`player.css`) exige inspeção manual cansativa de 5 temas em diversos viewports para validar as tarefas T144, T159 e T176. — [source: specs/001-cinematic-player/tasks.md] (confidence: high)

## Prior Art

- **Auditoria de Acessibilidade com Lighthouse no Projeto**: O projeto já executa `npm run lhci` com nota 100% em acessibilidade em `index.html`. No entanto, o Lighthouse avalia apenas o estado estático inicial do DOM padrão, não cobrindo a alternância dos 5 temas visuais em runtime nem estados interativos dinâmicos (modais, fim de narrativa, dropdown de tema aberto). — [source: lighthouserc.json | scripts/preflight.mjs]
- **Testes Unitários de Acessibilidade (`tests/unit/a11y.test.js`)**: Cobrem as chamadas do método `announce()` da classe `AccessibilityController`, mas operam no Node.js sem motor de layout, sendo incapazes de calcular valores de contraste computado ou áreas de toque em pixels. — [source: tests/unit/a11y.test.js]
- **Ecossistema Axe-Core + Playwright na Indústria**: `@axe-core/playwright` da Deque Systems é o padrão de facto para integração de testes contínuos de acessibilidade em Playwright, executando o motor de regras `axe-core` diretamente no contexto de execução do navegador. — [source: https://playwright.dev/docs/accessibility-testing]

## Market & Context

- **Norma W3C WCAG 2.2**: Recomendação oficial emitida em outubro de 2023. Introduziu critérios como 2.5.8 *Target Size (Minimum)* no nível AA e reforçou o escopo de conformidade AAA. O Princípio VI da Constituição do projeto exige conformidade WCAG 2.2 AAA inegociável. — [source: .specify/memory/constitution.md §VI]
- **Custo da Inação**: Manter a verificação de acessibilidade como um processo puramente manual (como constava em T144 e T176) cria risco constante de regressão em temas secundários (`noir`, `eldritch`, `industrial`, `shadow-props`) e impede a conclusão formal com evidência objetiva.

## Data & Constraints

- **Versão Exata e Compatibilidade de Pacote**:
  - O projeto utiliza `@playwright/test: 1.64.0` e declara `engines.node: ">=20.0.0"` no `package.json`.
  - Investigação empírica no registro npm revela que a versão mais recente (`@axe-core/playwright@4.14.0`) adicionou uma restrição estrita de `engines: { node: ">=22.12.0" }`. Se adotada, essa versão causaria falha em runners de CI executando Node 20 LTS (quebrando o portão preflight do projeto).
  - A versão **`@axe-core/playwright@4.13.0`** utiliza internamente o `axe-core@~4.13.0`, possui `peerDependencies: { 'playwright-core': '>= 1.0.0' }`, foi homologada com `@playwright/test: ^1.60.0` e **não restringe motores acima de Node 20**, tornando-a a escolha exata, estável e compatível com as regras de pins estritos do repositório. — [source: npm view @axe-core/playwright@4.13.0] (confidence: high)
- **Tags Normativas Necessárias**:
  - No axe-core, regras de nível AAA **não são executadas por padrão**.
  - Para atingir cobertura WCAG 2.2 AAA completa, o scanner deve ser explicitamente configurado com:
    ```javascript
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'wcag2aaa'])
    ```
- **Comportamento de `color-contrast-enhanced` (SC 1.4.6)**:
  - Exige taxa de contraste $\ge 7.0:1$ para texto normal e $\ge 4.5:1$ para texto grande ($\ge 18\text{pt}$ ou $\ge 14\text{pt}$ negrito).
  - Nossos 5 temas em `tokens.css` foram auditados previamente com luminância $L \le 0.02$ e contrastes teóricos entre $10.5:1$ e $17.8:1$.
  - Pontos de atenção: botões inativos precisam manter o atributo semântico nativo `disabled` ou `aria-disabled="true"` para que o axe-core aplique as isenções oficiais de contraste para controles desabilitados. — [source: https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced]
- **Estratégia de Orquestração de Estados Dinâmicos**:
  - O axe analisa o DOM congelado no momento da invocação de `analyze()`.
  - A esteira deve orquestrar testes em 4 estados críticos:
    1. *Estado Base*: Página carregada, tema ativo, primeiro quadro estabilizado (`data-image-loading="false"`).
    2. *Matriz de 5 Temas*: Ciclo de alternância entre `cinema`, `noir`, `eldritch`, `industrial` e `shadow-props` via `#theme` select, verificando a recalibração de cores e foco.
    3. *Estado Interativo*: Barra de controle com dropdown aberto e controles focados.
    4. *Estado Final*: Overlay de fim de narrativa exibido (`[data-status="ended"]`), garantindo contraste no modal e no botão "Rever do início".
  - Falsos positivos são evitados esperando as transições CSS concluírem (`await expect(element).toBeVisible()`) antes de disparar a varredura e usando `.include('#player')` para não escanear elementos deliberadamente ocultos fora da visão.

## Evidence Against the Idea

- **A automação cobre apenas parte da WCAG (~30% a 50%)**: O axe-core valida integridade de tags, contraste matemático e áreas de clique, mas **não** pode validar a inteligibilidade humana de um texto alternativo (`alt`), nem se a audiodescrição captura a emoção pretendida da cena, nem o fluxo de leitura cognitivo. Essas validações humanas continuam sob a responsabilidade dos estudos de usabilidade (Fase 3 do roadmap). — [source: https://playwright.dev/docs/accessibility-testing]
- **Sensibilidade a Bordas Translúcidas**: Se elementos utilizarem bordas semitransparentes sobre imagens em movimento, o axe-core pode reportar violações indeterminadas (*incomplete*). A arquitetura do player isola a legenda e os controles em barras sólidas com `--ink-900`/`--ink-950`, mitigando esse risco.

## Gaps & Open Questions

- [NEEDS CLARIFICATION: Executar a suíte de acessibilidade nos 5 projetos do Playwright (desktop e mobile) ou apenas em desktop-chromium e mobile-chromium para manter a duração do CI otimizada?]
- [NEEDS CLARIFICATION: Se eventuais diagnósticos 'incomplete' do axe-core em viewports ultra-estreitos (320px) devem bloquear o teste ou ser registrados como alertas?]

## Sources

- `https://playwright.dev/docs/accessibility-testing` (host: playwright.dev, policy: confirmed-by-user)
- `https://github.com/dequelabs/axe-core-npm` (host: github.com, policy: allowlisted)
- `https://dequeuniversity.com/rules/axe/4.13/color-contrast-enhanced` (host: dequeuniversity.com, policy: confirmed-by-user)
- `https://www.w3.org/WAI/WCAG22/quickref/` (host: w3.org, policy: confirmed-by-user)
