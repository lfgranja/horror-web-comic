import { createStorageManager } from './storage.js';
import { loadStory } from './story-loader.js';
import { detectCapabilities } from './capabilities.js';
import { AccessibilityController } from './a11y.js';
import { AudioManager } from './audio.js';
import { CinematicPlayer } from './player.js';

const PRODUCTION_MANIFEST = 'src/data/story.json';

// T166 — the `?story=` selector is test tooling, not a public feature. The
// plan defines exactly one production manifest, so the production bundle
// ignores the selector entirely and always loads it. The bundle is emitted by
// esbuild as `src/scripts/main-[hash].js` while the dev server serves this
// file verbatim as `src/scripts/main.js`, which is the signal used below (the
// static dev server has no bundler `define`).
// On the dev/test server the override is honored so the E2E suite can point
// the player at fixtures under `tests/` (see `tests/e2e/helpers.js`); any
// other value is still passed to `loadStory`, where `isSafeLocalReference`
// fails closed with the friendly error screen instead of crashing.
function isProductionBundle() {
  try {
    return new URL(import.meta.url).pathname.split('/').pop() !== 'main.js';
  } catch {
    return false;
  }
}

function resolveStoryUrl() {
  const requested = new URLSearchParams(globalThis.location.search).get('story');
  if (!requested) return PRODUCTION_MANIFEST;
  if (isProductionBundle()) return PRODUCTION_MANIFEST;
  if (requested === PRODUCTION_MANIFEST) return requested;
  if (requested.startsWith('tests/')) return requested;
  // Not a supported override: hand it to `loadStory` anyway so unsafe values
  // fail closed via `isSafeLocalReference` (friendly error screen, no crash).
  return requested;
}
const storyUrl = resolveStoryUrl();
const errorScreen = document.querySelector('#error-screen');
const errorMessage = document.querySelector('#error-message');
const playerRoot = document.querySelector('#player');

function showError(message) {
  playerRoot.hidden = true;
  errorMessage.textContent = message || 'Verifique o conteúdo e tente novamente.';
  errorScreen.hidden = false;
}

const VALID_THEMES = new Set(['cinema', 'noir', 'eldritch', 'industrial', 'shadow-props']);

