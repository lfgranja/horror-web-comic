# UI Contract: Player Cinematográfico de Quadros

**Feature**: `001-cinematic-player` | **Date**: 2026-09-23

Contrato de interface entre o player e o usuário (controles, teclado e
acessibilidade). Define comportamento observável, não implementação.

## Controles visíveis

| Controle | Ação | Requisito | Estado visível |
|----------|------|-----------|----------------|
| Play/Pausar | Inicia/interrompe o avanço automático e o áudio da cena | FR-013, FR-017 | Ícone alterna |
| Próximo quadro | Avança um quadro (pausa o automático) | FR-003 | — |
| Quadro anterior | Retrocede um quadro (pausa o automático) | FR-003 | — |
| Próxima cena | Salta ao primeiro quadro da cena seguinte | FR-003, SC-011 | — |
| Cena anterior | Salta ao primeiro quadro da cena anterior | FR-003, SC-011 | — |
| Voltar ao início | Retorna ao primeiro quadro | FR-003, SC-011 | — |
| Ir ao fim | Salta ao último quadro | FR-003, SC-011 | — |
| Alternar áudio | Liga/desliga o áudio imediatamente | FR-005, FR-006, FR-014 | Ligado/desligado/bloqueado |
| Volume | Ajusta o volume (0–100%) | FR-020 | Nível atual |
| Velocidade | Alterna 0,5x / 1x / 2x | FR-021 | Velocidade atual |
| Barra/indicador de progresso | Mostra posição na narrativa (informativo, não interativo) | FR-034 | Posição atual |

Todos os controles DEVEM ser alcançáveis por toque e por teclado, com foco
visível (`:focus-visible`), alvo de toque ≥44×44 px (AAA), rótulo/nome acessível
e sem dependência exclusiva de hover. Os controles de áudio (FR-005) e de
play/pausar (FR-013) DEVEM permanecer sempre acessíveis durante toda a
experiência, fixados em uma barra de controles persistente e sensível a áreas
seguras (notch). Salto de cena no primeiro/último limite é no-op; navegação
durante uma transição cancela a transição e reposiciona; entradas repetidas são
coalescidas em uma janela de 400 ms (a última prevalece) (FR-003). Ao atingir o
fim, um overlay acessível "fim da narrativa" oferece "Rever do início"; os
controles de navegação permanecem disponíveis e, ao serem acionados, deixam o
estado final (FR-033). Pausar interrompe o avanço automático e o áudio da cena;
retomar continua o áudio da posição em que parou (FR-013). O estado de pausa NÃO
é persistido: ao reabrir, a narrativa retoma no quadro salvo e volta a avançar
automaticamente (FR-019).

## Atalhos de teclado

| Tecla | Ação |
|-------|------|
| `Espaço` / `K` | Play/Pausar |
| `→` | Próximo quadro |
| `←` | Quadro anterior |
| `Shift` + `→` | Próxima cena |
| `Shift` + `←` | Cena anterior |
| `Home` | Voltar ao início |
| `End` | Ir ao fim |
| `M` | Alternar áudio |

Os atalhos têm precedência sobre os padrões do navegador (ex.: `Espaço`,
setas, `Home`/`End`): o `keydown` DEVE chamar `preventDefault()` no elemento do
player para evitar rolagem/deslocamento de foco, mantendo a operabilidade por
teclado (FR-010). O atalho de velocidade não é mapeado por tecla; usa-se o
controle visível.

## Comportamento de áudio

- O áudio inicia **ativo por padrão** (FR-004).
- Pausar (incl. perda de foco da aba) pausa também o áudio da cena; retomar
  continua a trilha da posição em que parou (FR-013, SC-009).
- Se o navegador bloquear a reprodução automática, permanece silencioso, exibe um
  overlay "toque para iniciar" que oferece a ação "continuar sem som" (que **não**
  ativa o áudio) e **qualquer outro gesto qualificado** (`click`, `touchend`,
  `keydown`) ativa o som; nenhuma mensagem de erro é exibida (FR-016).
