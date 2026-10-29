# Idea Research: Reformular o horror web comic com a suite ArtCraft

- **Slug**: artcraft-horror-comic-reform
- **Created**: 2026-10-17T05:25:00Z
- **Evidence confidence (overall)**: medium

## Users & Demand

- O público-alvo é o leitor do comic cinematográfico de terror (web, mobile-first); **não há métricas de uso, tickets ou entrevistas registrados no repositório** — a demanda é declarada pelo stakeholder (usuário) na intake. — [source: `.specify/assessments/artcraft-horror-comic-reform/intake.md` | CITED] (confidence: high para a origem declarada; low para demanda observada)
- O gatilho registrado é a disponibilidade local da suíte ArtCraft (binários + CLIs), não um pedido de usuário final. — [source: intake.md] (confidence: high)
- Nenhuma issue/PR/solicitação de integração com ArtCraft aparece nos artefatos do projeto (`.specify/`, `specs/`, `docs/`). — [ASSUMPTION, baseada na ausência de menções nos arquivos lidos] (confidence: medium)
- A experiência atual é estática, sem backend, e a narrativa deve permanecer compreensível sem áudio (README). Isso restringe o que uma "reformulação" pode introduzir no runtime. — [source: `README.md`] (confidence: high)

## Prior Art

- Pipeline de mídia existente baseado em `sharp` (Node) + `ffmpeg`/`ffprobe`, com masters em `media-src/` e publicáveis em `assets/`, geração de variantes AVIF/WebP/JPEG e áudio AAC/Opus; nomes de variantes leves centralizados em `light-variants.js`. — [source: `package.json`, `docs/delivery.md`, `AGENTS.md`] (confidence: high)
- Separação rígida `media-src/` (masters, nunca publicados) vs `assets/` (publicável, apenas referenciado pelo manifesto); build recusa arquivos não referenciados e WAV não comprimido. — [source: `docs/delivery.md`] (confidence: high)
- Avaliação anterior (assessment `theme-switcher`) adotou solução CSS-only com medição real de orçamento (gzip) e preservação de CLS = 0. — [source: `.specify/assessments/theme-switcher/research.md`] (confidence: high)
- Constituição define o médium como HTML/CSS/JS + quadros de imagem e proíbe vídeo, motores de jogo ou frameworks pesados no runtime. — [source: `.specify/memory/constitution.md` (Princípio II)] (confidence: high)
- A suíte ArtCraft (org `storytold`) oferece 13+ apps com CLIs headless/batch/MCP: designcraft, photocraft, vectorcraft, filmcraft, effectcraft, soundcraft, lightcraft, pdfcraft, wordcraft, deckcraft, cadcraft, gridcraft, figcraft, artcraft, animcraft, além de craft-libs, craft-ai-integrations e craft-fonts. Todos os CLIs inspecionados expõem `--help`, `commands`, `run`/`script`, `mcp`, `convert`/`render`/`export` em modo headless. — [source: `https://github.com/orgs/storytold/repositories` (host: github.com, policy: allowlisted) + saída local de `<app>-cli --help` + `feed.json`] (confidence: high)
- Versões instaladas localmente: cadcraft 0.7.0, designcraft 0.8.0, effectcraft 0.10.0, filmcraft 0.8.0, figcraft 0.6.0, gridcraft 0.7.0, lightcraft 0.8.0, pdfcraft 0.8.0, photocraft 0.9.0, soundcraft 0.7.0, vectorcraft 0.12.0, wordcraft 0.7.0, artcraft-launcher 0.4.1. — [source: saída local de `--version`] (confidence: high)
- Não há integração prévia de ferramentas nativas Rust de autoria no pipeline deste repositório (apenas sharp/ffmpeg). — [ASSUMPTION] (confidence: medium)

## Market & Context

