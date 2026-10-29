import { test, expect } from '@playwright/test';
import { openPlayer, waitForFrame } from './helpers.js';

test('exposes language, names, roles, values, and status regions', async ({ page }, testInfo) => {
  testInfo.annotations.push({
    type: 'audit_scope',
    description: 'Automated Chromium DOM and ARIA inspection only; it is not a real screen-reader announcement test or a manual assistive-technology audit.'
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  const semantics = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll('#app button, #app input, #app select')].filter(visible);
    const accessibleName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledText = labelledBy ? document.getElementById(labelledBy)?.textContent.trim() : '';
      const labelText = element.labels?.[0]?.textContent.trim() || '';
      return element.getAttribute('aria-label') || labelledText || labelText || element.getAttribute('title') || element.textContent.trim() || element.value || '';
    };
    return {
      pageLanguage: document.documentElement.lang,
      descriptionLanguage: document.querySelector('#frame-description').lang,
      names: controls.map((element) => ({ id: element.id, name: accessibleName(element) })),
      imageAlt: document.querySelector('#frame-image').alt,
      imageDescription: document.querySelector('#frame-image').getAttribute('aria-describedby'),
      descriptionLive: document.querySelector('#frame-description').getAttribute('aria-live'),
      descriptionAtomic: document.querySelector('#frame-description').getAttribute('aria-atomic'),
      progress: {
        role: document.querySelector('#progress').getAttribute('role'),
        min: document.querySelector('#progress').getAttribute('aria-valuemin'),
        max: document.querySelector('#progress').getAttribute('aria-valuemax'),
        now: document.querySelector('#progress').getAttribute('aria-valuenow')
      },
      audioPressed: document.querySelector('#audio-toggle').getAttribute('aria-pressed'),
      audioStatus: document.querySelector('#audio-status').getAttribute('role'),
      audioLive: document.querySelector('#audio-status').getAttribute('aria-live')
    };
  });
  expect(semantics.pageLanguage).toBe('pt-BR');
  expect(semantics.descriptionLanguage).toBe('pt-BR');
  expect(semantics.names.every(({ name }) => name.length > 0)).toBe(true);
  expect(semantics.imageAlt.length).toBeGreaterThan(0);
  expect(semantics.imageDescription).toBe('frame-description');
  expect(semantics.descriptionLive).toBe('polite');
  expect(semantics.descriptionAtomic).toBe('true');
  expect(semantics.progress).toEqual({ role: 'progressbar', min: '1', max: '4', now: '1' });
  expect(['true', 'false']).toContain(semantics.audioPressed);
  expect(semantics.audioStatus).toBe('status');
  expect(semantics.audioLive).toBe('polite');
});

test('keeps visible focus, target size, keyboard activation, and safe-area support', async ({ page }, testInfo) => {
  testInfo.annotations.push({
    type: 'audit_scope',
    description: 'Automated Chromium focus, geometry, keyboard, and stylesheet checks only; real keyboard users, screen readers, hardware safe areas, and manual visual review remain unverified.'
  });
  await openPlayer(page, 'tests/fixtures/story.json', { pause: true });
  const controls = page.locator('#app button:visible, #app input:visible, #app select:visible');
  const controlCount = await controls.count();
  for (let index = 0; index < controlCount; index += 1) {
    const control = controls.nth(index);
    const box = await control.boundingBox();
    expect(box, await control.getAttribute('id')).not.toBeNull();
    expect(box.width, await control.getAttribute('id')).toBeGreaterThanOrEqual(44);
    expect(box.height, await control.getAttribute('id')).toBeGreaterThanOrEqual(44);
    await control.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const focusStyle = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth), outlineColor: style.outlineColor };
    });
    expect(focusStyle.outlineStyle, await control.getAttribute('id')).not.toBe('none');
    expect(focusStyle.outlineWidth, await control.getAttribute('id')).toBeGreaterThanOrEqual(2);
    expect(focusStyle.outlineColor, await control.getAttribute('id')).not.toBe('transparent');
  }
  await page.locator('#play-toggle').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'playing');
  await expect(page.locator('#play-toggle')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#player')).toHaveAttribute('data-status', 'paused');
  await page.locator('#player').focus();
  await page.keyboard.press('ArrowRight');
  await waitForFrame(page, 'frame-02');
  await page.keyboard.press('ArrowLeft');
  await waitForFrame(page, 'frame-01');
  const safeArea = await page.evaluate(() => {
    const rules = [...document.styleSheets].flatMap((sheet) => {
      try {
        return [...sheet.cssRules];
      } catch {
        return [];
      }
    }).map((rule) => rule.cssText).join('\n');
    return {
      viewportFit: document.querySelector('meta[name="viewport"]').content,
      usesSafeArea: rules.includes('safe-area-inset-'),
      shellPadding: getComputedStyle(document.querySelector('.app-shell')).padding
    };
  });
  expect(safeArea.viewportFit).toContain('viewport-fit=cover');
  expect(safeArea.usesSafeArea).toBe(true);
  expect(safeArea.shellPadding).not.toBe('');
});
