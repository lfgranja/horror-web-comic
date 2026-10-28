export const SENSORY_DESCRIPTORS = Object.freeze(['flashing-lights', 'sudden-audio', 'psychological-distress', 'body-horror']);

export function isValidDescriptor(value) {
  return SENSORY_DESCRIPTORS.includes(value);
}

export function normalizeDescriptors(list) {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.filter(isValidDescriptor))];
}
