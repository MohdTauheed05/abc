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
  autoRemoveWhite = true
): Promise<string> {
  // 1. Process image using HTML5 Canvas with transparency preserved
  const compressedDataUrl = await compressImageFile(file, 640, autoRemoveWhite);

  // 2. Try uploading to Firebase Storage if available
  if (storage) {
    try {
      const blob = await dataUrlToBlob(compressedDataUrl);
      const storageRef = ref(storage, `products/${productId}_${Date.now()}.png`);

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
