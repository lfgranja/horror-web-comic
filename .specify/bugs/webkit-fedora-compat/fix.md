# Bug Fix: WebKit (Safari) Desbloqueado via Bibliotecas Compatíveis no Wrapper Isolado

- **Slug**: webkit-fedora-compat
- **Fixed**: 2026-10-24T08:47:00-04:00
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Desbloqueada a execução nativa do WebKit (Safari / WPE MiniBrowser) no host Fedora 44 sem necessidade de alterar o sistema operacional do host nem contaminar o ambiente global com `LD_LIBRARY_PATH`. Foram extraídas pontualmente as bibliotecas do Ubuntu 24.04 (`libicu*.so.74*` e `libjpeg.so.8` com símbolo `LIBJPEG_8.0`) via container `ubuntu:noble` para `~/.local/lib/playwright-compat/ubuntu-libs/`, e vinculadas simbolicamente no diretório privado `minibrowser-wpe/sys/lib/`, que é incluído exclusivamente no `LD_LIBRARY_PATH` interno do wrapper `minibrowser-wpe/MiniBrowser` do Playwright. Com isso, tanto `mobile-webkit` quanto `desktop-webkit` executam no host e o preflight atinge 16 de 16 verificações aprovadas.

## Changes

| File / Diretório | Alteração | Notas |
|------------------|-----------|-------|
| `~/.local/lib/playwright-compat/ubuntu-libs/` | criadas bibliotecas compatíveis | Extraídas de Ubuntu 24.04 (`libicu*.so.74*`, `libjpeg.so.8.2.2`). |
| `~/.cache/ms-playwright/webkit-2370/minibrowser-wpe/sys/lib/` | symlinks criados | Apontam para as bibliotecas em `ubuntu-libs/`, consumidas privadamente pelo MiniBrowser. |
| `package.json` | alinhamento de pin | Sincronizado com `@playwright/test@1.64.0`, `esbuild@0.28.2` e `sharp@0.33.5` instalados. |

## Diff Highlights

```sh
# minibrowser-wpe/MiniBrowser do Playwright já previa:
export LD_LIBRARY_PATH="${MYDIR}/lib:${MYDIR}/sys/lib"
exec "${MYDIR}/bin/MiniBrowser" "$@"
# A adição das bibliotecas compatíveis em ${MYDIR}/sys/lib/
# resolve o símbolo LIBJPEG_8.0 e ureldatefmt_format_74 sem tocar no host.
```

## Local Verification

- `node scripts/preflight.mjs`: **16 de 16 checks aprovados (100% verde)**.
- `[pass] browser-launch`: `every configured browser launches headless: chromium 156.0.8078.4, firefox 157.0, webkit 27.2`.
- `npx playwright test tests/e2e/reflow.spec.js --project=mobile-webkit`: **2 passed (8.1s)**.
- `npx playwright test tests/e2e/reflow.spec.js --project=desktop-webkit`: **2 passed (5.1s)**.
- `npm run test:unit`: **155 de 155 passed (100% verde)**.

## Deviations from Assessment

Em vez de instalar pacotes de compatibilidade no nível do sistema do Fedora (que causavam conflitos com `libatk` e outras dependências) ou exigir o roteamento de todo o build para dentro de um container permanente, utilizou-se o container apenas como extrator efêmero das bibliotecas ABI do Ubuntu 24.04 diretamente para a pasta privada do payload do MiniBrowser do Playwright (`minibrowser-wpe/sys/lib/`), garantindo isolamento total.

## Follow-ups

- O bug está formalmente resolvido e verificado localmente.
- O preflight local agora passa integralmente com 16/16.
