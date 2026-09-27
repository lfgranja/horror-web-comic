# WCAG 2.2 AAA audit evidence

Date: 2026-09-25
Scope: T128, T129, T130, and the automatable portion of T144.

## Automated evidence

The test-first RED run was:

```text
npx playwright test tests/e2e/reduced-motion.spec.js tests/e2e/reflow.spec.js tests/e2e/contrast.spec.js tests/e2e/wcag-audit.spec.js --project=desktop-chromium --workers=1 --reporter=line
4 failed, 2 passed (43.1s)
```

The observed failures were the loading spinner animation, the blocked focused audio control at 4.93:1, and horizontal overflow at both 320px and 360px with 200% text.

The GREEN run was:

```text
npx playwright test tests/e2e/reduced-motion.spec.js tests/e2e/reflow.spec.js tests/e2e/contrast.spec.js tests/e2e/wcag-audit.spec.js --config=/tmp/opencode/phase12-green.config.mjs --project=desktop-chromium --workers=1
6 passed (18.9s)
```

The isolated config was used only because port 8080 was occupied by an unrelated verification process; it ran the same repository tests in desktop Chromium.

The automated checks cover:

- 1.4.6 Contrast (Enhanced): rendered-pixel sampling checks normal text, controls, and the focused blocked audio state at 7:1 or higher. The sampling is a Chromium pixel proxy, not a human visual assessment.
- 1.4.4 Resize Text and 1.4.10 Reflow: 320px and 360px viewports with a 200% root text scale, bounds, scroll width, control geometry, and full description text.
- 2.2.2 and 2.3.3: reduced motion produces no CSS animation or transition while automatic frame advance continues.
- 2.5.5 Target Size (Enhanced), 2.4.7 Focus Visible, 2.1.1 Keyboard, 4.1.2 Name/Role/Value, 4.1.3 Status Messages, and 3.1.1/3.1.2 Language: DOM, computed-style, geometry, and keyboard-event proxies.
- Safe-area support: the viewport-fit declaration and `env(safe-area-inset-*)` stylesheet usage are checked as a stylesheet proxy.

## Manual and host-dependent blockers

These checks have not been performed and are not claimed as passed:

- A real screen-reader run with NVDA, JAWS, VoiceOver, or TalkBack, including spoken frame descriptions, status announcements, dialog behavior, and language pronunciation.
- A human keyboard-only walkthrough covering tab order, visible focus during every interaction, focus recovery, and reduced-motion playback.
- Real iOS/Safari and mobile-device safe-area, orientation, browser-zoom, and 200% reflow verification; Chromium emulation cannot certify hardware insets or WebKit behavior.
- Manual visual review of contrast, text clipping, image/background changes, focus indicators, and motion comfort with user settings and assistive technologies.
- The pending human audio-control discoverability and audio-off comprehension studies remain separate manual evidence and are not represented by these automated proxies.

This artifact records automated evidence only; it does not assert that the product has completed a full WCAG 2.2 AAA audit.
