const KEYS = ['hwc.audio', 'hwc.volume', 'hwc.speed', 'hwc.progress', 'hwc.theme', 'hwc.schemaVersion'];
const DEFAULTS = { audioEnabled: true, volume: 0.6, speed: 1, lastFrameId: null, theme: 'cinema', schemaVersion: 1 };
const SCHEMA_VERSION = '1';
const CHANNEL_NAME = 'progress';
const THEME_CHANNEL_NAME = 'theme';
const VALID_THEMES = new Set(['cinema', 'noir', 'eldritch', 'industrial', 'shadow-props']);
let fallbackTabCounter = 0;


function getBrowserStorage() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const probe = '__hwc_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

function createTabId() {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (typeof uuid === 'string' && uuid) return uuid.slice(0, 8);
  } catch {
    fallbackTabCounter += 1;
    return `tab-${fallbackTabCounter}`;
  }
  try {
    return Math.random().toString(36).slice(2, 10);
  } catch {
    fallbackTabCounter += 1;
    return `tab-${fallbackTabCounter}`;
  }
}

function parseProgress(value) {
  let record = value;
  if (typeof value === 'string') {
    if (!value) return null;
    try {
      record = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
  if (typeof record.frameId !== 'string' || record.frameId.trim() === '') return null;
  if (typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))) return null;
  if (!Number.isSafeInteger(record.seq) || record.seq < 0) return null;
  if (typeof record.tabId !== 'string' || record.tabId.trim() === '') return null;
  return {
    frameId: record.frameId,
    updatedAt: record.updatedAt,
    seq: record.seq,
    tabId: record.tabId
  };
}

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function compareProgress(left, right) {
  if (left === right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  const leftTime = Date.parse(left.updatedAt);
  const rightTime = Date.parse(right.updatedAt);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return leftTime < rightTime ? -1 : 1;
  if (left.seq !== right.seq) return left.seq < right.seq ? -1 : 1;
  return compareText(left.tabId, right.tabId);
}

function toNumber(value) {
  try {
    return Number(value);
  } catch {
    return Number.NaN;
  }
}

function hasWindow() {
  try {
    return typeof globalThis.window === 'object';
  } catch {
    return false;
  }
}

export class StorageManager {
  constructor(storage = getBrowserStorage()) {
    this.storage = storage || null;
    this.storyId = null;
    this.progressKey = () => (this.storyId ? `hwc.progress:${this.storyId}` : 'hwc.progress');
    this.memory = new Map();
    this.seq = 0;
    this.tabId = createTabId();
    this.listeners = new Set();
    this.themeListeners = new Set();
    this.sensoryListeners = new Set();
    this.channel = null;
    this.channelMessageHandler = null;
    this.themeChannel = null;
    this.themeChannelMessageHandler = null;
    this.sensoryChannel = null;
    this.sensoryChannelMessageHandler = null;
    this.storageListenerAttached = false;
    this.disposed = false;
    this.defaultsOnly = false;
    this.progress = null;
    this.handleStorage = (event) => {
      try {
        if (event?.key === this.progressKey()) {
          const record = parseProgress(event?.newValue);
          if (record) this.receiveProgress(record);
        } else if (event?.key === 'hwc.theme') {
          const newTheme = event?.newValue;
          if (VALID_THEMES.has(newTheme)) {
            this.defaultsOnly = false;
            this.set('hwc.theme', newTheme);
            this.notifyTheme(newTheme);
          }
        } else if (event?.key === 'hwc.sensoryMode') {
          const newMode = event?.newValue;
          if (newMode === 'safe-accessible' || newMode === 'immersive-fx') {
            this.defaultsOnly = false;
            this.notifySensory(newMode);
          }
        }

      } catch {
        return;
      }
    };
    this.channel = this.createChannel();
    this.themeChannel = this.createThemeChannel();
    this.sensoryChannel = this.createSensoryChannel();
    this.ensureVersion();
    this.attachStorageListener();
    if (!this.defaultsOnly) this.progress = parseProgress(this.get(this.progressKey()));
    if (this.progress?.tabId === this.tabId && this.progress.seq > this.seq) this.seq = this.progress.seq;
  }


  createChannel() {
    try {
      if (typeof globalThis.BroadcastChannel !== 'function' || !hasWindow()) return null;
      const channel = new globalThis.BroadcastChannel(CHANNEL_NAME);
      const handler = (event) => {
        try {
          const value = event?.data?.record ?? event?.data;
          const record = parseProgress(value);
          if (record) this.receiveProgress(record);
        } catch {
          return;
        }
      };
      if (typeof channel.addEventListener === 'function') {
        channel.addEventListener('message', handler);
        this.channelMessageHandler = handler;
        return channel;
      }
      if (channel && (typeof channel === 'object' || typeof channel === 'function')) {
        channel.onmessage = handler;
        this.channelMessageHandler = handler;
        return channel;
      }
      try {
        channel.close();
      } catch {
        return null;
      }
    } catch {
      return null;
    }
    return null;
  }

  createThemeChannel() {
    try {
      if (typeof globalThis.BroadcastChannel !== 'function' || !hasWindow()) return null;
      const channel = new globalThis.BroadcastChannel(THEME_CHANNEL_NAME);
      const handler = (event) => {
        try {
          const theme = event?.data?.theme ?? event?.data;
          if (typeof theme === 'string' && VALID_THEMES.has(theme)) {
            this.defaultsOnly = false;
            this.set('hwc.theme', theme);
            this.notifyTheme(theme);
          }
        } catch {
          return;
        }
      };

      if (typeof channel.addEventListener === 'function') {
        channel.addEventListener('message', handler);
        this.themeChannelMessageHandler = handler;
        return channel;
      }
      if (channel && (typeof channel === 'object' || typeof channel === 'function')) {
        channel.onmessage = handler;
        this.themeChannelMessageHandler = handler;
        return channel;
      }
      try {
        channel.close();
      } catch {
        return null;
      }
    } catch {
      return null;
    }
    return null;
  }


  attachStorageListener() {
    try {
      if (!this.storage || typeof globalThis.addEventListener !== 'function') return;
      globalThis.addEventListener('storage', this.handleStorage);
      this.storageListenerAttached = true;
    } catch {
      this.storage = null;
    }
  }

  ensureVersion() {
    let version = null;
    try {
      version = this.get('hwc.schemaVersion');
    } catch {
      version = null;
    }
    if (version === SCHEMA_VERSION) return;
    this.defaultsOnly = true;
    this.progress = null;
    this.memory.clear();
    for (const key of KEYS) {
      try {
        this.remove(key);
      } catch {
        continue;
      }
    }
    try {
      this.set('hwc.schemaVersion', SCHEMA_VERSION);
    } catch {
      return;
    }
  }

  get(key) {
    if (this.storage) {
      try {
        return this.storage.getItem(key);
      } catch {
        this.storage = null;
      }
    }
    return this.memory.get(key) ?? null;
  }

  set(key, value) {
    if (this.storage) {
      try {
        this.storage.setItem(key, value);
        return;
      } catch {
        this.storage = null;
      }
    }
    this.memory.set(key, value);
  }

  remove(key) {
    if (key === this.progressKey()) this.progress = null;
    if (this.storage) {
      try {
        this.storage.removeItem(key);
        return;
      } catch {
        this.storage = null;
      }
    }
    this.memory.delete(key);
  }

  load() {
    if (this.defaultsOnly) {
      return { ...DEFAULTS, lastFrameId: null, progress: null, schemaVersion: 1 };
    }
    const audio = this.get('hwc.audio');
    const storedVolume = this.get('hwc.volume');
    const storedSpeed = this.get('hwc.speed');
    const storedTheme = this.get('hwc.theme');
    const volume = storedVolume === null || storedVolume === '' ? Number.NaN : toNumber(storedVolume);
    const speed = storedSpeed === null || storedSpeed === '' ? Number.NaN : toNumber(storedSpeed);
    const theme = typeof storedTheme === 'string' && VALID_THEMES.has(storedTheme) ? storedTheme : DEFAULTS.theme;
    const progress = this.progress;
    return {
      ...DEFAULTS,
      audioEnabled: audio !== 'off',
      volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULTS.volume,
      speed: [0.5, 1, 2].includes(speed) ? speed : DEFAULTS.speed,
      lastFrameId: progress?.frameId ?? null,
      theme,
      progress,
      schemaVersion: 1
    };
  }

  setAudio(enabled) {
    this.defaultsOnly = false;
    this.set('hwc.audio', enabled ? 'on' : 'off');
  }

  setVolume(volume) {
    const numeric = toNumber(volume);
    const normalized = Number.isFinite(numeric) ? Math.min(1, Math.max(0, numeric)) : DEFAULTS.volume;
    this.defaultsOnly = false;
    this.set('hwc.volume', String(normalized));
    return normalized;
  }

  setSpeed(speed) {
    const numeric = toNumber(speed);
    const normalized = [0.5, 1, 2].includes(numeric) ? numeric : DEFAULTS.speed;
    this.defaultsOnly = false;
    this.set('hwc.speed', String(normalized));
    return normalized;
  }

  setTheme(themeId) {
    const target = typeof themeId === 'string' && VALID_THEMES.has(themeId) ? themeId : DEFAULTS.theme;
    this.defaultsOnly = false;
    this.set('hwc.theme', target);
    if (!this.disposed) {
      const channel = this.themeChannel;
      if (channel) {
        try {
          channel.postMessage({ theme: target, timestamp: Date.now() });
        } catch {
          this.closeThemeChannel(channel);
        }
      }
      this.notifyTheme(target);
    }
    return target;
  }

  createSensoryChannel() {
    try {
      if (hasWindow() && typeof globalThis.BroadcastChannel === 'function') {
        const channel = new globalThis.BroadcastChannel('hwc:sensory');
        const handler = (event) => {
          try {
            const mode = event?.data?.mode;
            if (mode === 'safe-accessible' || mode === 'immersive-fx') {
              this.notifySensory(mode);
            }
          } catch {
            return;
          }
        };
        channel.addEventListener('message', handler);
        this.sensoryChannelMessageHandler = handler;
        return channel;
      }
    } catch {
      return null;
    }
    return null;
  }

  notifySensory(mode) {
    for (const listener of this.sensoryListeners) {
      try {
        listener(mode);
      } catch {
        continue;
      }
    }
  }

  onSensory(listener) {
    if (this.disposed || typeof listener !== 'function') return () => false;
    this.sensoryListeners.add(listener);
    return () => this.sensoryListeners.delete(listener);
  }

  setSensoryMode(mode) {
    if (mode !== 'safe-accessible' && mode !== 'immersive-fx') return;
    this.defaultsOnly = false;
    this.set('hwc.sensoryMode', mode);
    if (!this.disposed && this.sensoryChannel) {
      try {
        this.sensoryChannel.postMessage({ mode, timestamp: Date.now() });
      } catch {
        // ignore
      }
    }
    this.notifySensory(mode);
    return mode;
  }

  getSensoryMode() {
    try {
      const stored = this.get('hwc.sensoryMode');
      if (stored === 'safe-accessible' || stored === 'immersive-fx') return stored;
    } catch {
      // ignore
    }
    return null;
  }

  notifyTheme(themeId) {
    for (const listener of this.themeListeners) {
      try {
        listener(themeId);
      } catch {
        continue;
      }
    }
  }

  onTheme(listener) {
    if (this.disposed || typeof listener !== 'function') return () => false;
    this.themeListeners.add(listener);
    return () => this.themeListeners.delete(listener);
  }

  setStoryId(id) {
    this.storyId = id || null;
    if (!this.defaultsOnly) this.progress = parseProgress(this.get(this.progressKey()));
    if (this.progress?.tabId === this.tabId && this.progress.seq > this.seq) this.seq = this.progress.seq;
  }

  saveProgress(frameId) {
    this.seq += 1;
    const record = { frameId, updatedAt: new Date().toISOString(), seq: this.seq, tabId: this.tabId };
    this.progress = record;
    this.defaultsOnly = false;
    this.set(this.progressKey(), JSON.stringify(record));
    if (!this.disposed) {
      const channel = this.channel;
      if (channel) {
        try {
          channel.postMessage({ record });
        } catch {
          this.closeChannel(channel);
        }
      }
      this.notify(record);
    }
    return record;
  }

  receiveProgress(record) {
    if (this.disposed) return;
    const candidate = parseProgress(record);
    if (!candidate) return;
    const comparison = compareProgress(candidate, this.progress);
    if (comparison < 0) return;
    this.defaultsOnly = false;
    if (comparison > 0) {
      this.progress = candidate;
    this.set(this.progressKey(), JSON.stringify(candidate));
    }
    if (candidate.tabId === this.tabId && candidate.seq > this.seq) this.seq = candidate.seq;
    this.notify(candidate);
  }

  notify(record) {
    for (const listener of this.listeners) {
      try {
        listener(record);
      } catch {
        continue;
      }
    }
  }

  onProgress(listener) {
    if (this.disposed || typeof listener !== 'function') return () => false;
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  closeChannel(channel) {
    if (!channel) return;
    const handler = this.channelMessageHandler;
    try {
      if (handler && typeof channel.removeEventListener === 'function') channel.removeEventListener('message', handler);
      else if (handler && channel.onmessage === handler) channel.onmessage = null;
    } catch {
    }
    try {
      if (typeof channel.close === 'function') channel.close();
    } catch {
      return;
    } finally {
      if (this.channel === channel) {
        this.channel = null;
        this.channelMessageHandler = null;
      }
    }
  }

  closeThemeChannel(channel) {
    if (!channel) return;
    const handler = this.themeChannelMessageHandler;
    try {
      if (handler && typeof channel.removeEventListener === 'function') channel.removeEventListener('message', handler);
      else if (handler && channel.onmessage === handler) channel.onmessage = null;
    } catch {
    }
    try {
      if (typeof channel.close === 'function') channel.close();
    } catch {
      return;
    } finally {
      if (this.themeChannel === channel) {
        this.themeChannel = null;
        this.themeChannelMessageHandler = null;
      }
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    this.themeListeners.clear();
    this.sensoryListeners.clear();
    const channel = this.channel;
    this.channel = null;
    this.closeChannel(channel);
    const themeChannel = this.themeChannel;
    this.themeChannel = null;
    this.closeThemeChannel(themeChannel);
    const sensoryChannel = this.sensoryChannel;
    this.sensoryChannel = null;
    if (sensoryChannel) {
      try {
        const handler = this.sensoryChannelMessageHandler;
        if (handler && typeof sensoryChannel.removeEventListener === 'function') sensoryChannel.removeEventListener('message', handler);
        else if (handler && sensoryChannel.onmessage === handler) sensoryChannel.onmessage = null;
        if (typeof sensoryChannel.close === 'function') sensoryChannel.close();
      } catch {
      }
    }
    this.sensoryChannelMessageHandler = null;
    if (this.storageListenerAttached) {
      try {
        if (typeof globalThis.removeEventListener === 'function') globalThis.removeEventListener('storage', this.handleStorage);
      } catch {
        this.storageListenerAttached = false;
        return;
      }
    }
    this.storageListenerAttached = false;
    this.channelMessageHandler = null;
    this.themeChannelMessageHandler = null;
  }

}

export function createStorageManager() {
  return new StorageManager();
}
