# Delivery Standards

## Ambiente de build

Todo script do repositório usa apenas ferramentas declaradas: dependências de
projeto fixadas em `package.json`/`package-lock.json` e executáveis de host
verificados por `npm run preflight` (`scripts/preflight.mjs`). O preflight é
determinístico — ordem fixa de checagens, sem carimbo de tempo, saída estável —
e imprime, para cada falha, o comando de correção.

| Ferramenta | Piso | Executável | Usada por |
| --- | --- | --- | --- |
| Node.js | 20.0.0 | `node` | todos os scripts |
| npm | 10.0.0 | `npm` | todos os scripts, `lhci`, `npx playwright install` |
| Node.js | 20 ou superior | `node` | `npm run serve`, `webServer` de `playwright.config.js` (via `scripts/serve-e2e.mjs`) |
| ffmpeg (com `aac` e `libopus`) | 5.0.0 | `ffmpeg` | `npm run build:images` |
| ffprobe | 5.0.0 | `ffprobe` | `npm run build:images`, `npm run build` |
| Chromium, Firefox, WebKit | revisão do Playwright fixado | downloads do Playwright | `npm test`, `npm run test:e2e`, `npm run test:perf` |
| Bibliotecas de sistema dos navegadores | exigidas pelo WebKit, Firefox e Chromium | `sudo npx playwright install-deps` | `npm test`, `npm run test:e2e`, `npm run test:perf` |
| Chrome ou Chromium | versão atual | `CHROME_PATH` ou `PATH` | `npm run lhci` |
| Lighthouse CI | 0.14.0 | `node_modules/.bin/lhci` | `npm run lhci` |

A checagem de navegadores tem duas etapas: `playwright-browsers` exige que o
executável de cada projeto de `playwright.config.js` exista em disco, e
`browser-launch` abre e fecha cada navegador em modo headless. A segunda etapa
existe porque um binário baixado que não inicia — por falta de bibliotecas do
sistema, como `libicu74` e `libjpeg-turbo8` no WebKit — reprova toda a suíte com
uma mensagem genérica; o preflight reporta o erro de inicialização original e o
comando `sudo npx playwright install-deps` antes de qualquer teste rodar.

O preflight também exige que:

- toda dependência e `devDependency` de `package.json` seja uma versão exata
  (`1.2.3`), sem `^`, `~`, `*`, `x`, `latest` ou alias;
- as versões em `node_modules` coincidam com os pinos;
- `package-lock.json` exista e reflita os pinos na raiz e em cada
  `node_modules/<nome>`;
- `package.json` declare `engines.node` compatível com o piso de Node do preflight;
- `scripts.preflight` rode `node scripts/preflight.mjs` e `scripts.ci` encadeie
  `preflight`, `validate`, `test:unit`, `build:images`, `build`, `test:e2e` e
  `test:perf` apenas com `&&`, sem `|| true`, `exit 0`, `--pass-with-no-tests`
  nem `&` final, para que nenhum portão de navegador ou de referência fique
  oculto.

Versões exatas do toolchain: `@lhci/cli` 0.14.0, `@playwright/test` 1.63.0,
`ajv` 8.20.0, `ajv-formats` 3.0.1, `esbuild` 0.24.2 e `sharp` 0.33.5.

Provisionamento de um host novo:

```bash
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run preflight
```

## Navegadores

A matriz de aceite cobre as últimas versões de Chrome, Firefox e Safari desktop, além de Chrome e Safari móveis. A validação automatizada usa os projetos Playwright em `playwright.config.js`; Safari e dispositivos móveis devem receber uma passagem manual em hardware real.

Os projetos automatizados são `mobile-chromium` (Pixel 5), `mobile-webkit` (iPhone 14), `desktop-chromium`, `desktop-firefox` e `desktop-webkit`.

## Imagens

