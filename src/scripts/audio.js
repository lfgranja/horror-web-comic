import { lightAudioSource } from './light-variants.js';

const FADE_IN_DURATION = 300;
const SCENE_FADE_DURATION = 500;
const FRAME_FADE_DURATION = 300;
const STOP_DURATION = 90;

// T199: volume used for the autoplay probe, immediately before play().
// Chromium (and the other engines) treat a media element with volume === 0 as
// MUTED, and muted autoplay is permitted. Setting volume to 0 before the first
// play() therefore made the browser grant playback, so play() resolved instead
// of rejecting with NotAllowedError: markBlocked() was never reached, the
// "toque para iniciar" overlay never appeared (FR-004, FR-016, SC-003), and
// fadeIn then ramped the element up to full gain with no user gesture at all.
// A tiny non-zero value keeps the element out of the "muted" category, so the
// real autoplay policy decides, while remaining inaudible — the audible ramp
// still starts from silence inside fadeIn().
const AUTOPLAY_PROBE_VOLUME = 0.01;



function clamp(value, minimum, maximum) {
  const number = Number.isFinite(value) ? value : minimum;
  return Math.min(maximum, Math.max(minimum, number));
}

function fadeProgress(elapsed, duration) {
  if (!(duration > 0)) return 1;
  return clamp(elapsed / duration, 0, 1);
}

export class AudioManager {
  constructor({ story, storage, a11y, capabilities, onStateChange }) {
    this.story = story;
    this.storage = storage;
    this.a11y = a11y;
    this.capabilities = capabilities;
    this.onStateChange = onStateChange;
    const saved = storage.load();
    this.enabled = saved.audioEnabled;
    this.volume = saved.volume;
    this.userSpeed = saved.speed;
    this.paused = false;
    this.hasStarted = false;
    this.sessionBlocked = false;
    this.awaitingUnlock = false;
    this.silentContinuation = false;
    this.currentSceneIndex = 0;
    this.currentFrameId = null;
    this.sceneElements = new Map();
    this.frameElements = new Map();
    this.failed = new Set();
    this.fadeSequence = 0;
    this.lifecycleGeneration = 0;
    this.playRequests = new Map();
    this.activeElementKeys = new Set();
    this.activeFrameKeys = new Set();
    this.elementListeners = [];
    this.startRecord = null;
    this.unlockInProgress = false;
    this.destroyed = false;
    this.createElements();
    this.updatePreloadPolicy();
    // T215: test-only instrumentation, dropped from the production bundle by the
    // globalThis.__CINEMATIC_PRODUCTION__ define in scripts/build.mjs.
    // T215: test-only instrumentation. The guard is inlined rather than held in a
    // module const on purpose: scripts/build.mjs substitutes a literal `true` for
    // globalThis.__CINEMATIC_PRODUCTION__, and an inlined `!true && …` is dropped
    // entirely by the minifier, whereas a const would only be folded to `false`
    // and the hook would survive as dead text in the published bundle.
    if (!globalThis.__CINEMATIC_PRODUCTION__ && globalThis.__audioInstrument) globalThis.__audioInstrument.newElementsCreated = 0;
    this.bindControls();
    this.emit();
  }

  createElements() {
    const currentScene = this.currentSceneIndex ?? 0;
    const isNormal = !(this.capabilities?.slowConnection || this.capabilities?.saveData);
    this.story.scenes.forEach((scene, sceneIndex) => {
      if (scene.audio) {
        const element = this.createElement(scene.audio, `scene-${sceneIndex}`, isNormal ? ((sceneIndex === currentScene || sceneIndex === currentScene + 1) ? 'auto' : 'none') : (sceneIndex === currentScene ? 'metadata' : 'none'));
        this.sceneElements.set(sceneIndex, element);
      }
      for (const frame of scene.frames) {
        if (frame.audio) {
          const inCurrentOrNext = sceneIndex === currentScene || sceneIndex === currentScene + 1;
          const preload = isNormal ? (inCurrentOrNext ? 'auto' : 'none') : (sceneIndex === currentScene ? 'metadata' : 'none');
          const element = this.createElement(frame.audio, `frame-${frame.id}`, preload);
          this.frameElements.set(frame.id, element);
        }
      }
    });
  }

