import { watchCapabilities } from './capabilities.js';
import { lightUrl, resolveImageSources } from './light-variants.js';

const DEFAULT_DURATION = 1500;
const DEFAULT_TRANSITION = { type: 'fade', durationMs: 600, easing: 'ease-in-out' };
const MINIMUM_DWELL = 250;
const COALESCE_WINDOW = 400;
const IMAGE_LOAD_TIMEOUT = 10_000;
// T208: the controls that no-op while the resume overlay demands an explicit
// resume. Listed here so setControlsSuspended() and the handler wiring cannot
// drift apart.
const NAVIGATION_CONTROLS = ['#home', '#previous-scene', '#previous-frame', '#next-frame', '#next-scene', '#end'];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function resolveDuration(frame, scene, story, speed) {
  const authored = frame.durationMs ?? scene.defaultFrameDurationMs ?? story.defaultFrameDurationMs ?? DEFAULT_DURATION;
  return Math.max(MINIMUM_DWELL, authored / speed);
}

function setSrcset(element, value, sizes) {
  if (!element) return;
  if (value) element.setAttribute('srcset', value);
  else element.removeAttribute('srcset');
  if (sizes) element.setAttribute('sizes', sizes);
  else element.removeAttribute('sizes');
}

function resolveTransition(frame, scene, story, reducedMotion, shouldDegrade) {
  if (reducedMotion) return { type: 'cut', durationMs: 0, easing: 'linear' };
  const transition = { ...DEFAULT_TRANSITION, ...(story.defaultTransition ?? {}), ...(scene.defaultTransition ?? {}), ...(frame.transition ?? {}) };
  if (shouldDegrade && transition.type !== 'cut' && transition.type !== 'none') {
    return { type: 'cut', durationMs: 0, easing: 'linear' };
  }
  return transition;
}

export class CinematicPlayer {
  constructor({ story, storage, audio, capabilities, a11y }) {
    this.story = story;
    this.storage = storage;
    this.audio = audio;
    this.capabilities = capabilities;
    this.a11y = a11y;
    this.status = 'idle';
    this.frames = [];
    this.scenes = story.scenes;
    this.timer = 0;
    this.transitionTimer = 0;
    this.lastNavigation = 0;
    this.pendingNavigation = null;
    this.autoStartTimer = 0;
    this.resumeRequired = false;
    this.destroyed = false;
    this.pendingNavigationAction = null;
    this.imageLoadTimer = 0;
    this.dwellStartedAt = 0;
    this.dwellEndedAt = 0;
    this.dwellDurationMs = 0;
    this.lastMeasuredDwellMs = null;
    this.controlHandlers = [];
    this.keydownHandler = null;
    this.visibilityHandler = null;
    this.orientationHandler = null;
    this.resizeHandler = null;
    this.scrollHandler = null;
    this.endOverlayShown = false;
    this.index = this.findInitialIndex();
    this.cacheDom();
    this.root.dataset.degraded = String(this.capabilities.shouldDegrade);
    this.root.dataset.reducedMotion = String(this.capabilities.reducedMotion);
    this.bindControls();
    this.applyAudioState = (state) => this.setAudioState(state);
    this.audio.onStateChange = this.applyAudioState;
    this.audio.setScene(this.frames[this.index].sceneIndex);
    this.audio.setFrame(this.frames[this.index].id);
    this.unsubscribeProgress = this.storage.onProgress((record) => this.adoptProgress(record));
    this.render();
    this.publishControlBarHeight();
    this.audio.setPaused(false);
    this.schedule();
    this.bindLifecycle();
    this.stopWatchingCapabilities = watchCapabilities((next) => this.updateCapabilities(next));
    this.autoStartTimer = setTimeout(() => {
      this.autoStartTimer = 0;
      if (this.status === 'idle') {
        this.status = 'playing';
        this.audio.setPaused(false);
        this.updateStatus();
        this.schedule();
      }
    }, 250);
  }

