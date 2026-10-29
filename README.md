# horror-web-comic

Player cinematográfico de quadros em HTML, CSS e JavaScript vanilla. A experiência é estática, funciona sem backend e mantém a narrativa compreensível sem áudio.

## Pré-requisitos

Todo comando abaixo depende de um host provisionado. `npm run preflight` verifica
cada ferramenta antes de qualquer build ou teste e falha com a correção exata.

| Ferramenta | Versão mínima | Usada por | Instalação |
| --- | --- | --- | --- |
| Node.js | 20.0.0 | todos os scripts | `nvm install 20` |
| npm | 10.0.0 | todos os scripts | `npm install -g npm@latest` |
| Python 3 | 3.10.0 | `npm run serve`, `webServer` do Playwright | `sudo apt-get install -y python3` / `brew install python3` |
| ffmpeg | 5.0.0 com encoders `aac` e `libopus` | `npm run build:images` | `sudo apt-get install -y ffmpeg` / `brew install ffmpeg` |
| ffprobe | 5.0.0 | `npm run build:images`, `npm run build` | `sudo apt-get install -y ffmpeg` / `brew install ffmpeg` |
| Chromium, Firefox, WebKit | mesma revisão do Playwright fixado | `npm test`, `npm run test:e2e`, `npm run test:perf` | `npx playwright install --with-deps chromium firefox webkit` |
| Bibliotecas de sistema dos navegadores | exigidas pelo WebKit, Firefox e Chromium | `npm test`, `npm run test:e2e`, `npm run test:perf` | `sudo npx playwright install-deps` |
| Chrome ou Chromium | qualquer versão atual | `npm run lhci` | instalar Google Chrome ou exportar `CHROME_PATH` |

O preflight não se limita a localizar os executáveis: ele abre e fecha cada
navegador da matriz em modo headless e falha quando o binário foi baixado mas não
inicia por falta de bibliotecas do sistema.

As ferramentas de build e de auditoria são instaladas pelo próprio projeto, com
versões exatas em `package.json` e `package-lock.json`: `@lhci/cli` 0.14.0,
`@playwright/test` 1.63.0, `ajv` 8.20.0, `ajv-formats` 3.0.1, `esbuild` 0.24.2 e
`sharp` 0.33.5. Nada usa intervalo semver: toda dependência é fixada e o
preflight falha se `package.json`, `package-lock.json` e `node_modules` divergirem.

## Desenvolvimento

```bash
npm ci
npx playwright install --with-deps chromium firefox webkit
npm run preflight
npm run serve
```

Abra `http://127.0.0.1:8080`. Para validar o manifesto, executar a suíte ou criar a distribuição:

```bash
npm run preflight
npm run validate
npm run test:unit
npm run build:images
npm run build
npm test
```

O servidor de desenvolvimento é estático. O build de produção minifica os módulos, copia o manifesto e os assets, verifica referências externas e aplica os limites de código em `budget.json`.

## Verificação completa

```bash
npm run preflight
npm run ci
```

`npm run ci` encadeia com `&&` e sem mascarar falhas: `preflight`, `validate`,
`test:unit`, `build:images`, `build`, `test:e2e` e `test:perf`. Os portões de
navegador e de referência não são ignorados: se faltar um executável de
Playwright, o preflight interrompe a cadeia. O gate do Lighthouse é separado,
porque exige o Chrome e uma execução mais longa:

```bash
npm run ci:lighthouse
```

O preflight também é documentado em `docs/delivery.md`.

O workflow `.github/workflows/ci.yml` executa esse mesmo portão mais o
Lighthouse a cada push e pull request, e anexa o relatório do Playwright e a
saída do Lighthouse como artefatos quando há falha.

## Estrutura

- `index.html`: casca semântica, controles, overlays e regiões acessíveis.
- `src/data/story.json`: manifesto narrativo.
- `src/scripts/`: player, áudio, persistência, loader, capacidades e acessibilidade.
- `src/styles/`: tokens, reset e layout responsivo.
- `tests/e2e/`: fluxos de usuário, áudio, navegação, responsividade e acessibilidade.
- `tests/perf/`: orçamento de chegada e amostragem de FPS.
- `scripts/`: preflight de ferramentas, validação de manifesto, imagens e build.

## Controles

`Space` ou `K` pausa/retoma; setas navigam; `Shift` + setas saltam cenas; `Home` e `End` vão ao início e ao fim; `M` alterna o áudio. Todos os comandos também possuem controles visíveis com alvo mínimo de 44 px.

A preferência de áudio, volume, velocidade e posição de leitura é local ao navegador. Se o armazenamento estiver indisponível, o player continua em memória. A posição sincroniza entre abas por `BroadcastChannel`, com fallback para `storage`.

## Entrega

Consulte `docs/delivery.md` para a matriz de navegadores, formatos de mídia, orçamento de desempenho e verificações de publicação.

## Relatório de compatibilidade

`npm run report` audita um manifesto narrativo contra o schema desta Distribuição e emite um relatório legível, sem executar build, navegador ou codificação de mídia:

```bash
npm run report
npm run report -- ../outro-projeto/src/data/story.json
npm run report -- ../outro-projeto/src/data/story.json --root ../outro-projeto
npm run report -- manifest.json --json
npm run report -- manifest.json --out relatorio.md
```

O relatório cobre estrutura, schema, portabilidade das referências, inventário de assets, variantes leves (`-light-*`), orçamento de entrega e metadados de acessibilidade. Ele **não** substitui `npm run build`: navegador, Lighthouse, FPS e conformidade WCAG não são verificáveis a partir do manifesto. O código de saída é `0` quando o manifesto é compatível e `1` quando há erros, então o comando também serve como portão em CI.

A documentação comercial que acompanha esta ferramenta está em `docs/monetization/`.

## Licença

MIT. Consulte `LICENSE`.