  createElement(track, key, preloadValue) {
    const source = this.capabilities?.shouldDegrade ? lightAudioSource(track.src) : track.src;
    const element = new Audio(source);
    element.preload = preloadValue || 'auto';
    element.volume = 0;
    element.loop = track.loop ?? true;
    element.dataset.trackKey = key;
    this.listenToElement(element, 'error', () => this.handleMediaFailure(key, element));
    this.listenToElement(element, 'stalled', () => this.handleMediaStall(key, element));
    this.listenToElement(element, 'playing', () => this.handleMediaPlaying(key, element));
    this.listenToElement(element, 'pause', () => this.handleMediaPause(key, element));
    this.listenToElement(element, 'ended', () => this.handleMediaEnded(key, element));
    return element;
  }

  listenToElement(element, eventName, handler) {
    element.addEventListener(eventName, handler);
    this.elementListeners.push({ element, eventName, handler });
  }

  updatePreloadPolicy() {
    const normal = !(this.capabilities?.slowConnection || this.capabilities?.saveData);
    this.story.scenes.forEach((scene, sceneIndex) => {
      const sceneElement = this.sceneElements.get(sceneIndex);
      if (sceneElement) sceneElement.preload = normal ? (sceneIndex === this.currentSceneIndex || sceneIndex === this.currentSceneIndex + 1 ? 'auto' : 'none') : (sceneIndex === this.currentSceneIndex ? 'metadata' : 'none');
      for (const frame of scene.frames) {
        const frameElement = this.frameElements.get(frame.id);
        if (!frameElement) continue;
        frameElement.preload = normal ? (sceneIndex === this.currentSceneIndex || sceneIndex === this.currentSceneIndex + 1 ? 'auto' : 'none') : (sceneIndex === this.currentSceneIndex ? 'metadata' : 'none');
      }
    });
  }

  isElementTarget(target) {
    return typeof Element !== 'undefined' && target instanceof Element;
  }

  isInputTarget(target) {
    if (!this.isElementTarget(target)) return false;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return true;
    return Boolean(target.isContentEditable);
  }

  isQualifiedKeydown(event) {
    if (event.key === 'Escape' || event.ctrlKey || event.metaKey || event.altKey) return false;
    if (this.isInputTarget(event.target)) return false;
    return true;
  }

  isPlayerPauseShortcut(event) {
    const key = event.key.toLowerCase();
    return key === ' ' || key === 'spacebar' || key === 'k' || key === 'm';
  }

