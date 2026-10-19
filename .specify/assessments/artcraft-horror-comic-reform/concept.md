# Concept: Reformular o horror web comic com a suite ArtCraft

- **Slug**: artcraft-horror-comic-reform
- **Created**: 2026-10-17T05:35:00Z
- **Recommended option**: Option B — Adoção limitada como ferramentas de autoria (local-only)

## Options

### Option A — Status quo (não adotar a suíte)
- **Sketch**: Manter o pipeline atual (`sharp` + `ffmpeg`), os masters em `media-src/` e os fixtures sintéticos; a suíte ArtCraft não entra no repositório nem no build. A melhoria de qualidade da arte, se houver, ocorre fora do projeto, manualmente.
- **Appetite**: small (days)
- **Trade-offs**: Ganha zero risco de CI/licenciamento/constituição e preserva todos os portões atuais. Sacrifica a oportunidade de elevar a qualidade da arte e de reduzir o trabalho manual; não resolve a dependência de fixtures sintéticos.
- **Rabbit holes**: Nenhum significativo; risco é apenas de estagnação da qualidade visual.

### Option B — Adoção limitada como ferramentas de autoria (local-only)
- **Sketch**: Usar um subconjunto pequeno e justificado da suíte (por exemplo, `vectorcraft` para ilustração/vetor e `photocraft` para tratamento de imagem) como ferramentas de autoria externas, cujas saídas são exportadas para `media-src/` nos formatos já aceitos (SVG/PNG/JPG/WAV). O pipeline de build (`build:images`, `build`) permanece inalterado e continua a gerar variantes AVIF/WebP/JPEG e áudio AAC/Opus. Nenhum binário é adicionado ao repositório ou ao CI; os autores documentam a versão da ferramenta usada.
- **Appetite**: small (days) a medium (weeks), conforme o número de apps e a disciplina de exportação
- **Trade-offs**: Ganha melhoria de qualidade da arte e redução de trabalho manual, com risco de CI/licenciamento baixo (ferramentas ficam fora do pipeline). Sacrifica reprodutibilidade em CI (a arte depende do ambiente local do autor) e exige disciplina para manter formato/dimensões/orçamentos.
- **Rabbit holes**: Formatos de exportação que não casam com o contrato do manifesto (dimensões, nomenclatura, light variants); tentação de adicionar mais apps "já que estamos usando"; drift de versão entre autores.

### Option C — Integração completa no pipeline de build
- **Sketch**: Integrar CLIs selecionados ao `build:images`/`build`, pinar versões dos binários, instalar/cacheá-los no CI, gerar masters e variantes automaticamente a partir de fontes de autoria, e validar orçamentos no build.
- **Appetite**: large (months)
- **Trade-offs**: Ganha reprodutibilidade e automação end-to-end. Sacrifica simplicidade, tempo de CI, compatibilidade de licenciamento (Apache 2.0), e arrisca violar a constituição (especialmente se incluir filmcraft/effectcraft com saída de vídeo).
- **Rabbit holes**: Instalação de binários de ~90–125 MB em runners; pinagem e versionamento de ferramentas nativas fora do npm; quebras por mudança de CLI upstream; conformidade com o Princípio II; custo de manutenção de 13+ integrações.

## Recommendation

Recomendo a **Option B**, porque ela endereça o objetivo de elevar a qualidade da arte e reduzir o trabalho manual com o menor risco, sem tocar no runtime, no CI nem nos portões de orçamento, e sem violar a constituição. A Option C só se justifica após a Option B provar valor e após resolver as lacunas de CI/licenciamento; a Option A é o fallback seguro caso a adoção não demonstre ganho mensurável. Recomendo também **não** prosseguir com a "reformulação completa" como formulada na intake: o escopo indefinido e os riscos de CI/licenciamento não sustentam uma reescrita ampla neste momento.

## Out of Scope (for the recommended option)

- Integração de CLIs no pipeline de CI ou no `build:images`/`build`.
- Adoção de filmcraft/effectcraft (saída de vídeo/motion) no runtime (Princípio II).
- Adoção de todos os apps da suíte; apenas subconjunto justificado.
- Mudança do schema v1 do manifesto ou do player.
- Embutir ou versionar binários da suíte no repositório.

## Assumptions to Validate

- Os apps selecionados exportam nos formatos/dimensões aceitos por `media-src/` e pelo manifesto (SVG/PNG/JPG/WAV).
- A qualidade da arte melhora de forma mensurável (avaliação visual) com o uso da suíte.
- Autores conseguem manter a disciplina de exportação (dimensões ≤ 2560 px, nomenclatura, light variants) sem automação.
- A versão da ferramenta usada pode ser registrada de forma simples (ex.: nota no commit/asset) para rastreabilidade.
- Licenciamento Apache 2.0 não impede a redistribuição dos ativos gerados (a confirmar).

---

## Concept Update (deep pass) — 2026-10-17

### Refined recommendation (unchanged): Option B — Adoção limitada como ferramentas de autoria (local-only)

Novas evidências (licenciamento MIT disponível; exportação headless validada dentro do orçamento por quadro; portabilidade WASM) reforçam a Option B e reduzem os riscos da Option C, mas não a tornam viável no curto prazo (binários de ~90–125 MB, pinagem, manutenção).

### Adjusted assumptions (post deep pass)

- Licenciamento não é mais bloqueante: pode-se adotar a opção MIT da suíte.
- Formato de exportação validado: PNG (designcraft) e SVG (vectorcraft) gerados headless; re-codificação para AVIF/WebP/JPEG via pipeline existente (sharp) é o caminho para cumprir srcset/AVIF. Integração SVG→sharp a confirmar.
- Demanda e ganho de qualidade mensurável permanecem não validados (ASSUMPTION, confidence low); a Option B deve incluir uma avaliação visual comparativa antes de qualquer compromisso de escopo maior.
- Subconjunto mínimo recomendado para validação: `vectorcraft` (ilustração/vetor → SVG/PNG) + `photocraft` (tratamento de imagem → PNG/WebP), mantendo `designcraft` opcional para layout de artes promocionais (fora do runtime).
