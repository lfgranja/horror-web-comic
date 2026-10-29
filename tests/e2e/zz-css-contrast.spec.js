import { test, expect } from '@playwright/test';
import { openPlayer } from './helpers.js';

// T130 / FR-010 / SC-017 — AAA contrast proof per text ROLE (complements
// contrast.spec.js, which asserts rendered pixels but prints no table).
// Method: getComputedStyle color + walk-up compositing of every background
// layer in true CSS paint order (background-image over background-color,
// descendants over ancestors). Gradients: the LIGHTEST stop in the
// background-image string is used (conservative — real pixels are never
// lighter). The frame description sits over a photo, so it additionally gets
// a worst-case assertion composited over pure white (brightest possible
// image bleed through its 0.86-alpha chip).
test('every text role meets AAA (normal >=7:1, large >=4.5:1) with table evidence', async ({ page }) => {
  await openPlayer(page, 'src/data/story.json', { pause: true });
  await expect(page.locator('#frame-description')).toHaveText(/.+/);
  // Force every overlay state visible so card text is measured too.
  for (const state of ['off', 'blocked']) {
    await page.locator('#audio-toggle').evaluate((element, value) => { element.dataset.state = value; }, state);
    await page.evaluate(() => {
      for (const id of ['blocked-overlay', 'resume-overlay', 'end-overlay']) document.getElementById(id).hidden = false;
    });
    const table = await page.evaluate(() => {
      const parse = (value) => {
        const match = String(value).match(/rgba?\(([^)]+)\)/);
        if (!match) return null;
        const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
        return { red: parts[0], green: parts[1], blue: parts[2], alpha: parts[3] ?? 1 };
      };
      const lum = ({ red, green, blue }) => {
        const channels = [red, green, blue].map((value) => {
          const normalized = value / 255;
          return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      };
      const over = (top, bottom) => {
        const alpha = top.alpha + bottom.alpha * (1 - top.alpha);
        if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
        return {
          red: (top.red * top.alpha + bottom.red * bottom.alpha * (1 - top.alpha)) / alpha,
          green: (top.green * top.alpha + bottom.green * bottom.alpha * (1 - top.alpha)) / alpha,
          blue: (top.blue * top.alpha + bottom.blue * bottom.alpha * (1 - top.alpha)) / alpha,
          alpha
        };
      };
      const contrast = (foreground, background) => (Math.max(lum(foreground), lum(background)) + 0.05)
        / (Math.min(lum(foreground), lum(background)) + 0.05);
      const effectiveBackground = (element) => {
        let acc = { red: 0, green: 0, blue: 0, alpha: 0 };
        let node = element;
        while (node instanceof Element) {
          const style = getComputedStyle(node);
          const color = parse(style.backgroundColor);
          let nodeLayer = color && color.alpha > 0 ? color : null;
          if (style.backgroundImage && style.backgroundImage !== 'none') {
            const stops = [...style.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)]
              .map((match) => parse(match[0])).filter(Boolean);
            if (stops.length > 0) {
              // Keep each stop's own alpha: a 0.28-alpha highlight is mostly
              // the layers beneath it, not a solid color.
              const lightest = stops.reduce((best, stop) => (lum(stop) > lum(best) ? stop : best));
              nodeLayer = nodeLayer ? over(lightest, nodeLayer) : lightest;
            }
          }
          if (nodeLayer) acc = over(acc, nodeLayer);
          if (acc.alpha >= 1) break;
          node = node.parentElement;
        }
        return { red: acc.red, green: acc.green, blue: acc.blue };
      };
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden'
          && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
      };
      const rows = [];
      for (const element of document.querySelectorAll('#app *')) {
        if (!visible(element)) continue;
        if (element.matches('input')) continue;
        if (!element.matches('select') && ![...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) continue;
        const style = getComputedStyle(element);
        const foreground = parse(style.color);
        const background = effectiveBackground(element);
        const sizePx = Number.parseFloat(style.fontSize);
        const bold = Number(style.fontWeight) >= 700;
        const large = sizePx >= 24 || (sizePx >= 18.66 && bold);
        rows.push({
          role: `${element.tagName.toLowerCase()}#${element.id || ''}.${typeof element.className === 'string' ? element.className : ''}`.slice(0, 64),
          color: style.color,
          size: `${sizePx.toFixed(1)}px${bold ? ' bold' : ''}`,
          large,
          required: large ? 4.5 : 7,
          measured: Math.round(contrast(foreground, background) * 100) / 100
        });
      }
      // Worst case for the description chip: brightest possible photo behind it.
      const description = document.querySelector('#frame-description');
      const chip = parse(getComputedStyle(description).backgroundColor);
      const worstBackground = {
        red: chip.red * chip.alpha + 255 * (1 - chip.alpha),
        green: chip.green * chip.alpha + 255 * (1 - chip.alpha),
        blue: chip.blue * chip.alpha + 255 * (1 - chip.alpha)
      };
      const descriptionForeground = parse(getComputedStyle(description).color);
      return {
        rows,
        worstDescription: Math.round(contrast(descriptionForeground, worstBackground) * 100) / 100,
        chipAlpha: chip.alpha
      };
    });
    // eslint-disable-next-line no-console
    console.log(`\nCONTRAST TABLE (audio-toggle=${state}):\n${'role'.padEnd(52)}${'size'.padEnd(14)}req measured\n${
      table.rows.map((row) => `${row.role.padEnd(52)}${row.size.padEnd(14)}${row.required.toFixed(1)} ${row.measured.toFixed(2)}`).join('\n')
    }\nframe-description worst-case over white photo: ${table.worstDescription.toFixed(2)} (chip alpha ${table.chipAlpha})`);
    const failures = table.rows.filter((row) => row.measured < row.required);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    expect(table.worstDescription).toBeGreaterThanOrEqual(7);
    await page.evaluate(() => {
      for (const id of ['blocked-overlay', 'resume-overlay', 'end-overlay']) document.getElementById(id).hidden = true;
    });
  }
});