  cacheDom() {
    this.root = document.querySelector('#player');
    this.stage = document.querySelector('#frame-stage');
    this.picture = document.querySelector('#frame-picture');
    this.avifSource = document.querySelector('#frame-avif');
    this.webpSource = document.querySelector('#frame-webp');
    this.image = document.querySelector('#frame-image');
    this.placeholder = document.querySelector('#frame-placeholder');
    this.description = document.querySelector('#frame-description');
    this.progress = document.querySelector('#progress');
    this.counter = document.querySelector('#frame-counter');
    this.playButton = document.querySelector('#play-toggle');
    this.endOverlay = document.querySelector('#end-overlay');
    this.resumeOverlay = document.querySelector('#resume-overlay');
    this.volume = document.querySelector('#volume');
    this.speed = document.querySelector('#speed');
    this.controlBar = document.querySelector('.control-bar');
    this.imageReady = false;
    this.imageFallbackPending = false;
    this.imageStandardSource = null;
    this.imageLoadHandler = () => this.handleImageLoad();
    this.imageErrorHandler = () => this.handleImageError();
    this.image.addEventListener('load', this.imageLoadHandler);
    this.image.addEventListener('error', this.imageErrorHandler);
    // The description is announced on a debounce, so the control bar's height
    // changes AFTER render(). Re-publish it whenever the live region resizes,
    // otherwise --control-bar-height stays stale and the end-of-narrative card
    // covers the navigation controls (FR-033).
    this.descriptionResizeObserver = new ResizeObserver(() => this.publishControlBarHeight());
    if (this.description) this.descriptionResizeObserver.observe(this.description);
    // T214: the element-level keydown listener that used to live here is gone.
    // It was registered on #player, so its target could only ever be #player
    // itself (tabindex="0") or a descendant — and every descendant is a
    // button/input/select, all matched by the `closest(...)` guard. The
    // `preventDefault()` below it was therefore unreachable, while the comment
    // claimed a guarantee it did not provide. Real scroll suppression comes
    // solely from the document-level handler in bindHandlers(), which is the
    // one that must keep its preventDefault() (FR-010).
  }

  /**
   * Publish the control bar's measured height so the end-of-narrative overlay
   * can lay its card out strictly above the controls at any viewport. FR-033
   * requires those controls to stay operable once the story ends, and a
   * viewport-relative cap still overlapped them on short screens.
   */
  publishControlBarHeight() {
    const bar = this.controlBar;
    if (!bar || this.destroyed) return;
    const rect = bar.getBoundingClientRect();
    const height = Math.ceil(rect.height);
    if (height > 0) this.root.style.setProperty('--control-bar-height', `${height}px`);
    // The end overlay is fixed to the viewport while the control bar scrolls
    // with the document, so it also needs the bar's viewport-relative top edge:
    // the overlay's band must stop where the bar BEGINS, otherwise a card
    // centred in the band hangs back over the controls it must not intercept
    // (FR-033). Only the end overlay consumes it, so the (layout-forcing)
    // measurement is skipped until that overlay has been shown.
    if (this.endOverlayShown) {
      // The end overlay is a sibling of #player (both live under #app), so the
      // custom property has to be published on their shared ancestor for the
      // overlay's rule to see it. --control-bar-top is the bar's
      // viewport-relative top edge: the overlay's band must stop where the bar
      // begins, or a card centred in the band hangs back over the controls it
      // must not intercept (FR-033).
      const scope = this.endOverlay.closest('.app-shell') || this.root;
      scope.style.setProperty('--control-bar-top', `${Math.ceil(rect.top)}px`);
    }
  }

  buildFrames() {
    this.frames = [];
    this.scenes.forEach((scene, sceneIndex) => {
      scene.frames.forEach((frame, sceneFrameIndex) => {
        this.frames.push({ frame, scene, sceneIndex, sceneFrameIndex });
      });
    });
  }

  findInitialIndex() {
    this.buildFrames();
    const saved = this.storage.load().lastFrameId;
    const index = this.frames.findIndex((item) => item.frame.id === saved);
    return index < 0 ? 0 : index;
  }

