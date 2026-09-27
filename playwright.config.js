import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 8080',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  // T163 — reference-profile alignment.
  // Declared profiles (spec SC-001; tasks T004): mobile 360x800 (SC-001
  // performance reference, ~4 GB RAM, entry-level CPU) and desktop 1440x900.
  // Actual `devices[...]` defaults on the pinned @playwright/test 1.63.0
  // (measured): Pixel 5 -> 393x727, iPhone 14 -> 390x664,
  // Desktop Chrome/Firefox/Safari -> 1280x720 each.
  // Decision (split):
  // - Mobile projects override ONLY the viewport geometry to the declared
  //   360x800 reference (the SC-001 perf profile). UA, touch, isMobile and
  //   scale from the device descriptors are kept, as are all 5 projects.
  // - Desktop projects KEEP the device-default 1280x720 viewport instead of
  //   the declared 1440x900, because 1440x900 deterministically breaks the
  //   enforced light-asset bounds owned by other suites: with
  //   `sizes="100vw"` the slot (1440) exceeds the largest light srcset
  //   candidate (1280w), and Chromium reports density-corrected
  //   naturalWidth = 1440, tripping `width <= 1280` in
  //   tests/e2e/degradation-production.spec.js:46 and
  //   tests/e2e/zz-degraded-coverage.spec.js:108 (verified: same bytes load
  //   fine at 1280x720 and via direct <img src>; only the 1440 slot
  //   reporting differs). Those assertions are out of scope to weaken, so
  //   the override is deferred until the owners adjudicate (test assumption
  //   vs player `sizes` vs asset ceiling). The 1440x900 desktop profile
  //   itself remains covered by tests/e2e/responsive.spec.js, which sets
  //   1440-landscape/portrait (and 2560) viewports explicitly per test,
  //   independent of these project defaults.
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 800 } } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 14'], viewport: { width: 360, height: 800 } } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
