import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Strips white or near-white background from an image canvas using flood-fill and color keying.
 */
export function removeWhiteBackgroundFromCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tolerance = 45
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Check if pixel is white, off-white, or light gray
  const isLightOrWhite = (r: number, g: number, b: number) => {
    const minVal = 255 - tolerance;
    // High brightness and low color saturation (near neutral white/gray)
    const brightness = (r + g + b) / 3;
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    return brightness >= minVal || (r >= minVal - 10 && g >= minVal - 10 && b >= minVal - 10 && maxDiff < 25);
  };

  // BFS / Flood fill from outer borders inwards so we only remove external background
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  // Seed with all border pixels
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x, height - 1);
    visited[x] = 1;
    visited[(height - 1) * width + x] = 1;
  }
  for (let y = 0; y < height; y++) {
    queue.push(0, y);
    queue.push(width - 1, y);
    visited[y * width] = 1;
    visited[y * width + (width - 1)] = 1;
  }

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    const idx = (cy * width + cx) * 4;

    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    // If already transparent or is white background
    if (a === 0 || isLightOrWhite(r, g, b)) {
      // Set pixel to fully transparent
      data[idx + 3] = 0;

      // Check 4 neighbors
      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIndex = ny * width + nx;
          if (!visited[nIndex]) {
            visited[nIndex] = 1;
            const nIdx4 = nIndex * 4;
            const nr = data[nIdx4];
            const ng = data[nIdx4 + 1];
            const nb = data[nIdx4 + 2];
            const na = data[nIdx4 + 3];

            if (na > 0 && isLightOrWhite(nr, ng, nb)) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }
  }

  // Soft edge cleanup: semi-transparent anti-aliasing on borders
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 0) {
        // Count transparent surrounding neighbors
        const topA = data[((y - 1) * width + x) * 4 + 3];
        const btmA = data[((y + 1) * width + x) * 4 + 3];
        const lftA = data[(y * width + (x - 1)) * 4 + 3];
        const rgtA = data[(y * width + (x + 1)) * 4 + 3];

        if (topA === 0 || btmA === 0 || lftA === 0 || rgtA === 0) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          if ((r + g + b) / 3 > 210) {
            data[idx + 3] = 0; // eliminate remaining bright halo fringe
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Resizes and compresses any image file, with automatic/optional white background removal.
 */
export async function processAndUploadProductImage(
  file: File,
  productId: string,
  autoRemoveWhite = true,
  folder: string = 'products'
): Promise<string> {
  // 1. Process image using HTML5 Canvas with transparency preserved
  const compressedDataUrl = await compressImageFile(file, 640, autoRemoveWhite);

  // 2. Try uploading to Firebase Storage if available
  if (storage) {
    try {
      const blob = await dataUrlToBlob(compressedDataUrl);
      const storageRef = ref(storage, `${folder}/${productId}_${Date.now()}.png`);

      const uploadPromise = uploadBytes(storageRef, blob, {
        contentType: 'image/png',
      }).then((snapshot) => getDownloadURL(snapshot.ref));

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Storage upload timed out')), 4000)
      );

      const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
      if (downloadUrl) {
        console.log('[Storage] Image uploaded to Firebase Storage:', downloadUrl);
        return downloadUrl;
      }
    } catch (err) {
      console.warn(
        '[Storage Notice] Firebase Storage upload not active; using optimized transparent image data:',
        err
      );
    }
  }

  // 3. Fallback to the optimized compressed data URL with transparency preserved
  return compressedDataUrl;
}

/**
 * Canvas compressor that preserves transparency and optionally strips white backgrounds.
 */
export async function compressImageFile(
  fileOrUrl: File | string,
  maxDimension = 640,
  autoRemoveWhite = false
): Promise<string> {
  return new Promise((resolve) => {
    let objectUrl = '';
    if (typeof fileOrUrl === 'string') {
      objectUrl = fileOrUrl;
    } else {
      objectUrl = URL.createObjectURL(fileOrUrl);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (typeof fileOrUrl !== 'string') {
        URL.revokeObjectURL(objectUrl);
      }
      try {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }

        // Clear canvas to full transparent alpha
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // If requested, strip any white/light background
        if (autoRemoveWhite) {
          removeWhiteBackgroundFromCanvas(ctx, width, height, 45);
        }

        // Try WebP first for ultra-lightweight payload with alpha support, fallback to PNG
        let result = '';
        try {
          const webpResult = canvas.toDataURL('image/webp', 0.9);
          if (webpResult.startsWith('data:image/webp') && webpResult.length > 50) {
            result = webpResult;
          }
        } catch {
          // fallback
        }

        if (!result) {
          result = canvas.toDataURL('image/png');
        }

        resolve(result);
      } catch (err) {
        console.error('Image compression failed:', err);
        resolve('');
      }
    };

    img.onerror = () => {
      if (typeof fileOrUrl !== 'string') {
        URL.revokeObjectURL(objectUrl);
      }
      resolve('');
    };

    img.src = objectUrl;
  });
}

/**
 * Convert Data URL string to Blob for Firebase Storage upload.
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export interface ExtractedPalette {
  bg: string;
  panel: string;
  accent: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/** Darkens/lightens an RGB triple towards a target lightness while preserving hue direction. */
function shade(rgb: [number, number, number], targetLightness: number): [number, number, number] {
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b) || 1;
  const scale = (targetLightness * 255) / max;
  return [Math.min(255, r * scale), Math.min(255, g * scale), Math.min(255, b * scale)];
}

/**
 * Samples a bottle/product photo and derives a small brand palette (a dark
 * page background, a slightly lighter panel tint, and a vivid accent color)
 * so the storefront's hero background can automatically match the product
 * photo. Runs entirely client-side via canvas pixel sampling — no AI/network
 * calls required.
 */
export async function extractPaletteFromImage(imageSrc: string): Promise<ExtractedPalette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let bestSat = -1;
        let bestColor: [number, number, number] = [217, 123, 46]; // fallback: brand accent
        let rSum = 0;
        let gSum = 0;
        let bSum = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 40) continue; // skip transparent pixels (removed background)

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lightness = (max + min) / 2 / 255;
          if (lightness > 0.94 || lightness < 0.06) continue; // skip near-white/near-black

          const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));

          rSum += r;
          gSum += g;
          bSum += b;
          count++;

          if (sat > bestSat && lightness > 0.15 && lightness < 0.88) {
            bestSat = sat;
            bestColor = [r, g, b];
          }
        }

        if (count === 0) {
          resolve(null);
          return;
        }

        const avg: [number, number, number] = [rSum / count, gSum / count, bSum / count];
        const accentHex = rgbToHex(bestColor[0], bestColor[1], bestColor[2]);
        const bgHex = rgbToHex(...shade(avg, 0.09));
        const panelHex = rgbToHex(...shade(avg, 0.16));

        resolve({ bg: bgHex, panel: panelHex, accent: accentHex });
      } catch (err) {
        console.warn('Palette extraction failed:', err);
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}
