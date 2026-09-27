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

async function boot() {
  let storage;
  let audio;
  let player;
  try {
    storage = createStorageManager();
    const story = await loadStory(storyUrl);
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
    player.schedule();
    document.title = story.title;
    document.querySelector('#story-title').textContent = story.title;
    player.setAudioState(audio.state());
    // T215: test-only hook, stripped from the production bundle by the
    // globalThis.__CINEMATIC_PRODUCTION__ define. Over 40 browser specs read
    // this, so gating it at build time is what keeps them working while the
    // published bundle stays free of it.
    if (!globalThis.__CINEMATIC_PRODUCTION__) globalThis.__cinematicPlayer = player;
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
