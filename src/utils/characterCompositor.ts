// Advanced Character + Product Compositor Engine
// Standardized positioning, precise pedestal seating, clean background removal,
// and a polished product-bottle-on-pedestal composite (matching Image 1).

import type { HDCharacterAsset } from '../data/characters';

export interface RemovalSettings {
  threshold: number;
  deSpillBlack: boolean;
}

const DEFAULT_SETTINGS: RemovalSettings = {
  threshold: 12,
  deSpillBlack: true,
};

/** Standard target canvas dimensions for normalized character compositing */
export const COMPOSITE_WIDTH = 720;
export const COMPOSITE_HEIGHT = 1073;

/** Standard normalized baseline ratio where the metallic pedestal top surface is placed across ALL characters */
export const NORMALIZED_PEDESTAL_TOP_RATIO = 0.665;

function isLightColorHex(hex: string): boolean {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return false;
  const r = parseInt(cleanHex.length === 3 ? cleanHex[0] + cleanHex[0] : cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.length === 3 ? cleanHex[1] + cleanHex[1] : cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.length === 3 ? cleanHex[2] + cleanHex[2] : cleanHex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65;
}

/** Load an <img> element and resolve once ready */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * High-precision background removal:
 * Flood-fills studio backdrop from edges, cuts out dark backgrounds,
 * feathers edges cleanly to avoid harsh fringe, and cleans floor bounce.
 */
function removeBackground(
  srcCanvas: HTMLCanvasElement,
  settings: RemovalSettings = DEFAULT_SETTINGS
): HTMLCanvasElement {
  const width = srcCanvas.width;
  const height = srcCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return srcCanvas;

  ctx.drawImage(srcCanvas, 0, 0);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Sample outer perimeter to determine backdrop profile
  let cornerMax = 0;
  const samplePoints = [
    0, // Top-left
    (width - 1) * 4, // Top-right
    (height - 1) * width * 4, // Bottom-left
    ((height - 1) * width + (width - 1)) * 4, // Bottom-right
    Math.floor(width / 2) * 4, // Top-mid
  ];

  for (const cIdx of samplePoints) {
    cornerMax = Math.max(cornerMax, data[cIdx], data[cIdx + 1], data[cIdx + 2]);
  }

  const effectiveThreshold = Math.min(
    22,
    Math.max(8, Math.max(cornerMax + 6, settings.threshold))
  );
  const pureBgCutoff = Math.max(3, Math.floor(effectiveThreshold * 0.40));

  const isBackdrop = (r: number, g: number, b: number) => {
    const maxVal = Math.max(r, g, b);
    return maxVal <= effectiveThreshold;
  };

  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // Seed with all border pixels
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(0, y);
    queue.push(width - 1, y);
  }

  let head = 0;
  while (head < queue.length) {
    const px = queue[head++];
    const py = queue[head++];
    const idx = py * width + px;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pIdx = idx * 4;
    const r = data[pIdx];
    const g = data[pIdx + 1];
    const b = data[pIdx + 2];
    const a = data[pIdx + 3];
    if (a === 0) continue;

    if (isBackdrop(r, g, b)) {
      const maxVal = Math.max(r, g, b);
      if (maxVal <= pureBgCutoff) {
        data[pIdx + 3] = 0;
      } else {
        const ratio = (maxVal - pureBgCutoff) / (effectiveThreshold - pureBgCutoff);
        data[pIdx + 3] = Math.floor(Math.min(255, Math.max(0, ratio * 255)));
      }
      if (px > 0 && !visited[idx - 1]) queue.push(px - 1, py);
      if (px < width - 1 && !visited[idx + 1]) queue.push(px + 1, py);
      if (py > 0 && !visited[idx - width]) queue.push(px, py - 1);
      if (py < height - 1 && !visited[idx + width]) queue.push(px, py + 1);
    }
  }

  // De-spill and edge anti-aliasing
  if (settings.deSpillBlack) {
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > 0 && a < 235) {
        const normA = Math.max(0.60, a / 255);
        data[i] = Math.min(255, Math.floor(data[i] / normA));
        data[i + 1] = Math.min(255, Math.floor(data[i + 1] / normA));
        data[i + 2] = Math.min(255, Math.floor(data[i + 2] / normA));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return outCanvas;
}

/**
 * Normalizes any character cutout canvas so that its pedestal top surface aligns
 * to NORMALIZED_PEDESTAL_TOP_RATIO across all characters.
 */
function normalizeCharacterPose(
  rawCutout: HTMLCanvasElement,
  character: HDCharacterAsset
): HTMLCanvasElement {
  const width = COMPOSITE_WIDTH;
  const height = COMPOSITE_HEIGHT;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return rawCutout;

  const rawW = rawCutout.width;
  const rawH = rawCutout.height;

  const rawPedestalTop = rawH * character.pedestalSurfaceRatio;
  const targetPedestalTop = height * NORMALIZED_PEDESTAL_TOP_RATIO;

  // Calculate vertical alignment scale and offset
  const scale = 1.0;
  const drawW = rawW * scale;
  const drawH = rawH * scale;
  const drawX = (width - drawW) / 2;
  const drawY = targetPedestalTop - rawPedestalTop * scale;

  ctx.drawImage(rawCutout, drawX, drawY, drawW, drawH);
  return outCanvas;
}

/**
 * Calculates the exact visible (non-transparent) bounding box of an image.
 */
export function getVisibleBounds(
  img: HTMLImageElement
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width || 100;
  const h = img.naturalHeight || img.height || 100;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { minX: 0, minY: 0, maxX: w - 1, maxY: h - 1, width: w, height: h };
  }

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w, minY = h, maxX = 0, maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const alpha = data[idx + 3];
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Treat pixel as visible if alpha > 15 and not pure transparent
      const isVisible = alpha > 15 && !(r > 250 && g > 250 && b > 250 && alpha < 30);
      if (isVisible) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) {
    return { minX: 0, minY: 0, maxX: w - 1, maxY: h - 1, width: w, height: h };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  };
}