  bindControls() {
    const actions = {
      '#play-toggle': () => this.togglePlay(),
      '#previous-frame': () => this.navigate(-1),
      '#next-frame': () => this.navigate(1),
      '#previous-scene': () => this.navigateScene(-1),
      '#next-scene': () => this.navigateScene(1),
      '#home': () => this.goHome(),
      '#end': () => this.goEnd(),
      '#replay': () => this.replay(),
      '#resume-button': () => this.resumeFromOverlay()
    };
    for (const [selector, handler] of Object.entries(actions)) {
      const element = document.querySelector(selector);
      if (!element) continue;
      element.addEventListener('click', handler);
      this.controlHandlers.push({ element, eventName: 'click', handler });
    }
    this.volume?.addEventListener('input', this.volumeHandler = () => {
      this.audio.setVolume(Number(this.volume.value) / 100);
      document.querySelector('#volume-value').textContent = `${this.volume.value}%`;
    });
    if (this.volumeHandler) this.controlHandlers.push({ element: this.volume, eventName: 'input', handler: this.volumeHandler });
    this.speed?.addEventListener('change', this.speedHandler = () => {
      this.audio.setSpeed(Number(this.speed.value));
      this.schedule();
    });
    if (this.speedHandler) this.controlHandlers.push({ element: this.speed, eventName: 'change', handler: this.speedHandler });
    this.keydownHandler = (event) => this.handleKeydown(event);
    document.addEventListener('keydown', this.keydownHandler);
  }

