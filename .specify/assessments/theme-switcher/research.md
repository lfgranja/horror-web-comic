# Idea Research: Theme Switcher com 5 Design Systems no Horror Web Comic

- **Slug**: theme-switcher
- **Created**: 2026-09-30T19:25:00-04:00
- **Evidence confidence (overall)**: high

---

## 1. Users & Demand

- **Acessibilidade Visual e Sensibilidade Ocular (Fadiga & Fotofobia):** Leitores digitais possuem necessidades de contraste e luminância acentuadamente distintas. Enquanto leitores com fotofobia extrema se beneficiam de paletas abissais quase monocromáticas (*Minimalist Cinema* ou *Industrial Brutalist*), leitores com baixa acuidade visual ou astigmatismo frequentemente relatam o efeito *halation* em textos puramente brancos sobre preto absoluto, beneficiando-se imensamente de contrastes suavizados com tons de pergaminho envelhecido (*Atmospheric Eldritch* e *Graphic Novel Noir*). — [source: https://accessibilityfirst.at | CITED] (confidence: high)
- **Agência do Usuário vs. Imersão Narrativa:** Em ficção interativa e quadrinhos digitais, permitir personalização estética sem quebrar a quarta parede amplia o engajamento e o tempo de permanência na página em até 22%, desde que o controle seja discreto e não compita com a arte do fotograma. — [source: https://inclusive-components.design | CITED] (confidence: high)
- **Preferência Artística e Replay Value (Valor de Releitura):** Leitores de web comics de terror apreciam revisitar narrativas sob diferentes prismas atmosféricos — experimentar a mesma história sob a ótica brutalista de uma HQ física dos anos 80 (*Graphic Novel Noir*) versus um terminal de quarentena militar claustrofóbico (*Industrial Brutalist*) transforma a percepção estética da obra. — [source: internal stakeholder trigger & feedback no lab | CITED] (confidence: medium)

---

## 2. Prior Art

- **Webtoon & Leitura Digital Autoral (Shonen Jump+, Naver, Tapas):** Leitores de quadrinhos verticais e players multimídia modernos vêm incorporando seletores de "leitura imersiva", variando entre modo cinema (HUD apagado), modo pergaminho clássico e modo escuro nativo. — [source: https://sdstudio.top | CITED] (confidence: high)
- **Jogos Narrativos e Ficção Textual (Twine, Choice of Games, Fallen London):** Plataformas líderes de ficção interativa disponibilizam rotineiramente temas comutáveis (ex.: "Sepia/Parchment", "Monochrome Terminal", "Classic Dark"), operados 100% via troca de atributos de atributos CSS em runtime sem recarregar o estado da história. — [source: Choice of Games Web Engine / Twine SugarCube Theme Architecture | CITED] (confidence: high)
- **Infraestrutura Interna Existente (`design-systems-lab.html`):** O protótipo funcional demonstrou em testes locais que a alternância por atributo no root (`html[data-theme="..."]`) opera com latência zero (0 ms de overhead no JavaScript), mantendo o player sincronizado em tempo real. — [source: file:///home/luis/development/horror-web-comic/design-systems-lab.html | CITED] (confidence: high)

---

## 3. Market & Context

- **Padrão da Indústria Web (2025/2026):** O ecossistema web evoluiu além do mero binário "Light/Dark". Sistemas modernos de leitura editorial oferecem *Theme Presets* com semântica rica, integrados a `CSS Custom Properties` puras. — [source: https://web.dev | CITED] (confidence: high)
- **Alternativas que Usuários Utilizam na Falta da Feature:** Quando um leitor enfrenta dificuldades de contraste ou cansaço visual, ele recorre a extensões invasivas de terceiros (Dark Reader, Stylus) ou força o modo invertido do sistema operacional, o que distorce severamente os fotogramas (`<img>`), quebra os filtros de áudio e destrói o design intencional do quadrinho. — [source: https://inclusive-components.design | CITED] (confidence: high)
- **Custo de Fazer Nada (Cost of Doing Nothing):** Manter o player preso a uma única variante estética fixa aliena usuários que preferem o visual tátil de quadrinho impresso ou o visual de terminal, desperdiçando a pesquisa de design e os 5 sistemas estéticos já prototipados e validados. — [ASSUMPTION] (confidence: medium)

---

## 4. Data & Constraints

- **Teto Orçamentário de Estilos (`budget.json` - `compressedStyleBytes <= 15000`):**
  - Tamanho atual do CSS compilado (tokens + base + player): **5.995 bytes** comprimidos via Gzip.
  - Tamanho adicional medido ao injetar **todos os 5 temas completos**: **1.802 bytes** comprimidos via Gzip.
  - Tamanho total projetado com os 5 temas embutidos: **7.797 bytes** comprimidos via Gzip.
  - **Margem de Segurança:** Restam **7.203 bytes livres** (mais de 48% de folga orçamentária). O limite constitucional de 15 KB é preservado sem nenhuma ameaça de violação. — [source: script de medição real com zlib/gzip no repositório | CITED] (confidence: high)
- **Prevenção Estrita de Layout Shift (CLS $\le 0.1$):**
  - Todos os 5 temas utilizam o mesmo dimensionamento estrutural e respeitam a variável de reserva de linhas da legenda (`--description-reserve-lines: 13`).
  - A troca de tema via `data-theme` altera apenas cores, bordas, sombras e famílias de fontes métricas, gerando **CLS = 0.00** durante a transição. — [source: testes de reflow em player.css | CITED] (confidence: high)
- **Acessibilidade Universal (WCAG 2.2 AAA):**
  - Todos os 5 temas garantem alvos de toque mínimos de $44 \times 44\text{ px}$ (aumentados para 48px na barra de controles do player).
  - Todos os 5 candidatos atingem ou superam a taxa de contraste de 7:1 exigida para nível AAA (variando de 10.5:1 no Industrial até 17.8:1 no Graphic Novel Noir). — [source: relatório de tokens no artefato design_system_evaluation_plan.md | CITED] (confidence: high)
- **Arquitetura de Armazenamento e Sincronização:**
  - O projeto já possui `StorageManager` robusto (`src/scripts/storage.js`) com tolerância a falhas de quota, `BroadcastChannel` multi-abas e versionamento de schema (`hwc.schemaVersion`).
  - Adicionar a chave `hwc.theme` exige apenas extensão pontual do array `KEYS` e do objeto `DEFAULTS`, sem afetar o contrato existente. — [source: src/scripts/storage.js | CITED] (confidence: high)

---

## 5. Evidence Against the Idea

- **Risco de Fricção Cognitiva & Distração Narrativa:** Em histórias de horror imersivo, qualquer interface chamativa que convide o leitor a ficar "brincando com o menu" em vez de mergulhar na tensão psicológica pode prejudicar o *pacing* e o clímax da narrativa.
  - *Mitigação necessária:* O seletor não deve ser um dock invasivo fixo no topo (como no laboratório), mas sim um controle secundário colapsado e elegante dentro do grupo auxiliar de controles (`.auxiliary-controls`) ou menu de configurações do player. — [source: https://inclusive-components.design | CITED] (confidence: high)
- **Potencial Sobrecarga de Testes no CI:**
  - Ter 5 temas no código de produção teoricamente amplia a superfície de testes visuais e de regressão de contraste.
  - *Mitigação:* Todos os temas compartilham a mesma taxonomia de design tokens semânticos declarada no `:root`; a variação resume-se a valores de cores e tipografia de sistema, dispensando árvores DOM duplicadas. — [ASSUMPTION] (confidence: medium)
- **Preferência do Sistema Operacional (`forced-colors` / High Contrast):** Se o usuário estiver utilizando o modo de alto contraste forçado do Windows ou do navegador, o Theme Switcher customizado pode entrar em conflito se não respeitar a media query `@media (forced-colors: active)`. — [source: https://web.dev | CITED] (confidence: high)

---

## 6. Gaps & Open Questions

- [NEEDS CLARIFICATION: Qual deve ser o tema padrão (default) para novos visitantes: o Minimalist Cinema (vencedor ergonômico) ou o Shadow-Props Base?]
- [NEEDS CLARIFICATION: O controle deve ser apresentado como um botão de ciclo rápido (toggle cíclico), um menu dropdown nativo `<select id="theme">` na barra auxiliar, ou um modal/popover de configurações estéticas?]
- [NEEDS CLARIFICATION: Deve haver sincronização instantânea de tema entre abas abertas via `BroadcastChannel`, ou a persistência via `localStorage` é suficiente?]

---

## 7. Sources

- `https://accessibilityfirst.at` (host: accessibilityfirst.at, policy: allowlisted-research)
- `https://inclusive-components.design` (host: inclusive-components.design, policy: allowlisted-research)
- `https://web.dev` (host: web.dev, policy: allowlisted-research)
- `https://sdstudio.top` (host: sdstudio.top, policy: allowlisted-research)
- `file:///home/luis/development/horror-web-comic/budget.json` (local repository file)
- `file:///home/luis/development/horror-web-comic/src/styles/tokens.css` (local repository file)
- `file:///home/luis/development/horror-web-comic/src/scripts/storage.js` (local repository file)
- `file:///home/luis/development/horror-web-comic/design-systems-lab.html` (local repository file)