/** Draws the glowing GRADE / VISCOSITY plaque onto the pedestal area. */
function renderPlaque(
  srcCanvas: HTMLCanvasElement,
  gradeText: string,
  viscosityText: string,
  glowColor: string
): HTMLCanvasElement {
  const width = srcCanvas.width;
  const height = srcCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return srcCanvas;

  ctx.drawImage(srcCanvas, 0, 0);
  if (!gradeText && !viscosityText) return outCanvas;

  const plaqueWidth = width * 0.46;
  const plaqueHeight = height * 0.068;
  const plaqueX = (width - plaqueWidth) / 2;
  const plaqueY = height * 0.895;

  ctx.save();

  // Dark metallic bezel background with cyber chamfer corners
  ctx.fillStyle = '#07090e';
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = Math.max(2, width * 0.0035);
  const chamfer = 7;
  ctx.beginPath();
  ctx.moveTo(plaqueX + chamfer, plaqueY);
  ctx.lineTo(plaqueX + plaqueWidth - chamfer, plaqueY);
  ctx.lineTo(plaqueX + plaqueWidth, plaqueY + chamfer);
  ctx.lineTo(plaqueX + plaqueWidth, plaqueY + plaqueHeight - chamfer);
  ctx.lineTo(plaqueX + plaqueWidth - chamfer, plaqueY + plaqueHeight);
  ctx.lineTo(plaqueX + chamfer, plaqueY + plaqueHeight);
  ctx.lineTo(plaqueX, plaqueY + plaqueHeight - chamfer);
  ctx.lineTo(plaqueX, plaqueY + chamfer);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing neon inner border
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = Math.max(1.2, width * 0.002);
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = width * 0.014;
  ctx.beginPath();
  ctx.roundRect(plaqueX + 3.5, plaqueY + 3.5, plaqueWidth - 7, plaqueHeight - 7, 3);
  ctx.stroke();

  // Plaque mounting screws
  const screwOffsets = [
    { x: plaqueX + 8, y: plaqueY + 8 },
    { x: plaqueX + plaqueWidth - 8, y: plaqueY + 8 },
    { x: plaqueX + 8, y: plaqueY + plaqueHeight - 8 },
    { x: plaqueX + plaqueWidth - 8, y: plaqueY + plaqueHeight - 8 },
  ];
  ctx.fillStyle = '#94a3b8';
  ctx.shadowBlur = 0;
  screwOffsets.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Center accent separator line
  const lineY = plaqueY + plaqueHeight * 0.52;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.moveTo(plaqueX + 16, lineY);
  ctx.lineTo(plaqueX + plaqueWidth - 16, lineY);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (gradeText && viscosityText) {
    const fontSize1 = Math.max(10, Math.floor(width * 0.022));
    ctx.font = `900 ${fontSize1}px 'Courier New', monospace`;
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    const gradeLabel = gradeText.toUpperCase().startsWith('GRADE:')
      ? gradeText.toUpperCase()
      : `GRADE: ${gradeText.toUpperCase()}`;
    ctx.fillText(gradeLabel, width / 2, plaqueY + plaqueHeight * 0.28);

    const fontSize2 = Math.max(9, Math.floor(width * 0.020));
    ctx.font = `800 ${fontSize2}px 'Courier New', monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    const viscLabel = viscosityText.toUpperCase().startsWith('VISCOSITY:')
      ? viscosityText.toUpperCase()
      : `VISCOSITY: ${viscosityText.toUpperCase()}`;
    ctx.fillText(viscLabel, width / 2, plaqueY + plaqueHeight * 0.76);
  } else {
    const text = (gradeText || viscosityText).toUpperCase();
    const fontSize = Math.max(12, Math.floor(width * 0.026));
    ctx.font = `900 ${fontSize}px 'Courier New', monospace`;
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.fillText(text, width / 2, plaqueY + plaqueHeight * 0.52);
  }

  ctx.restore();
  return outCanvas;
}

/**
 * Composites the product's bottle photo onto the standardized pedestal top surface
 * with grounded contact shadows, strict aspect-ratio sizing, and natural character framing.
 */
function compositeBottle(
  characterCanvas: HTMLCanvasElement,
  bottleImg: HTMLImageElement
): HTMLCanvasElement {
  const width = characterCanvas.width;
  const height = characterCanvas.height;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return characterCanvas;

  // 1. Draw character base & pedestal
  ctx.drawImage(characterCanvas, 0, 0);

  // 2. Measure actual visible pixels of the bottle
  const bounds = getVisibleBounds(bottleImg);
  if (bounds.width <= 0 || bounds.height <= 0) return outCanvas;

  const visibleW = bounds.width;
  const visibleH = bounds.height;
  const aspect = visibleW / visibleH;

  // Determine standard bottle dimensions between the character's hands
  const baseTargetWidth = width * 0.40;
  let targetW = baseTargetWidth;
  let targetH = targetW / aspect;

  const maxAllowedHeight = height * 0.36;
  if (targetH > maxAllowedHeight) {
    targetH = maxAllowedHeight;
    targetW = targetH * aspect;
  }

  const minAllowedWidth = width * 0.26;
  if (targetW < minAllowedWidth) {
    targetW = minAllowedWidth;
    targetH = targetW / aspect;
  }

  const centerX = width / 2;
  const pedestalTopY = height * NORMALIZED_PEDESTAL_TOP_RATIO;
  const bottleBottomY = pedestalTopY;
  const bottleTopY = bottleBottomY - targetH;
  const bottleLeftX = centerX - targetW / 2;

  ctx.save();

  // 3. Grounded Contact Shadows & Reflection on top surface of metallic pedestal
  // Deep core shadow (touching surface)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.beginPath();
  ctx.ellipse(centerX, pedestalTopY, targetW * 0.44, targetW * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  // Diffuse ambient contact shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
  ctx.beginPath();
  ctx.ellipse(centerX, pedestalTopY + 1.5, targetW * 0.52, targetW * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle metallic reflection glow under bottle base
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.ellipse(centerX, pedestalTopY - 1, targetW * 0.36, targetW * 0.02, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Draw Bottle Photo (mapped from visibleBounds to target dimensions)
  ctx.drawImage(
    bottleImg,
    bounds.minX,
    bounds.minY,
    visibleW,
    visibleH,
    bottleLeftX,
    bottleTopY,
    targetW,
    targetH
  );

  // 5. Bottle rests directly on the pedestal surface

  ctx.restore();
  return outCanvas;
}

// ---- Caching Pipeline --------------------------------------------------

const cutoutCache = new Map<string, HTMLCanvasElement>();
const normalizedCutoutCache = new Map<string, HTMLCanvasElement>();
const compositeCache = new Map<string, string>(); // -> data URL

async function getNormalizedCutout(character: HDCharacterAsset): Promise<HTMLCanvasElement> {
  const cached = normalizedCutoutCache.get(character.id);
  if (cached) return cached;

  let rawCutout = cutoutCache.get(character.id);
  if (!rawCutout) {
    const img = await loadImage(character.imageSrc);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth || img.width || COMPOSITE_WIDTH;
    tempCanvas.height = img.naturalHeight || img.height || COMPOSITE_HEIGHT;
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      rawCutout = removeBackground(tempCanvas);
    } else {
      rawCutout = tempCanvas;
    }
    cutoutCache.set(character.id, rawCutout);
  }

  const normalized = normalizeCharacterPose(rawCutout, character);
  normalizedCutoutCache.set(character.id, normalized);
  return normalized;
}

export interface CompositeOptions {
  character: HDCharacterAsset;
  bottleImageSrc?: string | null;
  gradeText?: string;
  viscosityText?: string;
  showPlaque?: boolean;
  backgroundColor?: string;
}

/**
 * Produces a final composited PNG data URL:
 * - Normalized bg-removed HD character standing on its metallic pedestal
 * - Standardized pedestal baseline height matching Image 1
 * - Product bottle photo resting directly on pedestal surface with zero gap
 * - Mechanical fingers & claws clasping around the bottle in foreground
 * - Glowing grade / viscosity pedestal plaque
 */
export async function getCompositeCharacterImage(opts: CompositeOptions): Promise<string> {
  const { character, bottleImageSrc, gradeText = '', viscosityText = '', showPlaque = true } = opts;

  const cacheKey = [
    character.id,
    bottleImageSrc || 'no-bottle',
    showPlaque ? gradeText : '',
    showPlaque ? viscosityText : '',
  ].join('|');

  const cached = compositeCache.get(cacheKey);
  if (cached) return cached;

  let canvas = await getNormalizedCutout(character);

  if (showPlaque && (gradeText || viscosityText)) {
    canvas = renderPlaque(canvas, gradeText, viscosityText, character.glowColor);
  }

  if (bottleImageSrc) {
    try {
      const bottleImg = await loadImage(bottleImageSrc);
      canvas = compositeBottle(canvas, bottleImg);
    } catch (err) {
      console.warn('Bottle image load failed during compositing:', err);
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  compositeCache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Generates a full 4K-grade studio photorealistic render (with rich background lighting,
 * radial studio spotlight, metallic reflections, and pedestal neon)
 * exactly reproducing the aesthetic of Image 1 in real time with 0 quota limits.
 */
export async function generateStudioPhotorealRender(opts: {
  character: HDCharacterAsset;
  bottleImageSrc?: string | null;
  gradeText?: string;
  viscosityText?: string;
  backgroundColor?: string;
  studioStyle?: 'octane' | 'cyberpunk' | 'industrial' | 'chrome' | 'clean';
}): Promise<string> {
  const {
    character,
    bottleImageSrc,
    gradeText = '',
    viscosityText = '',
    backgroundColor = '#0052cc',
    studioStyle = 'octane',
  } = opts;

  const width = 1080;
  const height = 1440;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return '';

  // 1. Draw High-Tech Studio Backdrop with Radial Spotlight
  const baseColor = backgroundColor || '#F8F9FA';
  const isLightBg = isLightColorHex(baseColor);

  if (isLightBg) {
    // Clean, solid, bright off-white studio product shot lighting
    const lightGrad = ctx.createRadialGradient(
      width / 2,
      height * 0.4,
      width * 0.15,
      width / 2,
      height * 0.5,
      width * 0.95
    );
    lightGrad.addColorStop(0, '#FFFFFF');
    lightGrad.addColorStop(0.4, baseColor);
    lightGrad.addColorStop(0.85, '#E2E8F0');
    lightGrad.addColorStop(1, '#CBD5E1');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle soft ambient rim glow
    const softGlow = ctx.createRadialGradient(
      width / 2,
      height * 0.6,
      50,
      width / 2,
      height * 0.6,
      width * 0.6
    );
    softGlow.addColorStop(0, 'rgba(0, 210, 255, 0.12)');
    softGlow.addColorStop(0.6, 'rgba(0, 100, 255, 0.04)');
    softGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = softGlow;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Dark / High-Contrast Studio Backdrop
    const bgGrad = ctx.createRadialGradient(
      width / 2,
      height * 0.42,
      width * 0.1,
      width / 2,
      height * 0.5,
      width * 0.95
    );
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.2, baseColor);
    bgGrad.addColorStop(0.75, '#050a18');
    bgGrad.addColorStop(1, '#020308');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Studio Lighting Glow & Rim Effect
    const glowGrad = ctx.createRadialGradient(
      width / 2,
      height * 0.65,
      40,
      width / 2,
      height * 0.65,
      width * 0.55
    );
    glowGrad.addColorStop(0, character.glowColor || 'rgba(0, 240, 255, 0.45)');
    glowGrad.addColorStop(0.5, 'rgba(0, 100, 255, 0.15)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Composite Character + Plaque + Bottle
  let charCanvas = await getNormalizedCutout(character);

  if (gradeText || viscosityText) {
    charCanvas = renderPlaque(charCanvas, gradeText, viscosityText, character.glowColor);
  }

  if (bottleImageSrc) {
    try {
      const bottleImg = await loadImage(bottleImageSrc);
      charCanvas = compositeBottle(charCanvas, bottleImg);
    } catch (err) {
      console.warn('Bottle image error:', err);
    }
  }

  // Draw character onto the studio canvas centered
  const scale = (height * 0.94) / charCanvas.height;
  const drawW = charCanvas.width * scale;
  const drawH = charCanvas.height * scale;
  const drawX = (width - drawW) / 2;
  const drawY = height - drawH;

  // Add subtle floor shadow under pedestal
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.ellipse(width / 2, height - 20, width * 0.38, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.drawImage(charCanvas, drawX, drawY, drawW, drawH);

  // 4. Add Top Studio Highlight
  if (studioStyle === 'octane' || studioStyle === 'chrome') {
    const topGlow = ctx.createLinearGradient(0, 0, 0, height * 0.3);
    topGlow.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    topGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, width, height * 0.3);
  }

  return outCanvas.toDataURL('image/png');
}

/** Clears cached composites for a character or all characters */
export function clearCompositeCache(characterId?: string) {
  if (!characterId) {
    cutoutCache.clear();
    normalizedCutoutCache.clear();
    compositeCache.clear();
    return;
  }
  cutoutCache.delete(characterId);
  normalizedCutoutCache.delete(characterId);
  for (const key of Array.from(compositeCache.keys())) {
    if (key.startsWith(`${characterId}|`)) compositeCache.delete(key);
  }
}