- Desligar aplica corte imediato com micro-rampa anti-clique (conclusão ≤100 ms),
  sem reiniciar a cena; ao religar, a trilha retoma da posição em que estava com
  fade-in de ≤300 ms (FR-006).
- No limite entre cenas há crossfade de ≤500 ms; cena sem trilha silencia o áudio
  (FR-006).
- Áudio de quadro soma-se ao da cena (mix), com ducking da cena para 40% e
  crossfade de 300 ms (FR-006).
- O controle de volume (0–100%) e o de velocidade (0,5x/1x/2x) são visíveis e
  persistidos (FR-020, FR-021).
- O estado é refletido visualmente e acessivelmente como **ligado/desligado/
  bloqueado** (FR-014) e persistido (FR-007).
- O controle de áudio atende ao WCAG 1.4.2 como mecanismo de parada do áudio
  automático >3 s (FR-005, FR-006).
- A ativação por gesto vale para a sessão (quadros e cenas seguintes); se a
  preferência persistida for "desligado", o gesto não a sobrepõe (FR-016).
- Para respeitar a política *per-element* do Safari/WebKit, os elementos de áudio
  (cena e quadro) são pré-criados e desbloqueados no primeiro gesto qualificado
  (chamada de reprodução síncrona no handler), evitando criar elementos após o
  gesto (FR-016).
- A trilha da cena corrente e da cena seguinte são pré-carregadas (FR-015).
- Se um arquivo de áudio falhar em runtime, permanece o silêncio sem erro e o
  estado do controle segue coerente (FR-032).

## Acessibilidade

- Região `aria-live="polite"` com `aria-atomic="true"` (ou `role="status"`)
  anuncia a descrição narrativa detalhada de cada quadro ao avançar, com
  *debounce* (mín. 500 ms) para evitar spam de anúncios; a região existe na
  árvore de acessibilidade antes da mudança e o foco não é movido para ela
  (FR-012). Com avanço automático ativo, as atualizações são coalescidas pelo
  debounce (anúncios consecutivos não se sobrepõem); o usuário pode pausar a
  qualquer momento.
- Cada imagem tem alt curto, e a descrição longa é associada via
  `aria-describedby`/região viva; texto embutido é reproduzido literalmente
  (FR-012).
- O indicador de progresso expõe semântica acessível (ex.: `role="progressbar"`
  com `aria-valuenow`/`aria-valuemin`/`aria-valuemax` e nome acessível), sendo
  informativo (FR-001).
- O estado do áudio expõe semântica acessível: botão de alternância com
  `aria-pressed` binário (ligado/desligado) e, no estado "bloqueado",
  `aria-disabled="true"` com rótulo fixo e anúncio via região `role="status"`
  (FR-014; WCAG 4.1.2/4.1.3). O rótulo do controle não muda entre estados.
- Sob `prefers-reduced-motion: reduce`, o avanço automático continua e todas as
  transições viram corte instantâneo; nenhuma animação (CSS ou dirigida por
  script) além de um quadro estático é executada (FR-011, SC-006).
- O idioma da página e das descrições é declarado (`lang`) (FR-012).
- A experiência é operável sem mouse/hover, com foco visível e alvos ≥44×44 px,
  e suporta zoom/resize de texto a 200% e reflow sem perda de conteúdo (FR-010,
  FR-009; WCAG 1.4.4/1.4.10).
- Contraste reforçado (alvo AAA) em texto e controles (SC-017).

## Responsividade

- Layout mobile-first utilizável de 320 px a 2560 px, em retrato e paisagem
  (FR-009, SC-005); em viewports menores que 320 px o layout permanece íntegro
  (sem rolagem horizontal) e em ultrawide a imagem é centralizada com letterbox.
- Sem rolagem horizontal e sem corte de enquadramento dos quadros: a imagem é
  exibida integralmente com `object-fit: contain`.
- A troca de orientação preserva o quadro corrente e não reinicia a narrativa
  (FR-009).
- Áreas seguras (notch) respeitadas via `env(safe-area-inset-*)`, com
  `viewport-fit=cover` (FR-009).