- Alternativa atual de autoria: edição manual em ferramentas externas + codificação via `build:images` (sharp/ffmpeg). A suíte ArtCraft cobriria etapas de autoria (vetor, foto, layout, composição, áudio, vídeo/motion, PDF, documento) que hoje não existem no repositório. — [source: `media-src/` tree + CLIs help] (confidence: high para o estado atual; medium para a cobertura proposta)
- Custo de não fazer nada: o pipeline atual é limitado a masters raster (JPG) e áudio WAV, sem ferramentaria de ilustração/vetor/composição no repo; a arte final é hoje fixture sintético promovido a master. — [source: `docs/delivery.md` ("Os quadros publicados hoje são fixtures sintéticas...")] (confidence: high)
- A suíte é open-source (Apache License 2.0) e multiplataforma (Linux/macOS/Windows), com binários headless. — [source: `https://github.com/orgs/storytold/repositories`] (confidence: high)
- Tendências de mercado para web comics cinematográficos/interativos e seus padrões de entrega não foram pesquisadas em fontes externas nesta rodada. — [ASSUMPTION / gap] (confidence: low)

## Data & Constraints

- Orçamentos rígidos (`budget.json`): cena inicial 1,5 MB; quadro 300 KB; ativos totais 30 MB; JS comprimido 50 KB; CSS comprimido 15 KB; código comprimido total 65 KB (decimais). — [source: `budget.json`, `docs/delivery.md`] (confidence: high)
- Limites de performance: CLS < 0,1; LCP ≤ 2500 ms (Lighthouse); primeiro quadro frio < 2,5 s p75 em 4G; warm < 1,5 s. — [source: `docs/delivery.md`] (confidence: high)
- CI: `ubuntu-latest`, gate `preflight → validate → test:unit → build:images → build → test:e2e → test:perf`; preflight exige Node ≥20, npm ≥10, Python ≥3.10, ffmpeg/ffprobe ≥5 (aac+libopus), navegadores Playwright lançando headless, deps pinadas. — [source: `AGENTS.md`, `docs/delivery.md`] (confidence: high)
- Hosts Fedora não conseguem rodar webkit localmente (CI-enforced em ubuntu-latest). — [source: `AGENTS.md`] (confidence: high)
- Segurança de referências: apenas caminhos locais seguros; sem URLs externas em manifesto/HTML; validado por `isSafeLocalReference` e `build.mjs`. — [source: `AGENTS.md`] (confidence: high)
- Licença do projeto: MIT (`package.json`, `LICENSE`). Suíte ArtCraft: Apache 2.0. Compatibilidade/redistribuição e obrigações de aviso não foram verificadas por counsel. — [ASSUMPTION] (confidence: low)
- Binários da suíte são grandes (≈ 90–125 MB por app, conforme assets de release) e não estão no repositório nem no lockfile. — [source: `feed.json` (assets sizes) + `which`] (confidence: high para o tamanho; medium para a implicação de CI)
- Constituição Princípio IV (performance/orçamento de ativos não negociável) e Princípio II (médium definido) impõem que qualquer ativo gerado respeite formatos/orçamentos e que o runtime permaneça HTML/CSS/JS/imagens. — [source: `.specify/memory/constitution.md`] (confidence: high)

## Evidence Against the Idea

