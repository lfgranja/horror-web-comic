export const EPSILON = 0.05;

export const INTERACTIVE_TARGET_SELECTOR = [
  'button',
  'select',
  'input:not([type="hidden"])',
  'textarea',
  'a[href]',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="slider"]',
  '[role="combobox"]',
  '[tabindex="0"]'
].join(', ');

/**
 * Programmatically evaluates dimensions of interactive touch targets (SC 2.5.5 AAA >= 44x44px).
 * Supports multiple container selectors via querySelectorAll, subpixel EPSILON tolerance, and
 * safety timeout fallback awaiting completion of finite CSS animations.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [containerSelector='nav.control-bar, #blocked-overlay:not([hidden]), .overlay:not([hidden]), .error-screen:not([hidden])']
 * @returns {Promise<import('./target-size-helper.js').TargetSizeEvaluation>}
 */
export async function evaluateTargetSizes(
  page,
  containerSelector = 'nav.control-bar, #blocked-overlay:not([hidden]), .overlay:not([hidden]), .error-screen:not([hidden])'
) {
  // 1. Stabilize finite animations with 500ms safety timeout fallback and neutral scroll
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    const animations = document.getAnimations().filter((a) => a.effect?.getTiming?.().iterations !== Infinity);
    await Promise.race([
      Promise.all(animations.map((a) => a.finished.catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 500))
    ]);
  });
  await page.mouse.move(0, 0);

  const viewport = page.viewportSize();

  // 2. Extract geometry in a single CDP roundtrip
  const candidatesData = await page.evaluate(
    ({ selector, containerSel }) => {
      const containers = containerSel ? Array.from(document.querySelectorAll(containerSel)) : [document.body];
      const elements = Array.from(new Set(containers.flatMap((c) => Array.from(c.querySelectorAll(selector)))));

      return elements
        .filter((el) => {
          if (el.closest('[aria-hidden="true"], [hidden], [inert]') || el.inert) return false;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility !== 'visible' || parseFloat(style.opacity) === 0) return false;
          if (el.disabled || el.getAttribute('aria-disabled') === 'true' || style.pointerEvents === 'none') return false;
          return true;
        })
        .map((el) => {
          if (typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
          const rect = el.getBoundingClientRect();
          const classStr = typeof el.className === 'string' ? el.className : el.className?.baseVal || '';
          const id =
            el.id ||
            el.getAttribute('aria-label') ||
            (classStr ? el.tagName.toLowerCase() + '.' + classStr.split(' ')[0] : el.tagName.toLowerCase());
          const sel = el.id
            ? `#${el.id}`
            : el.getAttribute('aria-label')
              ? `${el.tagName.toLowerCase()}[aria-label="${el.getAttribute('aria-label')}"]`
              : classStr
                ? `${el.tagName.toLowerCase()}.${classStr.trim().split(/\s+/).join('.')}`
                : el.tagName.toLowerCase();
          return {
            id,
            selector: sel,
            box: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          };
        });
    },
    { selector: INTERACTIVE_TARGET_SELECTOR, containerSel: containerSelector }
  );

  let smallestTarget = null;
  let minArea = Infinity;
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let tier1Pass = true;
  let tier2Pass = true;
  const controls = [];

  for (const { id, selector, box } of candidatesData) {
    if (!box) {
      nonCompliantCount++;
      tier1Pass = false;
      tier2Pass = false;
      controls.push({
        selector,
        id: id || undefined,
        width: 0,
        height: 0,
        isCompliant: false,
        box: { x: 0, y: 0, width: 0, height: 0 }
      });
      continue;
    }

    const meetsTier1 = box.width >= 24 - EPSILON && box.height >= 24 - EPSILON;
    const meetsTier2 = box.width >= 44 - EPSILON && box.height >= 44 - EPSILON;
    const withinViewport =
      !viewport ||
      (box.x >= -EPSILON &&
        box.y >= -EPSILON &&
        box.x + box.width <= viewport.width + 1 + EPSILON &&
        box.y + box.height <= viewport.height + 1 + EPSILON);

    const isCompliant = meetsTier2 && withinViewport;

    if (isCompliant) {
      compliantCount++;
    } else {
      nonCompliantCount++;
    }

    if (!meetsTier1) tier1Pass = false;
    if (!meetsTier2 || !withinViewport) tier2Pass = false;

    const area = box.width * box.height;
    if (area < minArea) {
      minArea = area;
      smallestTarget = {
        id,
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10
      };
    }

    controls.push({
      selector,
      id: id || undefined,
      width: Math.round(box.width * 10) / 10,
      height: Math.round(box.height * 10) / 10,
      isCompliant,
      box
    });
  }

  const tested = candidatesData.length > 0;
  const isCompliantAAA = tested ? nonCompliantCount === 0 && tier2Pass : true;
  const status = isCompliantAAA ? 'pass' : 'fail';
  const tier1Status = tested ? (tier1Pass ? 'pass' : 'fail') : 'not-applicable';
  const tier2Status = tested ? (tier2Pass ? 'pass' : 'fail') : 'not-applicable';

  return {
    tested,
    status,
    tier1Status,
    tier2Status,
    compliantCount,
    nonCompliantCount,
    smallestTarget,
    controls,
    isCompliantAAA
  };
}
