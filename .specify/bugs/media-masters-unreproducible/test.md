# Bug Verification: Published media variants cannot be reproduced from source

- **Slug**: media-masters-unreproducible
- **Tested**: 2026-09-30
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

Media masters were cleanly separated into `media-src/` while keeping `assets/` strictly for publishable/manifest-referenced assets. `npm run build:images` and `npm run build` execute deterministically and pass all budget gates. All 20 delivery and media generation tests pass (133/133 total unit tests pass).

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Media Generation Build | `npm run build:images` | pass | 4 frame sources and 3 audio sources processed into responsive AVIF/WebP/JPEG and AAC/Opus variants without errors. |
| Production Build & Budget Gate | `npm run build` | pass | Raw assets (initial=187KB, maxFrame=160KB, total=1.51MB) and compressed code within budget limits. |
| Delivery & Generation Unit Tests | `node --test tests/unit/delivery.test.js tests/unit/media-generation.test.js` | pass | 20/20 tests pass. |
| Full Regression Unit Suite | `npm run test:unit` | pass | 133/133 tests pass. |

## Output Excerpts

### `npm run build:images && npm run build`
```text
processed 4 frame source(s) and 3 audio source(s) with responsive AVIF/WebP/JPEG and AAC/Opus variants
manifest valid: src/data/story.json
build complete: 13279 compressed script bytes, 3192 compressed style bytes, raw assets: initial=187355, maxFrame=160252, total=1515886
```

### `node --test tests/unit/delivery.test.js tests/unit/media-generation.test.js`
```text
ℹ tests 20
ℹ suites 0
ℹ pass 20
ℹ fail 0
```

## Residual Risks

- The master media files in `media-src/` are synthetic fixture masters; if real high-res illustration masters are introduced, their size and generation times should be monitored against repository budgets.

## Recommendation

Close the bug — verified end-to-end.
