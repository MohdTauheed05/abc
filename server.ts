import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

/**
 * Safely resolves an image input (data URL, raw base64, local file path, or remote URL)
 * into a valid base64 payload for Google Gemini inlineData.
 */
async function resolveImageToBase64(
  input?: string | null
): Promise<{ mimeType: string; data: string } | null> {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // 1. Data URL (e.g. data:image/png;base64,xxxx)
  if (trimmed.startsWith('data:image/')) {
    const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/s);
    if (match) {
      return {
        mimeType: match[1],
        data: match[2].trim(),
      };
    }
  }

  // 2. Pure Base64 string without data prefix
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 100;
  if (isBase64 && !trimmed.startsWith('/') && !trimmed.startsWith('http')) {
    return {
      mimeType: 'image/jpeg',
      data: trimmed,
    };
  }

  // 3. Local disk file path (e.g. /src/assets/characters/char_06_titanium_arc.jpg)
  try {
    const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    const candidates = [
      path.join(process.cwd(), cleanPath),
      path.join(process.cwd(), 'src', cleanPath.replace(/^src\//, '')),
      path.join(process.cwd(), 'public', cleanPath.replace(/^public\//, '')),
    ];

    for (const testPath of candidates) {
      if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
        const fileBuffer = await fs.promises.readFile(testPath);
        const ext = path.extname(testPath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.webp') mimeType = 'image/webp';
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        return {
          mimeType,
          data: fileBuffer.toString('base64'),
        };
      }
    }
  } catch (err) {
    console.warn('[resolveImageToBase64] Could not read local file:', input, err);
  }

  // 4. Remote HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const resp = await fetch(trimmed);
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        return {
          mimeType: contentType,
          data: buffer.toString('base64'),
        };
      }
    } catch (err) {
      console.warn('[resolveImageToBase64] Could not fetch remote URL:', input, err);
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 50mb limit for high-res image base64
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Gemini client lazily
  function getGeminiClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

  // AI 3D Character + Product Render Generation endpoint
  app.post('/api/ai/generate-character-render', async (req, res) => {
    try {
      const {
        engine = 'gemini',
        productName = 'VENOL Synthetic Oil',
        gradeCode = '0W-16',
        characterImageBase64,
        bottleImageBase64,
        customPromptExtra = '',
      } = req.body;

      // Master prompt matching exact user directive
      const masterPrompt = customPromptExtra?.trim() || `
Place the uploaded ${productName} ${gradeCode} oil bottle securely resting on top of the metallic pedestal. Modify the uploaded character standing behind the pedestal so that both of its robotic hands are firmly gripping the sides of the bottle in a clean, symmetric two-handed hold. Maintain the character's exact armor details, glowing elements, and metallic texture. Render the final composite as an HD Studio Product Shot against a clean, solid, bright off-white background with soft, neutral studio lighting and no stray shadows or background artifacts.
`.trim();

      console.log(`[AI Render API] (${engine}) Generating 3D Character render with prompt:`, masterPrompt);

      // Handle Gemini Cloud AI (multimodal: accepts both reference images + prompt)
      const ai = getGeminiClient();
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      // 1. Reference Character Image
      const resolvedCharImage = await resolveImageToBase64(characterImageBase64);
      if (resolvedCharImage) {
        parts.push({
          inlineData: resolvedCharImage,
        });
      }

      // 2. Reference Product Bottle Image
      const resolvedBottleImage = await resolveImageToBase64(bottleImageBase64);
      if (resolvedBottleImage) {
        parts.push({
          inlineData: resolvedBottleImage,
        });
      }

      // 3. Prompt Text
      parts.push({
        text: masterPrompt,
      });

      // Generate with gemini-3.1-flash-image
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: '3:4',
              imageSize: '1K',
            },
          },
        });
      } catch (err: any) {
        console.warn('Attempt with gemini-3.1-flash-image failed, trying fallback model:', err?.message);
        // Fallback to gemini-3.1-flash-lite-image if flash-image is unavailable
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: '3:4',
            },
          },
        });
      }

      let generatedImageUrl: string | null = null;
      let textResponse: string | null = null;

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
            break;
          } else if (part.text) {
            textResponse = part.text;
          }
        }
      }

      if (!generatedImageUrl) {
        throw new Error(
          textResponse || 'Gemini API did not return an image part. Please retry or adjust prompt.'
        );
      }

      return res.json({
        success: true,
        imageUrl: generatedImageUrl,
        prompt: masterPrompt,
        engine: 'gemini',
      });
    } catch (error: any) {
      console.error('[AI Generation Error]', error);
      const isQuotaExceeded =
        error?.status === 429 ||
        error?.message?.includes('429') ||
        error?.message?.includes('quota') ||
        error?.message?.includes('RESOURCE_EXHAUSTED');

      return res.status(isQuotaExceeded ? 429 : 500).json({
        success: false,
        isQuotaExceeded,
        error: isQuotaExceeded
          ? 'Gemini Image Generation quota exceeded on the current API key (requires paid tier / billing enabled on Gemini). You can use our Instant 3D Studio Engine with zero quota!'
          : error?.message || 'Failed to generate character photo render.',
      });
    }
  });

  // Vite middleware for development vs Production build serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
