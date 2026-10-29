export function detectCapabilities() {
  const connection = globalThis.navigator?.connection;
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const saveData = Boolean(connection?.saveData);
  const effectiveType = connection?.effectiveType ?? '';
  const slowConnection = ['slow-2g', '2g', '3g'].includes(effectiveType) || (typeof connection?.rtt === 'number' && connection.rtt > 300);
  const deviceMemory = typeof globalThis.navigator?.deviceMemory === 'number'
    ? globalThis.navigator.deviceMemory
    : typeof connection?.deviceMemory === 'number' ? connection.deviceMemory : null;
  const lowMemory = deviceMemory !== null && deviceMemory <= 2;
  const lowCpu = typeof globalThis.navigator?.hardwareConcurrency === 'number' && globalThis.navigator.hardwareConcurrency <= 2;
  return {
    saveData,
    effectiveType,
    rtt: connection?.rtt ?? null,
    deviceMemory,
    hardwareConcurrency: globalThis.navigator?.hardwareConcurrency ?? null,
    reducedMotion,
    slowConnection,
    shouldDegrade: saveData || slowConnection || lowMemory || lowCpu,
    imageVariant: saveData || slowConnection || lowMemory || lowCpu ? 'light' : 'standard',
    audioVariant: saveData || slowConnection || lowMemory || lowCpu ? 'light' : 'standard'
  };
}

export function watchCapabilities(callback) {
  const connection = globalThis.navigator?.connection;
  const motion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const handler = () => callback(detectCapabilities());
  if (connection?.addEventListener) connection.addEventListener('change', handler);
  if (motion?.addEventListener) motion.addEventListener('change', handler);
  return () => {
    if (connection?.removeEventListener) connection.removeEventListener('change', handler);
    if (motion?.removeEventListener) motion.removeEventListener('change', handler);
  };
}
