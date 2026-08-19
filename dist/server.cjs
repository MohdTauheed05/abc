"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
async function resolveImageToBase64(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.startsWith("data:image/")) {
    const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/s);
    if (match) {
      return {
        mimeType: match[1],
        data: match[2].trim()
      };
    }
  }
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(trimmed) && trimmed.length > 100;
  if (isBase64 && !trimmed.startsWith("/") && !trimmed.startsWith("http")) {
    return {
      mimeType: "image/jpeg",
      data: trimmed
    };
  }
  try {
    const cleanPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
    const candidates = [
      import_path.default.join(process.cwd(), cleanPath),
      import_path.default.join(process.cwd(), "src", cleanPath.replace(/^src\//, "")),
      import_path.default.join(process.cwd(), "public", cleanPath.replace(/^public\//, ""))
    ];
    for (const testPath of candidates) {
      if (import_fs.default.existsSync(testPath) && import_fs.default.statSync(testPath).isFile()) {
        const fileBuffer = await import_fs.default.promises.readFile(testPath);
        const ext = import_path.default.extname(testPath).toLowerCase();
        let mimeType = "image/jpeg";
        if (ext === ".png") mimeType = "image/png";
        if (ext === ".webp") mimeType = "image/webp";
        if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
        return {
          mimeType,
          data: fileBuffer.toString("base64")
        };
      }
    }
  } catch (err) {
    console.warn("[resolveImageToBase64] Could not read local file:", input, err);
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const resp = await fetch(trimmed);
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const contentType = resp.headers.get("content-type") || "image/jpeg";
        return {
          mimeType: contentType,
          data: buffer.toString("base64")
        };
      }
    } catch (err) {
      console.warn("[resolveImageToBase64] Could not fetch remote URL:", input, err);
    }
  }
  return null;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    return new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
  });
  app.post("/api/ai/generate-character-render", async (req, res) => {
    try {
      const {
        engine = "gemini",
        productName = "VENOL Synthetic Oil",
        gradeCode = "0W-16",
        characterImageBase64,
        bottleImageBase64,
        customPromptExtra = ""
      } = req.body;
      const masterPrompt = customPromptExtra?.trim() || `
Place the uploaded ${productName} ${gradeCode} oil bottle securely resting on top of the metallic pedestal. Modify the uploaded character standing behind the pedestal so that both of its robotic hands are firmly gripping the sides of the bottle in a clean, symmetric two-handed hold. Maintain the character's exact armor details, glowing elements, and metallic texture. Render the final composite as an HD Studio Product Shot against a clean, solid, bright off-white background with soft, neutral studio lighting and no stray shadows or background artifacts.
`.trim();
      console.log(`[AI Render API] (${engine}) Generating 3D Character render with prompt:`, masterPrompt);
      const ai = getGeminiClient();
      const parts = [];
      const resolvedCharImage = await resolveImageToBase64(characterImageBase64);
      if (resolvedCharImage) {
        parts.push({
          inlineData: resolvedCharImage
        });
      }
      const resolvedBottleImage = await resolveImageToBase64(bottleImageBase64);
      if (resolvedBottleImage) {
        parts.push({
          inlineData: resolvedBottleImage
        });
      }
      parts.push({
        text: masterPrompt
      });
      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-image",
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: "3:4",
              imageSize: "1K"
            }
          }
        });
      } catch (err) {
        console.warn("Attempt with gemini-3.1-flash-image failed, trying fallback model:", err?.message);
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: "3:4"
            }
          }
        });
      }
      let generatedImageUrl = null;
      let textResponse = null;
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || "image/png";
            generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
            break;
          } else if (part.text) {
            textResponse = part.text;
          }
        }
      }
      if (!generatedImageUrl) {
        throw new Error(
          textResponse || "Gemini API did not return an image part. Please retry or adjust prompt."
        );
      }
      return res.json({
        success: true,
        imageUrl: generatedImageUrl,
        prompt: masterPrompt,
        engine: "gemini"
      });
    } catch (error) {
      console.error("[AI Generation Error]", error);
      const isQuotaExceeded = error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED");
      return res.status(isQuotaExceeded ? 429 : 500).json({
        success: false,
        isQuotaExceeded,
        error: isQuotaExceeded ? "Gemini Image Generation quota exceeded on the current API key (requires paid tier / billing enabled on Gemini). You can use our Instant 3D Studio Engine with zero quota!" : error?.message || "Failed to generate character photo render."
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
