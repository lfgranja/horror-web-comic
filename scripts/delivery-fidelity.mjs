import { execFileSync } from 'node:child_process';

export const FIDELITY_THRESHOLDS = Object.freeze({
  ssimStandard: 0.95,
  ssimLight: 0.90,
  psnrFloor: 30
});

export async function measureFidelity(variantPath, referencePath) {
  let output = '';
  try {
    output = execFileSync('ffmpeg', [
      '-i', variantPath,
      '-i', referencePath,
      '-filter_complex', '[0:v][1:v]ssim;[0:v][1:v]psnr',
      '-f', 'null', '-'
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    output = `${e.stdout || ''}\n${e.stderr || ''}`;
  }
  const text = output;
  let ssim = NaN;
  let psnr = NaN;
  const ssimMatch = text.match(/All:\s*([\d.]+)/);
  if (ssimMatch) ssim = parseFloat(ssimMatch[1]);
  const psnrMatch = text.match(/average:\s*([\d.]+)/i);
  if (psnrMatch) psnr = parseFloat(psnrMatch[1]);
  // handle inf
  if (!Number.isFinite(ssim)) ssim = 1;
  if (!Number.isFinite(psnr)) psnr = 99;
  return { ssim, psnr };
}

export function assertFidelity(result, options = {}) {
  const light = !!(options && options.light);
  if (!Number.isFinite(result.psnr) || result.psnr < FIDELITY_THRESHOLDS.psnrFloor) {
    throw new Error(`fidelity: PSNR ${result.psnr} below ${FIDELITY_THRESHOLDS.psnrFloor} dB`);
  }
  if (light) {
    if (result.ssim < FIDELITY_THRESHOLDS.ssimLight) {
      console.warn(`fidelity: light variant SSIM ${result.ssim} below ${FIDELITY_THRESHOLDS.ssimLight} (warn-only)`);
    }
  } else {
    if (result.ssim < FIDELITY_THRESHOLDS.ssimStandard) {
      throw new Error(`fidelity: standard variant SSIM ${result.ssim} below ${FIDELITY_THRESHOLDS.ssimStandard}`);
    }
  }
}