  bindLifecycle() {
    this.visibilityHandler = () => {
      if (!this.destroyed && document.hidden && this.status !== 'ended') this.pauseForFocusLoss();
    };
    this.orientationHandler = () => {
      if (this.destroyed) return;
      this.render();
    };
    this.resizeHandler = () => {
      if (this.destroyed) return;
      this.publishControlBarHeight();
    };
    this.scrollHandler = () => {
      if (this.destroyed) return;
      this.publishControlBarHeight();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    globalThis.addEventListener('orientationchange', this.orientationHandler);
    globalThis.addEventListener('resize', this.resizeHandler);
    globalThis.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  handleKeydown(event) {
    if (this.destroyed) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
    const key = event.key;
    if (target instanceof HTMLElement && target.closest('button') && (key === ' ' || key === 'Spacebar' || key === 'Enter')) return;
    if (key === ' ' || key === 'Spacebar' || key.toLowerCase() === 'k') {
      event.preventDefault();
      this.togglePlay();
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      if (event.shiftKey) this.navigateScene(1);
      else this.navigate(1);
    } else if (key === 'ArrowLeft') {
      event.preventDefault();
      if (event.shiftKey) this.navigateScene(-1);
      else this.navigate(-1);
    } else if (key === 'Home') {
      event.preventDefault();
      this.goHome();
    } else if (key === 'End') {
      event.preventDefault();
      this.goEnd();
    } else if (key.toLowerCase() === 'm') {
      event.preventDefault();
      this.audio.toggle();
    }
  }

  navigate(delta) {
    this.queueNavigation(() => {
      const target = this.index + delta;
      if (target < 0 || target >= this.frames.length) return;
      this.moveTo(target, false);
    });
  }

  navigateScene(delta) {
    this.queueNavigation(() => {
      const currentScene = this.frames[this.index].sceneIndex;
      const targetScene = currentScene + delta;
      if (targetScene < 0 || targetScene >= this.scenes.length) return;
      const target = this.frames.findIndex((item) => item.sceneIndex === targetScene);
      if (target >= 0) this.moveTo(target, false);
    });
  }

  queueNavigation(action) {
    if (this.destroyed) return;
    const now = Date.now();
    clearTimeout(this.pendingNavigation);
    const elapsed = now - this.lastNavigation;
    const delay = this.lastNavigation === 0 ? 0 : Math.max(0, COALESCE_WINDOW - elapsed);
    this.lastNavigation = now;
    this.pendingNavigationAction = action;
    this.pendingNavigation = setTimeout(() => {
      this.pendingNavigation = null;
      const pending = this.pendingNavigationAction;
      this.pendingNavigationAction = null;
      pending?.();
    }, delay);
  }

  flushPendingNavigation() {
    if (!this.pendingNavigation) return;
    clearTimeout(this.pendingNavigation);
    this.pendingNavigation = null;
    const pending = this.pendingNavigationAction;
    this.pendingNavigationAction = null;
    pending?.();
    this.lastNavigation = 0;
  }

  moveTo(target, shouldPlay) {
    if (this.destroyed || this.resumeRequired) return;
    if (!Number.isInteger(target) || target < 0 || target >= this.frames.length) return;
    const scrollPosition = globalThis.scrollY;
    clearTimeout(this.timer);
    this.timer = 0;
    this.cancelTransition();
    this.endOverlay.hidden = true;
    this.audio.setPaused(true);
    this.index = target;
    this.status = shouldPlay ? 'playing' : 'paused';
    // T202: arriving at the last frame by manual navigation must reach the ended
    // state, not just render the final frame paused with no indication the story
    // is over (US1/AC4, FR-033). FR-003's "no-op at the limit" is preserved: it
    // excuses the *End control* doing nothing when already on the last frame,
    // which is handled by the early return in goEnd(), not here.
    if (!shouldPlay && target === this.frames.length - 1) this.status = 'ended';
    this.storage.saveProgress(this.frames[this.index].frame.id);
    this.render();
    if (shouldPlay) {
      this.audio.setPaused(false);
      this.schedule();
    }
    this.updateStatus();
    if (globalThis.scrollY !== scrollPosition) globalThis.scrollTo(0, scrollPosition);
  }

  goHome() {
    this.queueNavigation(() => {
      if (this.index === 0 && this.status !== 'ended') return;
      this.moveTo(0, this.status === 'ended');
    });
  }

  /**
   * Reveal the end-of-narrative overlay.
   *
   * The end card is laid out against `--control-bar-bottom`, the control bar's
   * viewport-relative bottom edge, so the reserved band always clears the
   * navigation controls the card must not intercept (FR-033). That measurement
   * depends on the bar's final layout, which can still be settling when the
   * debounced frame description lands, so it is taken here — with the overlay
   * already visible — and repeated on the next frame.
   */
  showEndOverlay() {
    const wasHidden = this.endOverlay.hidden;
    this.endOverlay.hidden = false;
    this.endOverlayShown = true;
    if (!wasHidden) return;
    this.publishControlBarHeight();
    requestAnimationFrame(() => this.publishControlBarHeight());
  }

  goEnd() {
    this.queueNavigation(() => {
      if (this.index === this.frames.length - 1) return;
      this.moveTo(this.frames.length - 1, false);
      this.status = 'ended';
      this.showEndOverlay();
      this.updateStatus();
      this.focusOverlay(this.endOverlay);
    });
  }

  togglePlay() {
    if (this.status === 'idle') {
      this.pause();
      return;
    }
    if (this.status === 'playing') {
      this.pause();
    } else if (this.status === 'ended') {
      this.replay();
    } else if (this.status === 'idle') {
      // T210: `idle` is the pre-boot state, so the first press must START. It
      // used to fall through to pause(), which cancelled the auto-start timer
      // and left the status at 'paused' while the control's accessible name
      // already read "Reproduzir" — so the first press was consumed and the
      // user had to press twice to get what the label promised (US1/AC5).
      this.startPlayback();
    } else {
      this.resume();
    }
  }

  startPlayback() {
    if (this.destroyed || this.resumeRequired) return;
    clearTimeout(this.autoStartTimer);
    this.autoStartTimer = 0;
    this.flushPendingNavigation();
    this.status = 'playing';
    this.audio.setPaused(false);
    this.render();
    this.schedule();
    this.updateStatus();
  }

  pause() {
    if (this.destroyed || this.status === 'ended') return;
    clearTimeout(this.autoStartTimer);
    this.autoStartTimer = 0;
    this.flushPendingNavigation();
    this.status = 'paused';
    clearTimeout(this.timer);
    this.timer = 0;
    this.audio.setPaused(true);
    this.storage.saveProgress(this.frames[this.index].frame.id);
    this.updateStatus();
  }

  resume() {
    if (this.resumeRequired) return;
    this.resumeOverlay.hidden = true;
    this.status = 'playing';
    this.audio.setPaused(false);
    this.render();
    this.schedule();
    this.updateStatus();
  }

  focusOverlay(overlay) {
    if (!overlay || overlay.hidden || overlay.contains(document.activeElement)) return;
    const focusTarget = overlay.querySelector('button, [href], input, select, textarea, [tabindex]') || overlay;
    focusTarget.focus({ preventScroll: true });
  }

  pauseForFocusLoss() {
    this.status = 'paused';
    clearTimeout(this.autoStartTimer);
    this.autoStartTimer = 0;
    clearTimeout(this.pendingNavigation);
    this.pendingNavigation = null;
    this.pendingNavigationAction = null;
    clearTimeout(this.timer);
    this.timer = 0;
    this.cancelTransition();
    this.audio.setPaused(true);
    this.storage.saveProgress(this.frames[this.index].frame.id);
    this.resumeRequired = true;
    this.resumeOverlay.hidden = false;
    this.setControlsSuspended(true);
    this.updateStatus();
    this.focusOverlay(this.resumeOverlay);
  }

  resumeFromOverlay() {
    if (!this.resumeRequired) return;
    this.resumeRequired = false;
    this.setControlsSuspended(false);
    this.resume();
    this.root?.focus({ preventScroll: true });
  }

  /**
   * T208: while the resume overlay is up, every navigation control is a no-op
   * (`moveTo` returns early while resumeRequired). With `aria-modal` removed
   * from the overlay — these are deliberately non-modal status notices, because
   * FR-016 needs the page to stay interactive and FR-033 needs the navigation
   * bar to stay live — focus can legitimately land on those controls. Marking
   * them `aria-disabled` is what tells a screen-reader user why they do
   * nothing, instead of leaving an enabled-looking button that silently fails.
   */
  setControlsSuspended(suspended) {
    for (const selector of NAVIGATION_CONTROLS) {
      const control = this.root.querySelector(selector);
      if (!control) continue;
      if (suspended) control.setAttribute('aria-disabled', 'true');
      else control.removeAttribute('aria-disabled');
    }
  }

  replay() {
    this.queueNavigation(() => {
      this.moveTo(0, true);
    });
  }

  schedule() {
    if (this.destroyed) return;
    clearTimeout(this.timer);
    this.timer = 0;
    if (this.status !== 'playing' || !this.imageReady) return;
    const item = this.frames[this.index];
    const duration = resolveDuration(item.frame, item.scene, this.story, Number(this.speed?.value || 1));
    this.dwellStartedAt = performance.now();
    this.dwellDurationMs = duration;
    this.timer = setTimeout(() => {
      this.timer = 0;
      this.advance();
    }, duration);
  }

  advance() {
    if (this.destroyed || this.status !== 'playing') return;
    if (this.index >= this.frames.length - 1) {
      this.status = 'ended';
      this.audio.setPaused(true);
      this.showEndOverlay();
      this.updateStatus();
      this.focusOverlay(this.endOverlay);
      return;
    }
    this.dwellEndedAt = performance.now();
    this.lastMeasuredDwellMs = this.dwellStartedAt ? this.dwellEndedAt - this.dwellStartedAt : null;
    this.index += 1;
    this.storage.saveProgress(this.frames[this.index].frame.id);
    this.render();
    this.schedule();
  }

  applyImageSources(sources, sizes) {
    setSrcset(this.avifSource, sources.avif, sizes);
    setSrcset(this.webpSource, sources.webp, sizes);
    setSrcset(this.image, sources.fallback, sizes);
  }

  render() {
    if (this.destroyed) return;
    const item = this.frames[this.index];
    const frame = item.frame;
    const transition = resolveTransition(frame, item.scene, this.story, this.capabilities.reducedMotion, this.capabilities.shouldDegrade);
    this.cancelTransition();
    this.root.dataset.frameId = frame.id;
    // The RESOLVED transition type is published here and stays observable while
    // the frame loads. T197 is enforced in CSS instead: the keyframes are bound
    // to `.frame-stage[data-transition='…']:not([data-image-loading='true'])`,
    // so the animation only starts at the moment handleImageLoad() flips
    // data-image-loading to 'false' and reveals the image. Binding it to the
    // attribute write instead would have made the 600-700 ms fade run against a
    // `visibility: hidden` element, and reporting 'cut' until load would have
    // hidden the resolved value from every consumer of this attribute.
    this.root.dataset.transition = transition.type;
    this.stage.dataset.transition = transition.type;
    this.stage.dataset.imageError = 'false';
    this.stage.style.setProperty('--transition-duration', `${transition.durationMs}ms`);
    this.stage.style.setProperty('--transition-easing', transition.easing);
    this.pendingTransition = transition;
    this.stage.style.setProperty('--frame-aspect', `${frame.image.width} / ${frame.image.height}`);
    this.image.dataset.frameId = frame.id;
    this.image.alt = frame.alt;
    this.image.setAttribute('aria-describedby', 'frame-description');
    this.image.width = String(frame.image.width);
    this.image.height = String(frame.image.height);
    const degraded = this.capabilities.shouldDegrade;
    const sizes = frame.image.sizes || '100vw';
    const imageSources = resolveImageSources(frame.image);
    const selectedSources = degraded ? imageSources.light : imageSources.standard;
    this.imageStandardSources = imageSources.standard;
    this.applyImageSources(selectedSources, sizes);
    const standardSource = frame.image.fallback;
    const source = degraded ? lightUrl(standardSource) : standardSource;
    this.imageStandardSource = standardSource;
    this.imageFallbackPending = degraded && (
      source !== standardSource || selectedSources.fallback !== imageSources.standard.fallback
    );
    this.imageReady = false;
    this.stage.setAttribute('aria-busy', 'true');
    this.placeholder.hidden = false;
    this.placeholder.setAttribute('aria-hidden', 'false');
    const loadingMark = this.placeholder.querySelector('.loading-mark');
    const loadingLabel = this.placeholder.querySelector('.loading-label');
    if (loadingMark) loadingMark.hidden = false;
    if (loadingLabel) loadingLabel.textContent = 'Carregando quadro';
    // Keep the image laid out while it loads: it is the stage's only in-flow
    // content, so removing it from flow collapses the stage and shifts the
    // controls below (FR-015, SC-015).
    this.stage.dataset.imageLoading = 'true';
    this.image.style.visibility = 'hidden';
    this.image.src = source;
    clearTimeout(this.imageLoadTimer);
    this.imageLoadTimer = setTimeout(() => {
      if (!this.imageReady && this.image.dataset.frameId === frame.id) this.handleImageError();
    }, IMAGE_LOAD_TIMEOUT);
    if (this.image.complete && this.image.naturalWidth > 0) this.handleImageLoad();
    this.a11y.announce(frame.description);
    this.progress.setAttribute('aria-valuenow', String(this.index + 1));
    this.progress.setAttribute('aria-valuemax', String(this.frames.length));
    this.progress.setAttribute('aria-valuetext', `Quadro ${this.index + 1} de ${this.frames.length}`);
    this.progress.style.setProperty('--progress', `${((this.index + 1) / this.frames.length) * 100}%`);
    this.counter.textContent = `${this.index + 1} / ${this.frames.length}`;
    this.audio.setScene(item.sceneIndex);
    this.audio.setFrame(frame.id);
    this.preloadNext();
    this.updateStatus();
    this.publishControlBarHeight();
  }

  preloadNext() {
    if (this.destroyed || this.capabilities.slowConnection || this.capabilities.saveData) return;
    const next = this.frames[this.index + 1];
    if (!next) return;
    const sources = resolveImageSources(next.frame.image);
    const selected = this.capabilities.shouldDegrade ? sources.light : sources.standard;
    // T204: applyImageSources() installs the AVIF and WebP <source> elements
    // AHEAD of the <img> srcset, so the browser paints avif -> webp -> fallback
    // in that order. The old code preloaded `fallback` first, which on a
    // normal-connection session meant every frame advance downloaded one extra
    // JPEG that was immediately discarded, while the frame the user was actually
    // waiting for was not the frame that had been preloaded (FR-015, SC-008).
    // Probe format support once and preload the tier the <picture> will choose.
    const preferred = this.preferredImageFormat();
    const source = selected[preferred] || selected.fallback || selected.avif || selected.webp;
    if (!source) return;
    const preload = new Image();
    preload.decoding = 'async';
    preload.sizes = next.frame.image.sizes || '100vw';
    // The srcset is the width list for the SAME format tier, not the JPEG
    // fallback. Assigning a whole multi-candidate srcset string to .src, as the
    // previous version did, was a second bug on the same line.
    if (selected[preferred]) preload.srcset = selected[preferred];
    preload.src = source;
  }

  /**
   * T204: which format tier the <picture> will actually paint, resolved once
   * and cached. Detection is a two-line parse of a data URL, which needs no
   * network round trip and no feature-detection API that differs across engines.
   */
  preferredImageFormat() {
    if (this.preferredFormat) return this.preferredFormat;
    // canvas.toDataURL falls back to png/jpeg silently when the encoder is
    // missing, so the returned prefix is the actual capability. Synchronous and
    // dependency-free, which matters because preloadNext() may run before the
    // first paint.
    const supports = (mime) => {
      try {
        return document.createElement('canvas').toDataURL(mime).startsWith(`data:${mime}`);
      } catch {
        return false;
      }
    };
    this.preferredFormat = supports('image/avif') ? 'avif' : supports('image/webp') ? 'webp' : 'fallback';
    return this.preferredFormat;
  }

  cancelTransition() {
    clearTimeout(this.transitionTimer);
    this.transitionTimer = 0;
    this.stage.dataset.transition = 'cut';
    this.root.dataset.transition = 'cut';
    void this.stage.offsetWidth;
  }

  adoptProgress(record) {
    if (this.destroyed) return;
    const target = this.frames.findIndex((item) => item.frame.id === record.frameId);
    if (target < 0 || target === this.index) return;
    const shouldPlay = this.status === 'playing';
    const wasEnded = this.status === 'ended';
    this.cancelTransition();
    this.audio.setPaused(true);
    this.index = target;
    if (wasEnded) {
      this.status = 'paused';
      this.endOverlay.hidden = true;
    }
    this.render();
    if (shouldPlay) {
      this.audio.setPaused(false);
      this.schedule();
    }
  }

  updateCapabilities(next) {
    if (this.destroyed || !next) return;
    const previous = this.capabilities;
    this.capabilities = { ...previous, ...next };
    this.root.dataset.degraded = String(this.capabilities.shouldDegrade);
    this.root.dataset.reducedMotion = String(this.capabilities.reducedMotion);
    if (previous.shouldDegrade !== this.capabilities.shouldDegrade || previous.reducedMotion !== this.capabilities.reducedMotion) this.render();
  }

  setAudioState(state) {
    this.root.dataset.audioState = state;
  }

  updateStatus() {
    if (this.destroyed) return;
    this.root.dataset.status = this.status;
    if (this.playButton) {
      const playing = this.status === 'playing';
      this.playButton.textContent = playing ? 'Ⅱ' : '▶';
      this.playButton.setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir');
      this.playButton.title = playing ? 'Pausar' : 'Reproduzir';
    }
    if (this.status === 'ended') this.showEndOverlay();
  }

  handleImageLoad() {
    if (this.destroyed) return;
    const current = this.frames[this.index];
    if (!current || this.image.dataset.frameId !== current.frame.id) return;
    clearTimeout(this.imageLoadTimer);
    this.imageLoadTimer = 0;
    this.imageFallbackPending = false;
    this.imageReady = true;
    this.stage.setAttribute('aria-busy', 'false');
    this.stage.dataset.imageLoading = 'false';
    this.image.style.visibility = 'visible';
    this.placeholder.hidden = true;
    this.placeholder.setAttribute('aria-hidden', 'true');
    // T197: flipping data-image-loading above is what actually starts the
    // authored transition — the keyframes are bound to the stage selector with
    // `:not([data-image-loading='true'])`, so the animation begins on the same
    // tick the frame becomes visible instead of running against a hidden
    // element and being finished before the user sees it. No attribute write is
    // needed here; `void this.stage.offsetWidth` is deliberately avoided because
    // the toggle above already forces the selector to re-evaluate.
    if (this.status === 'playing') this.schedule();
  }

  handleImageError() {
    if (this.destroyed) return;
    clearTimeout(this.imageLoadTimer);
    this.imageLoadTimer = 0;
    if (this.imageFallbackPending && this.imageStandardSource) {
      this.imageFallbackPending = false;
      this.applyImageSources(this.imageStandardSources, this.image.sizes || '100vw');
      this.image.src = this.imageStandardSource;
      // T209: re-arm the watchdog for the retry. render() armed it for the
      // degraded request; without this the standard retry could hang forever
      // and `schedule()` would keep returning early, stranding the narrative on
      // the loading placeholder with no way forward.
      clearTimeout(this.imageLoadTimer);
      const retryFrameId = this.image.dataset.frameId;
      this.imageLoadTimer = setTimeout(() => {
        if (!this.imageReady && this.image.dataset.frameId === retryFrameId) this.handleImageError();
      }, IMAGE_LOAD_TIMEOUT);
      return;
    }
    const item = this.frames[this.index];
    this.stage.dataset.imageError = 'true';
    this.stage.setAttribute('aria-busy', 'false');
    // The image stays in flow (invisible) so the stage keeps its reserved box.
    this.stage.dataset.imageLoading = 'false';
    this.image.style.visibility = 'hidden';
    this.placeholder.hidden = false;
    this.placeholder.setAttribute('aria-hidden', 'false');
    const loadingMark = this.placeholder.querySelector('.loading-mark');
    const loadingLabel = this.placeholder.querySelector('.loading-label');
    if (loadingMark) loadingMark.hidden = true;
    if (loadingLabel) loadingLabel.textContent = item.frame.description;
    this.imageReady = true;
    if (this.status === 'playing') this.schedule();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    clearTimeout(this.timer);
    clearTimeout(this.transitionTimer);
    clearTimeout(this.autoStartTimer);
    clearTimeout(this.pendingNavigation);
    clearTimeout(this.imageLoadTimer);
    this.timer = 0;
    this.transitionTimer = 0;
    this.autoStartTimer = 0;
    this.pendingNavigation = null;
    this.pendingNavigationAction = null;
    this.imageLoadTimer = 0;
    this.unsubscribeProgress?.();
    this.stopWatchingCapabilities?.();
    for (const { element, eventName, handler } of this.controlHandlers) element.removeEventListener(eventName, handler);
    this.controlHandlers.length = 0;
    if (this.keydownHandler) document.removeEventListener('keydown', this.keydownHandler);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.orientationHandler) globalThis.removeEventListener('orientationchange', this.orientationHandler);
    if (this.resizeHandler) globalThis.removeEventListener('resize', this.resizeHandler);
    if (this.scrollHandler) globalThis.removeEventListener('scroll', this.scrollHandler);
    this.descriptionResizeObserver?.disconnect();
    if (this.imageLoadHandler) this.image.removeEventListener('load', this.imageLoadHandler);
    if (this.imageErrorHandler) this.image.removeEventListener('error', this.imageErrorHandler);
    this.audio.destroy?.();
    this.a11y.clear();
  }
}

export function createPlayer(options) {
  return new CinematicPlayer(options);
}