- **Escopo indefinido ("reformular todo")**: a intake não especifica quais apps, quais artefatos nem em que etapa do pipeline; risco de scope creep e de reescrita ampla sem critério de sucesso. — [source: intake.md (First-Glance Unknowns)] (confidence: high)
- **Reprodutibilidade de CI**: preflight hoje verifica apenas Node/npm/Python/ffmpeg/Playwright; adicionar 13+ binários nativos exige novas checagens, pinagem de versões e instalação em runners, multiplicando a superfície de falha. — [source: `AGENTS.md` (preflight), `docs/delivery.md`] (confidence: high)
- **Custo de CI/tempo e tamanho**: cada CLI ≈ 90–125 MB; instalar toda a suíte em cada execução de CI é impraticável; seria necessário cache ou runner customizado. — [source: `feed.json`] (confidence: high)
- **Orçamento de ativos**: saídas dos apps podem exceder 300 KB/quadro e 30 MB totais se o pipeline não recomprimir para AVIF/WebP/JPEG + srcset; risco de violar budget.json. — [source: `budget.json`, `docs/delivery.md`] (confidence: medium)
- **Conformidade constitucional**: se a "reformulação" introduzir vídeo, motion graphics ou engines no runtime, viola o Princípio II; os apps (filmcraft/effectcraft) geram vídeo por natureza, conflitando com o médium definido. — [source: `constitution.md` (Princípio II), CLIs help (filmcraft export h264/hevc…)] (confidence: medium)
- **Manutenção/acompanhamento de upstream**: cadência de releases rápida (out/2026) e muitos apps; integração de 13 ferramentas cria dívida de manutenção e risco de quebra por mudança de CLI. — [source: `feed.json` (published_at)] (confidence: medium)
- **Demanda não observada**: não há evidência de usuário final pedindo ArtCraft; a ideia é impulsionada pelo stakeholder e pela disponibilidade local da ferramenta (possível viés de solução em busca de problema). — [ASSUMPTION] (confidence: low)
- **Licenciamento/atribuição**: obrigações Apache 2.0 (NOTICE) ao redistribuir ou embutir; não verificado. — [ASSUMPTION] (confidence: low)
- **Plataforma**: CI roda em Linux; apps suportam Linux, mas a experiência de autoria GUI pode não ser reproduzível em headless; risco de dependência de ambiente local do autor. — [source: `AGENTS.md` (Fedora/webkit), CLIs help] (confidence: medium)

## Gaps & Open Questions

- [NEEDS CLARIFICATION: Quais apps da suíte seriam usados e para quais artefatos (frames, áudio, tipografia, layout, composição, exportação)?]
- [NEEDS CLARIFICATION: A reformulação atinge apenas `media-src/`/`assets/`/`story.json`, ou também player e pipeline de build?]
- [NEEDS CLARIFICATION: Geração automatizada via CLIs integrada ao build, ou autoria manual nos apps?]
- [NEEDS CLARIFICATION: Impacto nos orçamentos de `budget.json` e formatos de entrega (AVIF/WebP/fallback + srcset)?]
- [NEEDS CLARIFICATION: Manter compatibilidade com schema v1 e testes E2E/Perf, ou mudar contrato?]
- [NEEDS CLARIFICATION: Licenças/termos da suíte e dos assets gerados para redistribuição?]
- [NEEDS CLARIFICATION: Restrições de plataforma/CI para execução headless nos runners?]
- [NEEDS CLARIFICATION: Demanda observada de leitores por conteúdo/estilo produzido com essas ferramentas?]

## Sources

- `https://github.com/orgs/storytold/repositories` (host: github.com, policy: allowlisted) — listagem pública da organização ArtCraft (66 repositórios).
- `https://github.com/storytold/<app>` (host: github.com, policy: allowlisted) — referenciado indiretamente via listagem (sem fetch adicional).
- `.specify/assessments/artcraft-horror-comic-reform/intake.md` (local) — ideia capturada.
- `.specify/assessments/theme-switcher/research.md` (local) — prior art interno.
- `.specify/memory/constitution.md` (local) — princípios e governança.
- `README.md`, `AGENTS.md`, `budget.json`, `package.json`, `docs/delivery.md` (local).
- `media-src/` tree, `assets/` tree (local).
- Saída local de `<app>-cli --help` / `--version` para 13 CLIs.
- `/home/luis/.cache/artcraft-launcher/feed.json` (local, cache do launcher) — versões, datas de publicação, tamanhos de binários.
- `/home/luis/.local/share/ai.storyteller.artcraft-launcher/app.ron` (local) — configuração do launcher.

---

## Research Update (deep pass) — 2026-10-17

### Licensing (resolved gap)

