# Data Model: Player Cinematográfico de Quadros

**Feature**: `001-cinematic-player` | **Date**: 2026-09-23

Modelo de dados derivado do spec. O conteúdo narrativo é carregado de um
manifesto JSON e validado; o estado de execução e a persistência vivem no
navegador.

## Entidades de conteúdo

### Story (Sequência)

Representa a narrativa linear completa.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `schemaVersion` | inteiro | sim | Versão do schema do manifesto (const 1) |
| `id` | string | sim | Identificador único da história |
| `title` | string | sim | Título da história |
| `defaultFrameDurationMs` | inteiro 500–30000 | não | Ritmo padrão de exibição por quadro (padrão `1500`) |
| `defaultTransition` | `Transition` | não | Transição padrão da história (FR-002) |
| `scenes` | `Scene[]` | sim | Cenas em ordem narrativa (≥ 1) |

### Scene (Cena)

Agrupamento narrativo de quadros com ritmo/atmosfera próprios.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | string | sim | Identificador único da cena |
| `title` | string | sim | Título/rotulo da cena |
| `defaultFrameDurationMs` | inteiro 500–30000 | não | Ritmo padrão da cena (sobrescreve a história) |
| `defaultTransition` | `Transition` | não | Transição padrão da cena (sobrescreve a história) |
| `audio` | `AudioTrack` | não | Ambiente/trilha da cena |
| `frames` | `Frame[]` | sim | Quadros em ordem (≥ 1) |

### Frame (Quadro)

Unidade narrativa; um passo de navegação.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | string | sim | Identificador único global do quadro |
| `image` | `ImageAsset` | sim | Fontes responsivas e dimensões |
| `description` | string | sim | Descrição narrativa detalhada (equivalente visual; inclui pistas sonoras relevantes à narrativa) |
| `alt` | string | sim | Alt curto obrigatório (FR-012) |
| `durationMs` | inteiro 500–30000 | não | Ritmo específico do quadro (sobrescreve cena/história) |
| `transition` | `Transition` | não | Transição de entrada do quadro (sobrescreve cena/história) |
| `audio` | `AudioTrack` | não | Áudio do quadro, somado ao da cena (mix, FR-006) |

### Transition

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `type` | `cut` \| `fade` \| `zoom-in` \| `zoom-out` \| `dissolve` \| `slide-left` \| `slide-right` \| `none` | sim | Tipo de transição |
| `durationMs` | inteiro 0–2000 | não | Duração (padrão `600`); reduzido a `0` sob `prefers-reduced-motion` |
| `easing` | `linear` \| `ease-in` \| `ease-out` \| `ease-in-out` | não | Curva (padrão `ease-in-out`) |

### ImageAsset

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `avif` | string (URL) | sim | Fonte AVIF primária (caminho único) |
| `webp` | string (URL) | não | Fonte WebP intermediária (caminho único) |
| `fallback` | string (URL) | sim | Fonte JPEG de fallback (caminho único) |
| `avifSrcset` | string (width-srcset) | não | Candidatos AVIF responsivos — somente descritores de largura (`NNNw`) |
| `webpSrcset` | string (width-srcset) | não | Candidatos WebP responsivos — somente descritores de largura (`NNNw`) |
| `fallbackSrcset` | string (width-srcset) | não | Candidatos JPEG de fallback — somente descritores de largura (`NNNw`) |
| `srcset` | string (legado) | não | Conjunto legado de candidatos (permissivo — aceita descritores `w`/`x`/`h`); usado como reserva quando `avifSrcset`/`webpSrcset`/`fallbackSrcset` estão ausentes (`resolveImageSources`) |
| `sizes` | string | não | Expressão de tamanhos de exibição |
| `width` | inteiro > 0 | sim | Largura intrínseca (evita CLS) |
| `height` | inteiro > 0 | sim | Altura intrínseca |

### AudioTrack

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | string | sim | Identificador da trilha |
| `src` | string (URL) | sim | Fonte de áudio (AAC/Opus, 96–128 kbps; variante ~48–64 kbps sob economia de dados) |
| `loop` | boolean | não | Repetição contínua (padrão `true`) |
| `volume` | número 0–1 | não | Volume base (padrão `0.6`), multiplicado pelo volume do usuário |

> **Mix quadro + cena (FR-006)**: quando um quadro tem `audio`, a trilha da cena
> continua em loop e a do quadro é somada; a cena é atenuada (*ducking*) para 40%
> enquanto o áudio do quadro toca, com crossfade de 300 ms na entrada/saída do
> quadro. No limite entre cenas, crossfade de 500 ms. Ao religar o áudio pelo
> controle, a trilha retoma da posição com fade-in ≤300 ms; a parada é ≤100 ms.

## Entidades de execução

### PlayerState (não persistido, exceto progresso)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `status` | `idle` \| `playing` \| `paused` \| `ended` | Situação da reprodução |
| `currentFrameIndex` | inteiro | Índice global do quadro corrente |
| `currentSceneIndex` | inteiro | Índice da cena corrente |
| `lastFrameDurationMs` | inteiro | Duração efetiva do quadro corrente |

> **Nota**: `status` não é persistido. Ao carregar, o player inicia em `playing`
> (avanço automático) no quadro retomado; a pausa é apenas de sessão (FR-019).
> Pausar interrompe o avanço automático **e** o áudio da cena; retomar continua a
> trilha da posição em que parou (FR-013).

