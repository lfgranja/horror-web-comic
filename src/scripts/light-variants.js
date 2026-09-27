export const LIGHT_MAX_SIDE = 1280;

export function lightAudioSource(source) {
  if (!source || source.includes('-light.')) return source;
  return source.replace(/\.(aac|opus|wav)$/i, (extension) => `-light${extension.toLowerCase() === '.aac' ? '.opus' : extension.toLowerCase()}`);
}

export function lightUrl(url) {
  if (!url || /-light(?:\.|-)/i.test(url)) return url;
  const match = /^(.*?)-(\d{3,})(\.[^./?#]+)([?#].*)?$/.exec(url);
  if (match) {
    const width = Math.min(Number(match[2]), LIGHT_MAX_SIDE);
    return `${match[1]}-light-${width}${match[3]}${match[4] || ''}`;
  }
  return url.replace(/(\.[^./?#]+)([?#].*)?$/, (_match, extension, suffix = '') => `-light${extension}${suffix}`);
}

export function lightSrcset(srcset) {
  if (!srcset) return srcset;
  const seen = new Set();
  const candidates = [];
  for (const part of srcset.split(',')) {
    const tokens = part.trim().split(/\s+/);
    if (!tokens[0]) continue;
    const originalUrl = tokens[0];
    let descriptor = tokens.slice(1).join(' ');
    const widthMatch = /^(\d+)w$/.exec(descriptor);
    if (widthMatch) descriptor = Math.min(Number(widthMatch[1]), LIGHT_MAX_SIDE) + 'w';
    const lightOfBase = lightUrl(originalUrl);
    const isBase = /-light\./.test(lightOfBase) && !/-light-\d+\./.test(lightOfBase);
    let url;
    if (widthMatch && isBase) {
      const width = Math.min(Number(widthMatch[1]), LIGHT_MAX_SIDE);
      url = originalUrl.replace(/([^/]+)(\.[^./?#]+)([?#].*)?$/, (_, base, ext, suf) => base + '-light-' + width + ext + (suf || ''));
    } else {
      url = lightUrl(originalUrl);
    }
    const key = url + ' ' + descriptor;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(descriptor ? url + ' ' + descriptor : url);
  }
  return candidates.join(', ');
}

export function resolveImageSources(image) {
  const legacy = image.srcset || '';
  const avif = image.avifSrcset || legacy || (/\.avif(?:[?#]|$)/i.test(image.avif) ? image.avif : '');
  const webp = image.webpSrcset || legacy || (/\.webp(?:[?#]|$)/i.test(image.webp) ? image.webp : '');
  const fallback = image.fallbackSrcset || legacy;
  return {
    standard: { avif, webp, fallback },
    light: { avif: lightSrcset(avif), webp: lightSrcset(webp), fallback: lightSrcset(fallback) }
  };
}