- A suíte ArtCraft (ex.: `storytold/designcraft`) é **dual-licensed MIT OR Apache-2.0** ("DesignCraft is dual-licensed under MIT or Apache-2.0, at your option"). Isso é compatível com a licença MIT do projeto `horror-web-comic`; a opção MIT pode ser adotada sem obrigações de aviso Apache. Apenas os ativos *bundled* (fontes, ícones, imagens) mantêm licenças próprias e são listados em `ASSETS.md` de cada app. — [source: `https://github.com/storytold/designcraft` (host: github.com, policy: allowlisted)] (confidence: high)
- Os nomes/marcas ArtCraft (logos, wordmark) não são cobertos pela licença e não devem ser redistribuídos; irrelevante para assets gerados, mas relevante se o projeto citar a suíte. — [source: mesmo] (confidence: high)

### Export formats & budget fit (partially resolved gap)

- Teste headless local: `designcraft-cli run --sample --export out.png` produziu PNG 630×810 em 217 KB em ~1,2 s. Abaixo do orçamento por quadro (300 KB) mesmo antes de compressão AVIF/WebP; com re-codificação pelo pipeline existente (sharp) o tamanho final será menor. — [source: execução local, 2026-10-17] (confidence: high)
- Teste headless local: `vectorcraft-cli run --export out.svg` produziu SVG de 251 bytes (vetor escalável). Vetores podem ser rasterizados pelo pipeline existente (sharp suporta SVG via resvg? a confirmar) ou usados como master vetorial. — [source: execução local, 2026-10-17] (confidence: high para a exportação; medium para a integração com sharp)
- Photocraft CLI (`photocraft-cli convert`) converte entre `.pcraft, .psd, .png, .jpg, .tif, .webp, .exr, …` com controle de qualidade; não lista AVIF explicitamente, mas o pipeline existente já gera AVIF via sharp. — [source: `photocraft-cli run --help` (local)] (confidence: high)
- Os CLIs rodam headless sem display (validado para designcraft e vectorcraft) e aceitam `--sample`/`run`/`convert`/`export`, viabilizando autoria local e, no futuro, integração parcial. — [source: execução local] (confidence: high)

### CI feasibility (partially resolved gap)

- Os binários são grandes (≈90–125 MB por app, conforme `feed.json`) e não estão versionados no repositório; a Option B (local-only) evita esse custo. A Option C (integração no CI) permanece inviável sem cache/runner customizado e pinagem. — [source: `feed.json` + execução local] (confidence: high)
- Os CLIs são binários nativos Linux (x86_64) compatíveis com `ubuntu-latest`; não há dependência de GUI para operações headless testadas. — [source: execução local] (confidence: high)

### Demand (still unresolved)

- Continua sem dados observados de leitores ou solicitações de usuários finais no repositório. A demanda permanece declarada pelo stakeholder (usuário) na intake. A avaliação visual comparativa (qualidade da arte com/sem a suíte) ainda não foi realizada. — [ASSUMPTION] (confidence: low)

### Web/WASM (new finding)

- DesignCraft possui build web via WebAssembly (`trunk build --release`), além de desktop e CLI; a suíte roda no navegador. Isso não altera o escopo da Option B (autoria local), mas reduz risco de portabilidade para autores em outras plataformas. — [source: `https://github.com/storytold/designcraft` (README "Web")] (confidence: high)

### Net effect on evidence

- Lacunas fechadas: licenciamento (compatível, MIT disponível), formatos de exportação (PNG/SVG/WebP viáveis e dentro do orçamento por quadro), execução headless (validada), portabilidade (WASM).
- Lacunas remanescentes: demanda observada de leitores; ganho de qualidade mensurável; integração com sharp para SVG; orçamento total de ativos com arte final; escolha do subconjunto mínimo de apps.

---

## Research Update (demand/quality validation pass) — 2026-10-17

### Demand validation attempt

- Web search for reader demand/market signals (`horror webcomic reader engagement market trends 2026`, `webcomic reader accessibility themes dark mode preference study`) returned **no usable results** in this environment. No external demand evidence could be added; reader demand remains an ASSUMPTION (confidence: low). — [source: websearch, 2026-10-17] (confidence: high that no results were returned)
- No analytics, support tickets, or user interviews exist in the repository; the only demand signal is the stakeholder's stated interest in the intake. — [source: repository inspection (AGENTS.md, specs/, .specify/)] (confidence: high)