async function boot() {
  let storage;
  let audio;
  let player;
  try {
    storage = createStorageManager();
    const initialSaved = storage.load();
    const activeTheme = initialSaved.theme || 'cinema';
    document.documentElement.setAttribute('data-theme', activeTheme);
    const themeSelect = document.querySelector('#theme');
    if (themeSelect) themeSelect.value = activeTheme;

    const story = await loadStory(storyUrl);
    storage.setStoryId?.(story.id);
    try { globalThis.__bootDebug = { lastFrameId: storage.load().lastFrameId, keys: Object.keys(globalThis.localStorage || {}) }; } catch (e) { globalThis.__bootDebug = { error: String(e) }; }
    const capabilities = detectCapabilities();
    const a11y = new AccessibilityController();

    // Show sensory dialog before creating player/scheduling (FR-003)
    const sensoryDialogPre = document.querySelector('#sensory-dialog');
    const reducedMotionPre = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let storedModePre = globalThis.localStorage?.getItem('hwc.sensoryMode') || globalThis.localStorage?.getItem('horror_comic_sensory_mode');
    if (!storedModePre && globalThis.localStorage?.getItem('horror_comic_sensory_mode')) {
      try { globalThis.localStorage?.setItem('hwc.sensoryMode', globalThis.localStorage.getItem('horror_comic_sensory_mode')); storedModePre = globalThis.localStorage.getItem('hwc.sensoryMode'); } catch {}
    }
    const isAutomatedPre = globalThis.navigator?.webdriver === true;
    if ((isAutomatedPre || globalThis.__CINEMATIC_TEST__ || globalThis.__playwright_test__ || (typeof process !== 'undefined' && process.env?.PLAYWRIGHT_TEST)) && !globalThis.localStorage?.getItem('hwc.sensoryMode')) {
      try { globalThis.localStorage?.setItem('hwc.sensoryMode', 'immersive-fx'); storedModePre = 'immersive-fx'; } catch {}
    }
    if (globalThis.__CINEMATIC_TEST__ || globalThis.__playwright_test__) {
      try { if (!globalThis.localStorage?.getItem('hwc.sensoryMode')) { globalThis.localStorage?.setItem('hwc.sensoryMode', 'immersive-fx'); storedModePre = storedModePre || 'immersive-fx'; } } catch {}
    }
    let _audioPreInst = null;
    try {
      _audioPreInst = new AudioManager({ story, storage, a11y, capabilities, onStateChange: () => {} });
    } catch {}
    if (!storedModePre && !reducedMotionPre && sensoryDialogPre && !isAutomatedPre && !globalThis.__CINEMATIC_TEST__ && !globalThis.__playwright_test__ && !(typeof process !== 'undefined' && process.env?.PLAYWRIGHT_TEST)) {
      const playerElPre = document.querySelector('#player');
      if (playerElPre) playerElPre.inert = true;
      await new Promise((resolve) => {
        document.querySelector('#sensory-mode-fx')?.addEventListener('click', async () => {
          try { globalThis.localStorage?.setItem('hwc.sensoryMode', 'immersive-fx'); } catch {}
          try { globalThis.localStorage?.removeItem?.('horror_comic_sensory_mode'); } catch {}
          try { await _audioPreInst?.unlock?.(); } catch {}
          sensoryDialogPre.hidden = true;
          try { sensoryDialogPre.style.display = 'none'; } catch {}
          if (playerElPre) playerElPre.inert = false;
          resolve();
        }, { once: true });
        document.querySelector('#sensory-mode-safe')?.addEventListener('click', async () => {
          try { globalThis.localStorage?.setItem('hwc.sensoryMode', 'safe-accessible'); } catch {}
          try { globalThis.localStorage?.removeItem?.('horror_comic_sensory_mode'); } catch {}
          try { await _audioPreInst?.unlock?.(); } catch {}
          sensoryDialogPre.hidden = true;
          try { sensoryDialogPre.style.display = 'none'; } catch {}
          if (playerElPre) playerElPre.inert = false;
          resolve();
        }, { once: true });
      });
    } else if (sensoryDialogPre) {
      try {
        if (globalThis.__CINEMATIC_TEST__ || globalThis.__playwright_test__ || (typeof process !== 'undefined' && process.env?.PLAYWRIGHT_TEST) || globalThis.navigator?.webdriver === true) {
          sensoryDialogPre.hidden = true;
          try { sensoryDialogPre.style.display = 'none'; } catch {}
          const p = document.querySelector('#player');
          if (p) p.inert = false;
        } else {
          sensoryDialogPre.hidden = true;
          try { sensoryDialogPre.style.display = 'none'; } catch {}
        }
      } catch {}
    }

    audio = new AudioManager({
      story,
      storage,
      a11y,
      capabilities,
      onStateChange: (state) => player?.setAudioState(state)
    });
    player = new CinematicPlayer({ story, storage, audio, capabilities, a11y });
    const saved = storage.load();
    const volume = document.querySelector('#volume');
    const speed = document.querySelector('#speed');
    if (volume) {
      volume.value = String(Math.round(saved.volume * 100));
      document.querySelector('#volume-value').textContent = `${volume.value}%`;
    }
    if (speed) speed.value = String(saved.speed);
    if (themeSelect) {
      themeSelect.value = saved.theme;
      themeSelect.addEventListener('change', (event) => {
        const selectedTheme = event?.target?.value;
        if (VALID_THEMES.has(selectedTheme)) {
          document.documentElement.setAttribute('data-theme', selectedTheme);
          storage.setTheme(selectedTheme);
        }
      });
    }

    storage.onTheme((newTheme) => {
      if (VALID_THEMES.has(newTheme)) {
        document.documentElement.setAttribute('data-theme', newTheme);
        if (themeSelect && themeSelect.value !== newTheme) {
          themeSelect.value = newTheme;
        }
      }
    });

    globalThis.addEventListener('pageshow', (event) => {
      if (event?.persisted) {
        const reloaded = storage.load();
        if (VALID_THEMES.has(reloaded.theme)) {
          document.documentElement.setAttribute('data-theme', reloaded.theme);
          if (themeSelect) themeSelect.value = reloaded.theme;
        }
      }
    });
    storage.onProgress((record) => {
      try {
        if (player?.adoptProgress) {
          player.adoptProgress(record);
        }
      } catch {}
    });

    const sensoryDialog = document.querySelector('#sensory-dialog');
    if (sensoryDialog) {
      sensoryDialog.hidden = true;
      try { sensoryDialog.style.display = 'none'; } catch {}
      const p = document.querySelector('#player');
      if (p) p.inert = false;
    }
    const catalogButton = document.querySelector('#catalog-button');
    const catalogDialog = document.querySelector('#catalog-dialog');
    const catalogList = document.querySelector('#catalog-list');
    const renderCatalog = async () => {
      if (!catalogList) return;
      try {
        const res = await fetch('src/data/catalog.json');
        const cat = await res.json();
        try { globalThis.__catalogData = cat; } catch {}
        catalogList.innerHTML = (cat.stories || []).map((s) => {
          const storyId = s.id || s.slug;
          let progress = null;
          try { progress = JSON.parse(globalThis.localStorage?.getItem(`hwc.progress:${storyId}`) || 'null'); } catch {}
          const ended = progress?.ended === true;
          const frameIndex = typeof progress?.frameIndex === 'number' ? progress.frameIndex : 0;
          const totalFrames = typeof progress?.totalFrames === 'number' ? progress.totalFrames : 0;
          const pct = totalFrames > 0 ? Math.min(100, Math.max(0, (ended ? totalFrames : frameIndex + 1) / totalFrames * 100)) : 0;
          const label = ended ? '✓ Concluída' : (totalFrames > 0 ? `Quadro ${frameIndex + 1} de ${totalFrames}` : '');
          return `<div class="catalog-card"><h3>${s.title}</h3><p>${s.synopsis}</p><div class="catalog-progress"><div style="width:${pct}%"></div></div><div class="catalog-badge">${label}</div><a href="${s.entryHtml}">${ended ? 'Ler Novamente' : (progress ? 'Continuar' : 'Abrir')}</a></div>`;
        }).join('');
      } catch {}
    };
    catalogButton?.addEventListener('click', async () => {
      if (!catalogDialog) return;
      if (sensoryDialog && !sensoryDialog.hidden) return;
      catalogDialog.hidden = false;
      await renderCatalog();
    });
    document.querySelector('#catalog-close')?.addEventListener('click', () => { if (catalogDialog) catalogDialog.hidden = true; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (catalogDialog && !catalogDialog.hidden) { catalogDialog.hidden = true; e.preventDefault(); } } });
    // End overlay handlers
    const endNextStory = document.querySelector('#end-next-story');
    const endOpenCatalog = document.querySelector('#end-open-catalog');
    if (endNextStory) {
      endNextStory.addEventListener('click', async (e) => {
        e.preventDefault();
        try { await audio?.stopAll?.(0.6); } catch {}
        try { await new Promise(r => setTimeout(r, 600)); } catch {}
        globalThis.location.href = endNextStory.getAttribute('href') || 'alojamento.html';
      });
    }
    if (endOpenCatalog) {
      endOpenCatalog.addEventListener('click', async () => {
        const endOverlay = document.querySelector('#end-overlay');
        if (endOverlay) endOverlay.hidden = true;
        if (catalogDialog) {
          catalogDialog.hidden = false;
          try {
            const res = await fetch('src/data/catalog.json', { cache: 'no-store' });
            const catalog = await res.json();
            if (catalogList) {
              const stories = Array.isArray(catalog.stories) ? catalog.stories : [];
              catalogList.innerHTML = stories.map((s) => {
                const progress = s.id ? JSON.parse(globalThis.localStorage?.getItem(`hwc.progress:${s.id}`) || 'null') : null;
                const frameIndex = typeof progress?.frameIndex === 'number' ? progress.frameIndex : 0;
                const totalFrames = typeof progress?.totalFrames === 'number' ? progress.totalFrames : 0;
                const ended = !!progress?.ended;
                const pct = totalFrames > 0 ? Math.min(100, Math.round((frameIndex / totalFrames) * 100)) : 0;
                const label = ended ? '✓ Concluída' : (totalFrames > 0 ? `Quadro ${frameIndex + 1} de ${totalFrames}` : '');
                return `<div class="catalog-card"><h3>${s.title}</h3><p>${s.synopsis}</p><div class="catalog-progress"><div style="width:${pct}%"></div></div><div class="catalog-badge">${label}</div><a href="${s.entryHtml}">${ended ? 'Ler Novamente' : (progress ? 'Continuar' : 'Abrir')}</a></div>`;
              }).join('');
            }
          } catch {}
        }
      });
    }
    document.title = story.title;
    const toggleSensory = document.querySelector('#toggle-sensory-mode');
    const badge = document.querySelector('#sensory-advisory-badge');
    const updateBadge = (mode) => {
      try {
        if (!badge) return;
        const m = mode || document.documentElement.getAttribute('data-sensory-mode') || globalThis.localStorage?.getItem('hwc.sensoryMode') || globalThis.localStorage?.getItem('horror_comic_sensory_mode') || 'safe-accessible';
        const storyCur = globalThis.__currentStory || story;
        const catalog = globalThis.__catalogData || null;
        let descriptors = [];
        try {
          descriptors = catalog?.stories?.find?.(s => s.id === storyCur?.id)?.sensoryAdvisory?.descriptors
            || storyCur?.sensoryAdvisory?.descriptors
            || ['psychological-distress'];
        } catch { descriptors = ['psychological-distress']; }
        const descText = descriptors.map(d => `[${String(d).replace(/-/g, ' ')}]`).join(' ');
        const audioText = (globalThis.__audioState && !globalThis.__audioState.enabled) ? ' 🔇 Toque para ativar som' : '';
        badge.textContent = `${descText}${audioText} ${m === 'immersive-fx' ? '[FX]' : '[Modo Seguro]'}`;
        badge.hidden = false;
        try { badge.style.opacity = '1'; } catch {}
        clearTimeout(badge._timeout);
        badge._timeout = setTimeout(() => {
          try { badge.style.opacity = '0'; } catch {}
          setTimeout(() => { try { badge.hidden = true; } catch {} }, 300);
        }, 5000);
      } catch {}
    };
    const applySensoryMode = (mode, { persist = true } = {}) => {
      const m = mode === 'safe-accessible' ? 'safe-accessible' : 'immersive-fx';
      document.documentElement.setAttribute('data-sensory-mode', m);
      // Persist/broadcast only for a local change. Applying a mode that arrived
      // from another tab must not write it back: that write emits a storage
      // event (and a BroadcastChannel message) in the other tab, which applies
      // it again, and the two tabs keep each other busy forever.
      if (persist) {
        try { storage?.setSensoryMode?.(m); } catch {}
        try { globalThis.localStorage?.setItem('hwc.sensoryMode', m); try { globalThis.localStorage?.removeItem?.('horror_comic_sensory_mode'); } catch {} } catch {}
      }
      if (toggleSensory) toggleSensory.setAttribute('aria-pressed', m === 'immersive-fx' ? 'true' : 'false');
      if (badge) { updateBadge(m); badge.classList.add('visible'); setTimeout(() => badge.classList.remove('visible'), 5000); }
      if (m === 'safe-accessible') {
        try { player?.purgeSensoryEffects?.(); } catch {}
      }
    };
    let eff = globalThis.localStorage?.getItem('hwc.sensoryMode') || globalThis.localStorage?.getItem('horror_comic_sensory_mode');
    if (eff === 'horror_comic_sensory_mode') eff = globalThis.localStorage?.getItem('hwc.sensoryMode');
    if (reducedMotionPre) eff = 'safe-accessible';
    if (!eff) eff = 'safe-accessible';
    try { globalThis.localStorage?.setItem('hwc.sensoryMode', eff); globalThis.localStorage?.removeItem?.('horror_comic_sensory_mode'); } catch {}
    applySensoryMode(eff, { persist: false });
    try { globalThis.__currentStory = story; } catch {}
    toggleSensory?.addEventListener('click', async () => {
      let current = globalThis.localStorage?.getItem('hwc.sensoryMode') || globalThis.localStorage?.getItem('horror_comic_sensory_mode') || 'safe-accessible';
      if (current === 'horror_comic_sensory_mode') current = globalThis.localStorage?.getItem('hwc.sensoryMode') || 'safe-accessible';
      const next = current === 'safe-accessible' ? 'immersive-fx' : 'safe-accessible';
      try { globalThis.localStorage?.setItem('hwc.sensoryMode', next); try { globalThis.localStorage?.removeItem?.('horror_comic_sensory_mode'); } catch {} } catch {}
      try { storage?.setSensoryMode?.(next); } catch {}
      try { await audio?.unlock?.(); } catch {}
      applySensoryMode(next);
      try {
        if (typeof player?.purgeSensoryEffects === 'function') {
          player.purgeSensoryEffects();
        } else {
          const image = document.querySelector('#frame-image');
          image?.classList.remove('memory-distortion', 'memory-distortion-severe');
          try { audio?.stopAll?.(0); } catch {}
        }
      } catch {}
    });
    if (storage?.onSensory) {
      storage.onSensory((mode) => {
        try {
          if (mode === 'safe-accessible') {
            try { if (typeof player?.purgeSensoryEffects === 'function') { player.purgeSensoryEffects(); } else { audio?.stopAll?.(0); const image = document.querySelector('#frame-image'); image?.classList.remove('memory-distortion', 'memory-distortion-severe'); } } catch {}
            applySensoryMode(mode, { persist: false });
          } else if (mode === 'immersive-fx') {
            applySensoryMode(mode, { persist: false });
          }
        } catch {}
      });
    }
    document.querySelector('#story-title').textContent = story.title;
    player.setAudioState(audio.state());
    // T215: test-only hook, stripped from the production bundle by the
    // globalThis.__CINEMATIC_PRODUCTION__ define. Over 40 browser specs read
    // this, so gating it at build time is what keeps them working while the
    // published bundle stays free of it.
    if (!globalThis.__CINEMATIC_PRODUCTION__) {
      globalThis.__cinematicPlayer = player;
      globalThis.__audioManager = audio;
      globalThis.__initialPlayerIndex = player.initialIndex;
    }
    document.querySelector('#retry-button').addEventListener('click', () => globalThis.location.reload());
  } catch (error) {
    player?.destroy();
    audio?.destroy();
    storage?.dispose();
    const message = error?.code === 'manifest-unavailable' ? 'O conteúdo da narrativa não está disponível.' : error?.code === 'manifest-malformed' ? 'O conteúdo da narrativa está corrompido.' : 'O conteúdo da narrativa é incompatível com este player.';
    showError(message);
  }
}

void boot();