- AVIF é a fonte primária, WebP é a fonte intermediária e JPEG é o fallback.
- A dimensão máxima é 2560 px no lado maior, mas nenhuma variante é ampliada acima do master: um `srcset` só anuncia larguras que o master realmente preenche (T217). Com masters de 1200 px, o conjunto publicado é 320/640/960/1200 e nada além disso.
- A variante padrão usa AVIF com qualidade aproximada de 50, WebP 75 e JPEG 80.
- A variante de economia de dados tem lado maior de até 1280 px e no máximo 150 KB por quadro.
- `scripts/build-images.mjs` gera as variantes e `npm run validate` confirma que as referências do manifesto existem.
- O build de mídia **falha** quando não encontra nenhum master em `media-src/frames/*.svg|png|jpe?g` nem em `media-src/audio/*.wav`, em vez de reportar sucesso sem ter gerado nada (T207). Os masters precisam estar versionados para que os arquivos publicados sejam reproduzíveis.
- As duas árvores são distintas por contrato. `media-src/` guarda os masters e nunca é publicada; `assets/` é a árvore publicável e contém apenas arquivos referenciados pelo manifesto e codificados para entrega. O build recusa publicar em `assets/` qualquer arquivo que o manifesto não referencie, e recusa publicar WAV não comprimido, então os masters não podem viver ali. `scripts/build.mjs` só varre `assets/` (`PUBLISHABLE_ROOTS = ['src', 'assets']`), e `media-src/` fica fora do que é copiado para `dist/`.
- Os quadros publicados hoje são fixtures sintéticas de 1200×800 (~0,19 bit/pixel), promovidas a master a partir das variantes já publicadas. Um build de mídia verde certifica que o pipeline reproduz os seus próprios fixtures — não que a arte final seja reproduzível.

## Áudio

As trilhas são AAC/Opus entre 96 e 128 kbps. A variante de economia de dados usa 48–64 kbps. O player pré-cria os elementos de cena e quadro, respeita a política de reprodução automática e mantém o fallback silencioso quando um arquivo falha.

A variante de economia é derivada por substituição de nome (`scene-01.aac` → `scene-01-light.opus`), o mesmo vale para as imagens (`frame-01-1200.avif` → `frame-01-light-1200.avif`). Nenhum desses arquivos derivados aparece no manifesto: a resolução acontece em `src/scripts/audio.js` e `src/scripts/player.js`.

## Orçamentos

Os limites são **decimais** (KB = 1000 B, MB = 1000000 B), iguais aos números literais de `spec.md` FR-029 e do plano. Os valores em `budget.json` são os que o build aplica:

| Métrica | Limite | Bytes |
|---|---|---|
| Cena inicial | 1,5 MB | 1500000 |
| Quadro | 300 KB | 300000 |
| Ativos totais | 30 MB | 30000000 |
| JavaScript comprimido | 50 KB | 50000 |
| CSS comprimido | 15 KB | 15000 |
| Código comprimido total | 65 KB | 65000 |

- O build mede JS e CSS com gzip e falha quando os limites são excedidos.
- CLS: inferior a 0,1.
- Primeiro quadro frio: inferior a 2,5 s p75 em 4G de referência (SC-019).
- Primeiro quadro morno (warm): inferior a 1,5 s p75 (SC-008).
- Cada quadro da produção: inferior a 3 s em 4G fria p75 (SC-008).
- Lighthouse (`lighthouserc.json`, aplicado por `npm run ci:lighthouse`): performance ≥ 0,9, acessibilidade ≥ 0,95, LCP ≤ 2500 ms.

`npm run build` falha quando o código ultrapassa os limites ou quando encontra uma origem HTTP externa em HTML, CSS ou JavaScript.

## Validação

```bash
npm run preflight
npm run ci
npm run ci:lighthouse
```

`npm run ci` executa, em ordem e com falha imediata: `preflight`, `validate`,
`test:unit`, `build:images`, `build`, `test:e2e` e `test:perf`. A suíte de
navegador e o gate de referência (origem externa) permanecem obrigatórios; se um
executável de Playwright faltar, o preflight interrompe a cadeia em vez de
reportar sucesso parcial. `npm run ci:lighthouse` roda `lhci autorun` contra
`dist` e exige Chrome.

O workflow `.github/workflows/ci.yml` executa esse mesmo portão na ordem acima,
mais o Lighthouse, a cada push e pull request, e anexa o relatório do Playwright
e a saída do Lighthouse como artefatos quando há falha.

Os cenários manuais VS-1 a VS-10 e as passagens por navegador em hardware real
estão descritos em `specs/001-cinematic-player/quickstart.md`. A matriz inclui
recarga, rotação, teclado, toque, áudio bloqueado, dados simulados, armazenamento
indisponível, múltiplas abas, manifesto inválido e fim da narrativa.

## Privacidade

O player não envia dados a servidores, não usa rastreadores, fontes remotas, CDNs ou scripts de terceiros. A única persistência é local e usa as chaves `hwc.*`.