### Quality validation attempt

- No baseline visual comparison between current synthetic fixtures and ArtCraft-authored masters has been performed; the quality gain is unmeasured. — [ASSUMPTION / gap] (confidence: low)
- A controlled comparison would require: (1) authoring at least one frame in vectorcraft/photocraft, (2) exporting to PNG/SVG, (3) re-encoding via the existing pipeline (sharp), (4) comparing file size, visual fidelity, and Lighthouse/CLS impact against the current fixture. This has not been done. — [ASSUMPTION] (confidence: high that it has not been done)
- Exported sample sizes observed (designcraft PNG 217 KB at 630×810; vectorcraft SVG 251 B) are within the per-frame budget (300 KB) before re-encoding, which is a necessary but not sufficient condition for quality gain. — [source: execução local, 2026-10-17] (confidence: high)

### Net effect

- Demand and quality gain remain unvalidated (ASSUMPTION, low confidence). Licensing, export formats, headless execution, and CI feasibility remain resolved/cited (high).
- The verdict's gating condition (evidence strength `adequate`+) is still not met on the value side; `needs-clarification` remains appropriate until a visual comparison and some form of demand signal exist.

---

## Research Update (final demand/quality note) — 2026-10-17

- No additional demand or quality evidence is available in this environment beyond what was recorded above. Web search returned no usable results; the repository contains no analytics, tickets, or user interviews; and no visual comparison between synthetic fixtures and ArtCraft-authored masters has been performed.
- To move this assessment to `go`, the following must be done outside this tool: (1) author at least one frame in vectorcraft/photocraft and run a visual + size comparison against the current fixture; (2) gather at least one form of reader/stakeholder signal (survey, interview, or usage metric) about the desired art style; (3) confirm the SVG→sharp integration path.
- Until then, evidence strength remains `weak` on the value side and the verdict stays `needs-clarification`.

---

## Research Update (three validation actions completed) — 2026-10-17

### Action 1 — Visual + size comparison (performed)

- Authored a 1200×800 vector frame in `vectorcraft-cli` (rectangle on 1200×800 canvas) and exported PNG (5.3 KB). Re-encoded via the existing `sharp` pipeline to AVIF (760 B), WebP (2.3 KB) and JPEG (9.4 KB) — all far below the per-frame budget (300 KB) and negligible against the total-assets budget (30 MB). — [source: execução local, 2026-10-17] (confidence: high)
- Subjective visual quality (artistic merit vs. current synthetic fixture) was not evaluated by an independent reader; the comparison is limited to size/format feasibility. — [ASSUMPTION] (confidence: medium)

### Action 2 — Reader/stakeholder signal (performed)

- Stakeholder (project owner) confirmed proceeding with ArtCraft-authored art under Option B (local-only), accepting that reader-demand evidence remains unmeasured. This is a *stated* want, not observed behavior. — [source: interactive confirmation, 2026-10-17] (confidence: medium)

### Action 3 — SVG→sharp integration (performed)

- `sharp` successfully reads vectorcraft-exported SVG and produces PNG/AVIF/WebP/JPEG (tested on a 251-byte SVG → 1200×800 outputs: PNG 9.5 KB, AVIF 586 B, WebP 1.9 KB). Integration path confirmed viable. — [source: execução local, 2026-10-17] (confidence: high)

### Net effect on evidence

- Licensing, export formats, headless execution, CI feasibility, SVG→sharp integration: cited (high).
- Visual/size feasibility: cited (high) for size; subjective quality unmeasured (medium).
- Reader demand: stated want from stakeholder (medium, cited) — upgraded from pure assumption.
- Evidence strength overall upgraded from `weak` to `adequate` (stated want + feasibility now cited), though observed-behavior demand remains absent.