  bindControls() {
    const toggle = document.querySelector('#audio-toggle');
    const silent = document.querySelector('#continue-silent');
    const player = document.querySelector('#player');
    this.player = player;
    toggle?.addEventListener('click', () => this.toggle());
    silent?.addEventListener('click', () => this.continueSilently());
    this.gestureHandler = (event) => {
      const target = event.target;
      if (this.isElementTarget(target) && target.closest('#continue-silent')) return;
      if (this.isInputTarget(target)) return;
      if (this.awaitingUnlock) void this.unlock();
    };
    for (const eventName of ['pointerup', 'touchend', 'keydown', 'click']) {
      player?.addEventListener(eventName, this.gestureHandler, { passive: true });
    }
    this.documentClickHandler = this.gestureHandler;
    document.addEventListener('click', this.documentClickHandler);
    this.documentKeydownHandler = (event) => {
      const target = event.target;
      if (!this.isQualifiedKeydown(event)) return;
      if (this.isElementTarget(target) && target.closest('#continue-silent')) return;
      if (!this.awaitingUnlock || !this.enabled || this.silentContinuation) return;
      const insidePlayer = this.isElementTarget(target) && this.player?.contains(target);
      if (insidePlayer && this.isPlayerPauseShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
      void this.unlock();
    };
    document.addEventListener('keydown', this.documentKeydownHandler, true);
  }

  isGenerationCurrent(generation) {
    return !this.destroyed && generation === this.lifecycleGeneration;
  }

  canStart(generation) {
    return this.isGenerationCurrent(generation) && this.enabled && !this.paused && !this.awaitingUnlock && !this.silentContinuation;
  }

  invalidateLifecycle() {
    this.lifecycleGeneration += 1;
    this.fadeSequence += 1;
    this.playRequests.clear();
    this.activeElementKeys.clear();
    this.activeFrameKeys.clear();
    this.startRecord = null;
    return this.lifecycleGeneration;
  }

  markPlaying(element) {
    const key = element.dataset.trackKey;
    this.activeElementKeys.add(key);
    if (key.startsWith('frame-')) this.activeFrameKeys.add(key);
  }

  isElementPlaying(element) {
    const key = element.dataset.trackKey;
    if (this.failed.has(key)) return false;
    // T198: an element inside a fade-out ramp is on its way to silence and is
    // only paused when the ramp completes. Reporting it as "playing" made
    // playCurrentScene() take its early return (markPlaying + applyMix, with no
    // play() and no fadeIn), after which the ramp finished, paused the element,
    // and applyMix() wrote the full target gain onto a paused element that
    // nothing ever restarted. Toggling back on inside the ~90 ms stop ramp is
    // enough to hit it — a double-tap on the toggle, or two fast M presses.
    if (element.dataset.fadeDirection === 'out') return false;
    if (this.activeElementKeys.has(key)) return true;
    return !element.paused && !element.ended;
  }

  isCurrentFrameElement(element) {
    const key = element.dataset.trackKey;
    return key.startsWith('frame-') && this.currentFrameId === key.slice('frame-'.length);
  }

  getActiveFrameElement() {
    if (!this.currentFrameId) return null;
    const element = this.frameElements.get(this.currentFrameId);
    if (!element || !this.activeFrameKeys.has(element.dataset.trackKey) || element.ended) return null;
    return element;
  }

  isFadeActive(element) {
    return Boolean(element.dataset.fadeToken);
  }

  beginFade(element, generation = this.lifecycleGeneration, direction = 'in') {
    clearTimeout(Number(element.dataset.fadeTimer) || 0);
    this.fadeSequence += 1;
    const token = this.fadeSequence;
    element.dataset.fadeToken = String(token);
    element.dataset.fadeGeneration = String(generation);
    // T198: record which way the ramp is going. `stopAll` only pauses the
    // element at the END of the ramp, so for STOP_DURATION ms an element being
    // faded out is still unpaused and looks "playing" to isElementPlaying().
    element.dataset.fadeDirection = direction;
    return { token, generation };
  }

  isFadeCurrent(element, fade) {
    return this.isGenerationCurrent(fade.generation) && element.dataset.fadeToken === String(fade.token) && element.dataset.fadeGeneration === String(fade.generation);
  }

  clearFade(element) {
    clearTimeout(Number(element.dataset.fadeTimer) || 0);
    delete element.dataset.fadeTimer;
    delete element.dataset.fadeToken;
    delete element.dataset.fadeGeneration;
    delete element.dataset.fadeDirection;
  }

  requestPlay(element, generation, force = false) {
    const key = element.dataset.trackKey;
    const existing = this.playRequests.get(key);
    if (existing?.generation === generation) return existing.promise;
    if (!force && this.isElementPlaying(element)) return Promise.resolve();
    let result;
    try {
      result = element.play();
    } catch (error) {
      result = Promise.reject(error);
    }
    const promise = Promise.resolve(result);
    const record = { generation, promise };
    this.playRequests.set(key, record);
    promise.then(
      () => {
        if (this.playRequests.get(key) === record) this.playRequests.delete(key);
      },
      () => {
        if (this.playRequests.get(key) === record) this.playRequests.delete(key);
      }
    );
    return promise;
  }

  async start(generation = this.lifecycleGeneration) {
    if (!this.canStart(generation)) {
      this.emit();
      return false;
    }
    this.hasStarted = true;
    if (this.startRecord?.generation === generation) return this.startRecord.promise;
    const record = { generation, promise: null };
    this.startRecord = record;
    record.promise = (async () => {
      const sceneStart = this.playCurrentScene(generation);
      const frameStart = this.currentFrameId ? this.playFrame(this.currentFrameId, generation) : Promise.resolve(false);
      await Promise.all([sceneStart, frameStart]);
      if (!this.canStart(generation)) return false;
      this.applyMix();
      this.emit();
      return true;
    })();
    try {
      return await record.promise;
    } finally {
      if (this.startRecord === record) this.startRecord = null;
    }
  }

  async playCurrentScene(generation = this.lifecycleGeneration) {
    const sceneIndex = this.currentSceneIndex;
    const element = this.sceneElements.get(sceneIndex);
    if (!element || this.failed.has(element.dataset.trackKey) || !this.canStart(generation)) return false;
    const key = element.dataset.trackKey;
    if (this.isElementPlaying(element)) {
      this.markPlaying(element);
      this.applyMix();
      return true;
    }
    const track = this.story.scenes[sceneIndex]?.audio;
    const targetVolume = clamp(this.volume * (track?.volume ?? 0.6), 0, 1);
    // T199: probe volume, not silence — see AUTOPLAY_PROBE_VOLUME.
    element.volume = AUTOPLAY_PROBE_VOLUME;
    try {
      await this.requestPlay(element, generation);
    } catch (error) {
      return this.handlePlayFailure(error, generation, key, sceneIndex, null);
    }
    if (!this.canStart(generation) || this.currentSceneIndex !== sceneIndex || this.sceneElements.get(sceneIndex) !== element || element.ended) return false;
    this.markPlaying(element);
    this.fadeIn(element, targetVolume, FADE_IN_DURATION, generation);
    this.applyMix();
    return true;
  }

  async playFrame(frameId, generation = this.lifecycleGeneration) {
    const sceneIndex = this.currentSceneIndex;
    const element = this.frameElements.get(frameId);
    const track = this.story.scenes[sceneIndex]?.frames.find((item) => item.id === frameId)?.audio;
    if (!element || !track || this.failed.has(element.dataset.trackKey) || !this.canStart(generation)) return false;
    const key = element.dataset.trackKey;
    if (this.isElementPlaying(element)) {
      this.markPlaying(element);
      this.applyMix();
      return true;
    }
    const targetVolume = clamp(this.volume * (track.volume ?? 0.6), 0, 1);
    // T199: probe volume, not silence — see AUTOPLAY_PROBE_VOLUME.
    element.volume = AUTOPLAY_PROBE_VOLUME;
    try {
      await this.requestPlay(element, generation);
    } catch (error) {
      return this.handlePlayFailure(error, generation, key, sceneIndex, frameId);
    }
    if (!this.canStart(generation) || this.currentFrameId !== frameId || this.currentSceneIndex !== sceneIndex || this.frameElements.get(frameId) !== element || element.ended) return false;
    this.markPlaying(element);
    this.fadeIn(element, targetVolume, FADE_IN_DURATION, generation);
    this.applyMix();
    return true;
  }

  handlePlayFailure(error, generation, key, sceneIndex, frameId) {
    if (!this.isGenerationCurrent(generation) || !this.enabled || this.paused || this.silentContinuation) return false;
    if (this.currentSceneIndex !== sceneIndex || (frameId !== null && this.currentFrameId !== frameId)) return false;
    if (error?.name === 'NotAllowedError') {
      this.markBlocked();
      return false;
    }
    this.failed.add(key);
    this.activeElementKeys.delete(key);
    this.activeFrameKeys.delete(key);
    this.applyMix();
    this.emit();
    return false;
  }

  markBlocked() {
    if (this.destroyed) return;
    const generation = this.invalidateLifecycle();
    this.sessionBlocked = true;
    this.awaitingUnlock = true;
    this.silentContinuation = false;
    this.stopAll(0, generation);
    this.showBlocked();
  }

  showBlocked() {
    const overlay = document.querySelector('#blocked-overlay');
    const hint = document.querySelector('#audio-hint');
    const status = document.querySelector('#audio-status');
    if (overlay) {
      overlay.hidden = false;
      const focusTarget = overlay.querySelector('button, [href], input, select, textarea, [tabindex]') || overlay;
      if (!overlay.contains(document.activeElement)) focusTarget.focus({ preventScroll: true });
    }
    if (hint) hint.textContent = 'O navegador bloqueou o som. Toque na página para ativar.';
    if (status) status.textContent = 'Som bloqueado pelo navegador';
    this.emit();
  }

  continueSilently() {
    if (this.destroyed) return;
    const generation = this.invalidateLifecycle();
    this.silentContinuation = true;
    this.enabled = false;
    // T211: "continuar sem som" is a real audio preference, not a session-only
    // dismissal. It wrote nothing, so `hwc.audio` stayed absent, the documented
    // default `audioEnabled: true` applied on the next visit, and the player
    // re-attempted autoplay and re-showed the overlay every single time. FR-007
    // requires the preference to be remembered between visits, and
    // contracts/storage-contract.md states that `hwc.audio = "off"` silences all
    // visits until the user switches it back on — which the always-visible
    // control still allows.
    this.storage.setAudio(false);
    this.awaitingUnlock = false;
    this.sessionBlocked = false;
    const overlay = document.querySelector('#blocked-overlay');
    if (overlay) overlay.hidden = true;
    this.stopAll(STOP_DURATION, generation);
    const player = document.querySelector('#player');
    if (document.activeElement?.closest?.('#blocked-overlay')) player?.focus({ preventScroll: true });
    this.emit();
  }

  unlockPrecreatedElements(generation) {
    const currentScene = this.sceneElements.get(this.currentSceneIndex);
    const currentFrame = this.currentFrameId ? this.frameElements.get(this.currentFrameId) : null;
    for (const element of this.allElements()) {
      if (this.failed.has(element.dataset.trackKey)) continue;
      // T199: unlock also has to be a real autoplay decision, otherwise the
      // per-element unlock that Safari demands is satisfied by a muted grant
      // that proves nothing.
      element.volume = AUTOPLAY_PROBE_VOLUME;
      const promise = this.requestPlay(element, generation, true);
      promise.catch(() => {});
      if (element !== currentScene && element !== currentFrame) {
        this.activeElementKeys.delete(element.dataset.trackKey);
        this.activeFrameKeys.delete(element.dataset.trackKey);
        element.pause();
      }
    }
  }

  async unlock() {
    if (this.destroyed || !this.enabled || !this.awaitingUnlock || this.unlockInProgress) return false;
    this.unlockInProgress = true;
    const generation = this.invalidateLifecycle();
    this.unlockPrecreatedElements(generation);
    this.awaitingUnlock = false;
    this.silentContinuation = false;
    this.sessionBlocked = false;
    const overlay = document.querySelector('#blocked-overlay');
    if (overlay) overlay.hidden = true;
    const player = document.querySelector('#player');
    if (document.activeElement?.closest?.('#blocked-overlay')) player?.focus({ preventScroll: true });
    this.emit();
    try {
      return await this.start(generation);
    } finally {
      this.unlockInProgress = false;
    }
  }

  toggle() {
    if (this.destroyed) return;
    if (!this.enabled) {
      this.enabled = true;
      this.storage.setAudio(true);
      this.awaitingUnlock = false;
      this.sessionBlocked = false;
      this.silentContinuation = false;
      if (!this.paused) void this.start();
      else this.emit();
      return;
    }
    if (this.awaitingUnlock) {
      void this.unlock();
      return;
    }
    this.enabled = false;
    this.silentContinuation = false;
    this.storage.setAudio(false);
    const generation = this.invalidateLifecycle();
    this.stopAll(STOP_DURATION, generation);
    this.emit();
  }

  setPaused(paused) {
    if (this.destroyed) return;
    if (paused) {
      if (this.paused) {
        this.emit();
        return;
      }
      this.paused = true;
      const generation = this.invalidateLifecycle();
      for (const element of this.allElements()) {
        this.activeElementKeys.delete(element.dataset.trackKey);
        this.activeFrameKeys.delete(element.dataset.trackKey);
        element.volume = 0;
        element.pause();
      }
      this.emit();
      return generation;
    }
    if (!this.paused && this.hasStarted) {
      this.emit();
      return;
    }
    this.paused = false;
    this.hasStarted = true;
    if (this.enabled && !this.awaitingUnlock && !this.silentContinuation) void this.start();
    this.emit();
  }

  setScene(sceneIndex) {
    if (this.destroyed || sceneIndex === this.currentSceneIndex) {
      this.applyMix();
      return;
    }
    const previous = this.sceneElements.get(this.currentSceneIndex);
    const previousScene = this.currentSceneIndex;
    const generation = this.invalidateLifecycle();
    this.currentSceneIndex = sceneIndex;
    this.updatePreloadPolicy();
    if (previous && previousScene !== sceneIndex) {
      if (this.enabled && !this.paused) this.fadeOut(previous, SCENE_FADE_DURATION, generation);
      else this.pauseElement(previous);
    }
    if (this.enabled && !this.paused && !this.awaitingUnlock && this.hasStarted) void this.playCurrentScene(generation);
    this.applyMix();
    this.emit();
  }

  setFrame(frameId) {
    if (this.destroyed || frameId === this.currentFrameId) {
      this.applyMix();
      return;
    }
    const generation = this.invalidateLifecycle();
    for (const [id, element] of this.frameElements) {
      if (id === frameId) continue;
      this.activeFrameKeys.delete(element.dataset.trackKey);
      if (this.activeElementKeys.has(element.dataset.trackKey) || !element.paused) {
        if (this.enabled && !this.paused) this.fadeOut(element, FRAME_FADE_DURATION, generation);
        else this.pauseElement(element);
      }
    }
    this.currentFrameId = frameId;
    this.applyMix();
    if (this.enabled && !this.paused && !this.awaitingUnlock && this.hasStarted && frameId) void this.playFrame(frameId, generation);
    this.emit();
  }

  setVolume(value) {
    if (this.destroyed) return;
    this.volume = this.storage.setVolume(value);
    this.applyMix();
    this.emit();
  }

  setSpeed(value) {
    if (this.destroyed) return;
    this.userSpeed = this.storage.setSpeed(value);
  }

  applyMix() {
    if (this.destroyed || this.paused || this.awaitingUnlock || this.silentContinuation) return;
    const scene = this.sceneElements.get(this.currentSceneIndex);
    const sceneTrack = this.story.scenes[this.currentSceneIndex]?.audio;
    const activeFrame = this.getActiveFrameElement();
    if (scene && sceneTrack && !this.failed.has(scene.dataset.trackKey) && !this.isFadeActive(scene)) {
      const target = clamp(this.volume * (sceneTrack.volume ?? 0.6) * (activeFrame ? 0.4 : 1), 0, 1);
      scene.volume = this.enabled ? target : 0;
    }
    const frame = this.currentFrameId ? this.frameElements.get(this.currentFrameId) : null;
    const frameTrack = this.story.scenes[this.currentSceneIndex]?.frames.find((item) => item.id === this.currentFrameId)?.audio;
    if (frame && frameTrack && !this.failed.has(frame.dataset.trackKey) && !this.isFadeActive(frame)) {
      const target = clamp(this.volume * (frameTrack.volume ?? 0.6), 0, 1);
      frame.volume = this.enabled && activeFrame === frame ? target : 0;
    }
  }

  pauseElement(element) {
    this.activeElementKeys.delete(element.dataset.trackKey);
    this.activeFrameKeys.delete(element.dataset.trackKey);
    element.volume = 0;
    element.pause();
  }

  stopAll(duration = STOP_DURATION, generation = this.lifecycleGeneration) {
    for (const element of this.allElements()) this.fadeOut(element, duration, generation);
  }

  scheduleFadeCompletion(element, fade, duration, complete) {
    const timer = setTimeout(() => {
      if (!this.isFadeCurrent(element, fade)) return;
      complete();
    }, Math.max(0, duration) + 10);
    element.dataset.fadeTimer = String(timer);
  }

  fadeIn(element, targetVolume, duration, generation = this.lifecycleGeneration) {
    const target = clamp(targetVolume, 0, 1);
    const fade = this.beginFade(element, generation, 'in');
    element.volume = 0;
    if (duration <= 0) {
      element.volume = target;
      this.clearFade(element);
      this.applyMix();
      return;
    }
    const startTime = performance.now();
    const tick = (now) => {
      if (!this.isFadeCurrent(element, fade)) return;
      const progress = fadeProgress(now - startTime, duration);
      element.volume = target * progress;
      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }
      element.volume = target;
      this.clearFade(element);
      this.applyMix();
    };
    this.scheduleFadeCompletion(element, fade, duration, () => {
      element.volume = target;
      this.clearFade(element);
      this.applyMix();
    });
    requestAnimationFrame(tick);
  }

