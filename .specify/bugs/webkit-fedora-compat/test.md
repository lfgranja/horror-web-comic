# Bug Verification: WebKit (Safari) Executando Nativamente no Host Fedora 44

- **Slug**: webkit-fedora-compat
- **Tested**: 2026-10-24T08:47:00-04:00
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

O bloqueio histórico do WebKit no host Fedora 44 (ausência de `LIBJPEG_8.0` e símbolos `_74` do ICU) foi completamente superado. O binário `minibrowser-wpe/MiniBrowser` do Playwright inicia perfeitamente em modo headless no Linux local, o check `browser-launch` do preflight foi aprovado reportando WebKit 27.2 e testes Playwright reais foram executados e aprovados tanto em `mobile-webkit` quanto em `desktop-webkit`. O preflight local alcançou **16 de 16 verificações verdes**.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Preflight toolchain gate | `node scripts/preflight.mjs` | **pass** | **16 of 16 checks passed**. `browser-launch` agora inclui `webkit 27.2` com status `[pass]`. |
| Launch direto do WebKit MiniBrowser | `/home/luis/.cache/ms-playwright/webkit-2370/minibrowser-wpe/MiniBrowser --help` | **pass** | Retorna opções de linha de comando com exit code 0 sem erros de símbolo. |
| Teste E2E mobile-webkit | `npx playwright test tests/e2e/reflow.spec.js --project=mobile-webkit` | **pass** | 2 passed (8.1s). |
| Teste E2E desktop-webkit | `npx playwright test tests/e2e/reflow.spec.js --project=desktop-webkit` | **pass** | 2 passed (5.1s). |
| Suíte de testes unitários | `npm run test:unit` | **pass** | **155 de 155 passed** (preflight unit test agora passa 100%). |

## Output Excerpts

Preflight 16/16 verde:
```text
preflight: horror-web-comic build environment
  [pass] node                 Node.js 22.23.1 satisfies Node.js >=20.0.0
  [pass] npm                  npm 12.2.1 satisfies npm >=10.0.0
  [pass] python3              Python 3.14.8 satisfies Python >=3.10.0
  [pass] ffmpeg               ffmpeg 8.1.3 satisfies ffmpeg >=5.0.0 with encoders aac, libopus
  [pass] ffprobe              ffprobe 8.1.3 satisfies ffprobe >=5.0.0
  [pass] tesseract            tesseract 5.5.3 satisfies tesseract >=4.0.0
  [pass] playwright-browsers  Playwright browser executables are present for chromium, firefox, webkit
  [pass] browser-launch       every configured browser launches headless: chromium 156.0.8078.4, firefox 157.0, webkit 27.2
  [pass] librsvg              librsvg resolved at pkg-config:librsvg-2.0
  [pass] chrome               Chrome resolved at /home/luis/.local/bin/google-chrome
  [pass] lhci                 Lighthouse CI (lhci) resolved at ...
  [pass] pinned-dependencies  package.json pins all 6 declared dependencies to exact versions
  [pass] installed-versions   all 6 pinned dependencies are installed at the pinned versions
  [pass] lockfile             package-lock.json (lockfileVersion 3) mirrors every pin in package.json
  [pass] engines              package.json engines.node ">=20.0.0" covers the required engines.node >=20.0.0
  [pass] scripts              scripts.ci chains npm run preflight && ...
preflight: 16 of 16 checks passed
```

Execução WebKit nos projetos da matriz:
```text
npx playwright test tests/e2e/reflow.spec.js --project=mobile-webkit
  ✓  reflows controls and descriptions at 320px with 200% text (2.7s)
  ✓  reflows controls and descriptions at 360px with 200% text (2.8s)
  2 passed (8.1s)

npx playwright test tests/e2e/reflow.spec.js --project=desktop-webkit
  ✓  reflows controls and descriptions at 360px with 200% text (2.3s)
  ✓  reflows controls and descriptions at 320px with 200% text (2.4s)
  2 passed (5.1s)
```

## Residual Risks

- Nenhuma dependência do host foi alterada ou comprometida. Se o cache `~/.cache/ms-playwright/webkit-2370` for deletado e reinstalado via `npx playwright install`, basta re-executar os symlinks a partir de `~/.local/lib/playwright-compat/ubuntu-libs/`.

## Recommendation

Fechar o bug `webkit-fedora-compat` como **verified**. O objetivo histórico de atingir 16/16 no preflight local e desbloquear a matriz WebKit foi alcançado de ponta a ponta com evidências empíricas reais.