### PersistedState (localStorage)

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `audioEnabled` | boolean | `true` | Preferência de áudio do usuário |
| `volume` | número 0–1 | `0.6` | Volume escolhido pelo usuário (FR-020) |
| `speed` | `0.5` \| `1` \| `2` | `1` | Velocidade de exibição (FR-021) |
| `lastFrameId` | string \| null | `null` | Quadro onde o usuário parou |
| `updatedAt` | string (ISO) | — | Momento da última gravação (usado na sincronização entre abas) |
| `schemaVersion` | inteiro | `1` | Versão do formato persistido |

> **Nota**: o campo `sceneId` foi removido do progresso persistido; as regras de
> retomada usam apenas `lastFrameId` (FR-019). O **storage contract é a fonte
> canônica** da representação gravada (`hwc.audio` como `"on"`/`"off"`, valores
> numéricos em string e as cinco chaves `hwc.*`); o `PersistedState` acima é a
> projeção em memória dessa representação. Mapeamento: `hwc.audio`→`audioEnabled`,
> `hwc.volume`→`volume`, `hwc.speed`→`speed`, `hwc.progress.frameId`→`lastFrameId`,
> `hwc.progress.updatedAt`→`updatedAt`, `hwc.schemaVersion`→`schemaVersion`.

## Regras de validação

- `Story.scenes` e `Scene.frames` DEVEM ter ao menos um item.
- `Frame.id` DEVE ser único em toda a história (verificado no build/CI, não pelo
  schema — FR-025).
- Todo `Frame` DEVE ter `description` não vazia e `alt` não vazio (FR-012).
- Todo `durationMs`/`defaultFrameDurationMs` DEVE estar entre 500 e 30000 ms.
- `Transition.type` DEVE pertencer ao enum; `durationMs` entre 0 e 2000.
- `ImageAsset.width` e `height` DEVEM ser > 0 (FR-015).
- `ImageAsset.avifSrcset`, `webpSrcset` e `fallbackSrcset`, quando presentes, DEVEM usar somente descritores de largura (`NNNw`, um por candidato — padrão `widthSrcset` do schema); `ImageAsset.srcset` (legado, opcional) permanece permissivo e pode usar descritores de largura, densidade ou altura.
- `resolveImageSources`: `avif` efetivo = `avifSrcset` ?? `srcset` legado ?? `avif` (quando o caminho termina em `.avif`); `webp` efetivo = `webpSrcset` ?? `srcset` legado ?? `webp` (quando termina em `.webp`); `fallback` efetivo = `fallbackSrcset` ?? `srcset` legado.
- Toda referência de áudio/imagem DEVE apontar para um arquivo existente
  (verificado no build/CI — FR-025).
- Duração efetiva de um quadro: `frame.durationMs` ?? `scene.defaultFrameDurationMs`
  ?? `story.defaultFrameDurationMs` ?? `1500`, dividida pela velocidade do usuário
  (FR-018, FR-021), com piso de `250` ms. A velocidade afeta apenas a permanência;
  as transições mantêm a duração configurada. Para a linha de base de SC-001,
  considera-se ritmo padrão de 1.500 ms por quadro.
- Transição efetiva (`resolveTransition`): mescla `frame.transition` sobre `scene.defaultTransition` sobre `story.defaultTransition` sobre `fade` 600 ms `ease-in-out` (precedência quadro → cena → história → padrão; FR-002); sob `prefers-reduced-motion`, força-se `type: cut`, `durationMs: 0` (FR-011); sob degradação de capacidades (`shouldDegrade`), qualquer tipo diferente de `cut`/`none` vira corte instantâneo (`type: cut`, `durationMs: 0`, `easing: linear`). A velocidade não altera as transições.
- Manifesto ausente/malformado/inválido ou com `schemaVersion` incompatível DEVE
  ser rejeitado com tela de erro controlada (FR-023, FR-024).
- `PersistedState.lastFrameId` inexistente/inválido DEVE ser ignorado e a
  narrativa reiniciada do primeiro quadro.
- `PersistedState` com `schemaVersion` incompatível DEVE ser descartado e
  recriado.

## Transições de estado do player

| De | Evento | Para |
|----|--------|------|
| `idle` | iniciar | `playing` |
| `playing` | duração do quadro esgota | `playing` (próximo quadro) |
| `playing` | fim do último quadro | `ended` (overlay "fim da narrativa" + "Rever do início") |
| `playing` | pausar / interação de navegação / perda de foco da aba | `paused` |
| `paused` | play / retomar | `playing` |
| `paused` \| `playing` | próximo/anterior/salto de cena/voltar ao início/ir ao fim | `paused` (reposicionado) |
| `playing` \| `paused` | autoplay de áudio bloqueado | inalterado, estado de áudio = `blocked` |
| `paused` | qualquer gesto qualificado com áudio bloqueado | `paused`, estado de áudio = `on` |
| `playing` \| `paused` | velocidade alterada (0,5x/1x/2x) | inalterado (recalcula duração efetiva) |
| `ended` | reiniciar ("Rever do início") ou "ir ao início" | `playing` (primeiro quadro) |
| `ended` | navegação manual que altera a posição (próximo/anterior/salto de cena) | `paused` (reposicionado; sai do estado final) |
| `ended` | navegação no-op (próximo no último quadro) | `ended` (inalterado) |

**Notas**: por decisão de sessão, navegação manual pausa o avanço automático;
retomar é explícito (FR-013, FR-017). Ao perder o foco da aba o player vai para
`paused`; ao voltar, um overlay exige ação explícita de retomada (FR-013). Pausar
(por controle, navegação ou perda de foco) pausa também o áudio da cena, e a
retomada continua o áudio da posição em que parou (FR-013). O estado de pausa não
é persistido: ao recarregar, o player volta a `playing` no quadro retomado
(FR-019). O progresso é gravado no avanço automático e em pausa/navegação, e
sincronizado entre abas (FR-019, FR-030).
