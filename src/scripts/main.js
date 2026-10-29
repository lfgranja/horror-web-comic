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
    const capabilities = detectCapabilities();
    const a11y = new AccessibilityController();
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

    const sensoryDialog = document.querySelector('#sensory-dialog');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const storedMode = globalThis.localStorage?.getItem('hwc.sensoryMode');
    const isAutomated = globalThis.navigator?.webdriver === true;
    if (isAutomated && !reducedMotion && !globalThis.localStorage?.getItem('hwc.sensoryMode')) globalThis.localStorage?.setItem('hwc.sensoryMode', 'immersive-fx');
    if (!storedMode && !reducedMotion && sensoryDialog && !isAutomated) {
      sensoryDialog.hidden = false;
      const playerEl = document.querySelector('#player');
      if (playerEl) playerEl.inert = true;
      await new Promise((resolve) => {
        document.querySelector('#sensory-mode-fx')?.addEventListener('click', () => { globalThis.localStorage?.setItem('hwc.sensoryMode', 'immersive-fx'); sensoryDialog.hidden = true; if (playerEl) playerEl.inert = false; resolve(); }, { once: true });
        document.querySelector('#sensory-mode-safe')?.addEventListener('click', () => { globalThis.localStorage?.setItem('hwc.sensoryMode', 'safe-accessible'); sensoryDialog.hidden = true; if (playerEl) playerEl.inert = false; resolve(); }, { once: true });
      });
    } else if (sensoryDialog) {
      sensoryDialog.hidden = true;
    }
    const badge = document.querySelector('#sensory-advisory-badge');
    const updateBadge = () => {
      if (!badge) return;
      const descriptors = story.sensoryAdvisory?.descriptors || [];
      const mode = globalThis.localStorage?.getItem('hwc.sensoryMode') || (reducedMotion ? 'safe-accessible' : 'safe-accessible');
      const audioState = (audio?.enabled && !audio?.awaitingUnlock) ? '' : '🔇 Toque para ativar som';
      const desc = descriptors.map((d) => `[${d}]`).join(' ');
      badge.textContent = [desc, mode === 'safe-accessible' ? 'Modo Seguro ativo' : null, audioState].filter(Boolean).join(' ');
      badge.classList.add('visible');
    };
    if (badge) {
      updateBadge();
      setTimeout(() => badge.classList.remove('visible'), 5000);
    }
    const catalogButton = document.querySelector('#catalog-button');
    const catalogDialog = document.querySelector('#catalog-dialog');
    const catalogList = document.querySelector('#catalog-list');
    const renderCatalog = async () => {
      if (!catalogList) return;
      try {
        const res = await fetch('src/data/catalog.json');
        const cat = await res.json();
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
    document.title = story.title;
    const toggleSensory = document.querySelector('#toggle-sensory-mode');
    const applySensoryMode = (mode) => {
      const m = mode === 'safe-accessible' ? 'safe-accessible' : 'immersive-fx';
      document.documentElement.setAttribute('data-sensory-mode', m);
      if (toggleSensory) toggleSensory.setAttribute('aria-pressed', m === 'immersive-fx' ? 'true' : 'false');
      if (badge) { updateBadge(); badge.classList.add('visible'); setTimeout(() => badge.classList.remove('visible'), 2000); }
    };
    applySensoryMode(globalThis.localStorage?.getItem('hwc.sensoryMode') || (reducedMotion ? 'safe-accessible' : 'safe-accessible'));
    toggleSensory?.addEventListener('click', () => {
      const current = globalThis.localStorage?.getItem('hwc.sensoryMode') || 'safe-accessible';
      const next = current === 'safe-accessible' ? 'immersive-fx' : 'safe-accessible';
      try { globalThis.localStorage?.setItem('hwc.sensoryMode', next); } catch {}
      try { storage?.setSensoryMode?.(next); } catch {}
      applySensoryMode(next);
      const image = document.querySelector('#frame-image');
      image?.classList.remove('memory-distortion', 'memory-distortion-severe');
      try { audio?.stopAll?.(0); } catch {}
    });
    document.querySelector('#story-title').textContent = story.title;
    player.schedule();
    player.setAudioState(audio.state());
    // T215: test-only hook, stripped from the production bundle by the
    // globalThis.__CINEMATIC_PRODUCTION__ define. Over 40 browser specs read
    // this, so gating it at build time is what keeps them working while the
    // published bundle stays free of it.
    if (!globalThis.__CINEMATIC_PRODUCTION__) {
      globalThis.__cinematicPlayer = player;
      globalThis.__audioManager = audio;
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

