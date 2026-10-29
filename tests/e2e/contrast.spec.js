import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { openPlayer } from './helpers.js';

function parseColor(value) {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const values = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  return { red: values[0], green: values[1], blue: values[2], alpha: values[3] ?? 1 };
}

function luminance(color) {
  const channels = [color.red, color.green, color.blue].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test('normal text and controls have at least 7:1 contrast over rendered pixels and focus states', async ({ page }) => {
  await openPlayer(page, 'src/data/story.json', { pause: true });
  await expect(page.locator('#frame-description')).toHaveText(/.+/);
  await page.locator('#audio-toggle').evaluate((element) => { element.dataset.state = 'blocked'; });
  await page.locator('#audio-toggle').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const probes = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const elements = [...document.querySelectorAll('#app *')].filter((element) => {
      if (!visible(element)) return false;
      if (element.matches('input')) return false;
      if (element.matches('select')) return true;
      return Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    });
    return elements.map((element, index) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const insetX = Math.min(12, rect.width / 4);
      const insetY = Math.min(12, rect.height / 4);
      const points = [
        [rect.left + insetX, rect.top + insetY],
        [rect.right - insetX, rect.top + insetY],
        [rect.left + insetX, rect.bottom - insetY],
        [rect.right - insetX, rect.bottom - insetY],
        [rect.left + rect.width / 2, rect.top + rect.height / 2]
      ].map(([x, y]) => ({
        x: Math.max(0, Math.min(document.documentElement.scrollWidth - 1, x + window.scrollX)),
        y: Math.max(0, Math.min(document.documentElement.scrollHeight - 1, y + window.scrollY))
      }));
      return {
        index,
        label: `${element.tagName.toLowerCase()}#${element.id || ''}.${typeof element.className === 'string' ? element.className : ''}`,
        color: style.color,
        points
      };
    });
  });
  await page.addStyleTag({ content: '*, *::before, *::after { color: transparent !important; text-shadow: none !important; }' });
  const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' });
  const { data, info } = await sharp(screenshot).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const scale = await page.evaluate(() => window.devicePixelRatio);
  const sample = (point) => {
    const x = Math.min(info.width - 1, Math.max(0, Math.round(point.x * scale)));
    const y = Math.min(info.height - 1, Math.max(0, Math.round(point.y * scale)));
    const offset = (y * info.width + x) * info.channels;
    return { red: data[offset], green: data[offset + 1], blue: data[offset + 2] };
  };
  const results = probes.map((probe) => {
    const foreground = parseColor(probe.color);
    const ratios = probe.points.map((point) => contrastRatio(foreground, sample(point)));
    return { label: probe.label, color: probe.color, minimum: Math.min(...ratios), ratios };
  });
  const failures = results.filter(({ minimum }) => minimum < 7);
  expect(failures).toEqual([]);
});