  fadeOut(element, duration, generation = this.lifecycleGeneration) {
    const fade = this.beginFade(element, generation, 'out');
    const startVolume = clamp(element.volume, 0, 1);
    if (duration <= 0) {
      element.volume = 0;
      this.clearFade(element);
      this.pauseElement(element);
      return;
    }
    const startTime = performance.now();
    const tick = (now) => {
      if (!this.isFadeCurrent(element, fade)) return;
      const progress = fadeProgress(now - startTime, duration);
      element.volume = startVolume * (1 - progress);
      if (progress < 1) {
        requestAnimationFrame(tick);
        return;
      }
      element.volume = 0;
      this.clearFade(element);
      this.pauseElement(element);
      this.applyMix();
    };
    this.scheduleFadeCompletion(element, fade, duration, () => {
      element.volume = 0;
      this.clearFade(element);
      this.pauseElement(element);
      this.applyMix();
    });
    requestAnimationFrame(tick);
  }

  handleMediaPlaying(key, element) {
    if (this.destroyed) return;
    if (key.startsWith('frame-')) {
      if (!this.enabled || this.paused || this.awaitingUnlock || !this.isCurrentFrameElement(element)) return;
      this.markPlaying(element);
      this.applyMix();
      this.emit();
      return;
    }
    const sceneIndex = Number(key.slice('scene-'.length));
    if (sceneIndex !== this.currentSceneIndex || !this.enabled || this.paused || this.awaitingUnlock) return;
    this.markPlaying(element);
    this.applyMix();
    this.emit();
  }

  handleMediaPause(key, element) {
    this.activeElementKeys.delete(key);
    if (key.startsWith('frame-')) {
      this.activeFrameKeys.delete(key);
      if (this.isCurrentFrameElement(element)) this.applyMix();
    }
  }

  handleMediaEnded(key, element) {
    this.activeElementKeys.delete(key);
    this.activeFrameKeys.delete(key);
    if (this.isCurrentFrameElement(element)) this.applyMix();
  }

  handleMediaStall(key, element) {
    if (this.destroyed) return;
    this.activeElementKeys.delete(key);
    this.activeFrameKeys.delete(key);
    if (!this.isFadeActive(element)) element.volume = 0;
    this.applyMix();
    this.emit();
  }

  handleMediaFailure(key, element) {
    if (this.destroyed) return;
    this.failed.add(key);
    this.activeElementKeys.delete(key);
    this.activeFrameKeys.delete(key);
    if (this.isCurrentFrameElement(element) || this.sceneElements.get(this.currentSceneIndex) === element) {
      if (!this.isFadeActive(element)) element.volume = 0;
      this.applyMix();
    }
    this.emit();
  }

  allElements() {
    return [...this.sceneElements.values(), ...this.frameElements.values()];
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.invalidateLifecycle();
    for (const eventName of ['pointerup', 'touchend', 'keydown', 'click']) {
      this.player?.removeEventListener(eventName, this.gestureHandler);
    }
    document.removeEventListener('click', this.documentClickHandler);
    document.removeEventListener('keydown', this.documentKeydownHandler, true);
    for (const { element, eventName, handler } of this.elementListeners) element.removeEventListener(eventName, handler);
    this.elementListeners.length = 0;
    for (const element of this.allElements()) {
      this.activeElementKeys.delete(element.dataset.trackKey);
      this.activeFrameKeys.delete(element.dataset.trackKey);
      element.pause();
    }
    this.playRequests.clear();
    this.startRecord = null;
  }

  state() {
    if (!this.enabled) return 'off';
    if (this.sessionBlocked || this.awaitingUnlock) return 'blocked';
    if (this.paused) return 'paused';
    return 'on';
  }

  emit() {
    if (this.destroyed) return;
    const state = this.state();
    const toggle = document.querySelector('#audio-toggle');
    const status = document.querySelector('#audio-status');
    const hint = document.querySelector('#audio-hint');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(this.enabled));
      toggle.dataset.state = state;
      if (state === 'blocked') toggle.setAttribute('aria-disabled', 'true');
      else toggle.removeAttribute('aria-disabled');
    }
    if (status) {
      status.textContent = state === 'blocked' ? 'Som bloqueado pelo navegador' : state === 'off' ? 'Som desligado' : state === 'paused' ? 'Som pausado' : 'Som ligado';
    }
    if (hint && state !== 'blocked') hint.textContent = 'O som pode ser desativado a qualquer momento.';
    this.onStateChange?.(state);
  }
}

export function createAudioManager(options) {
  return new AudioManager(options);
}
