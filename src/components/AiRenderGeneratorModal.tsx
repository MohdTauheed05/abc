import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Check,
  Download,
  Image as ImageIcon,
  Sliders,
  Layers,
  Wand2,
  AlertCircle,
  UploadCloud,
  Trash2,
  Cpu,
  Zap,
  Info,
} from 'lucide-react';
import { HD_CHARACTERS_LIST, type HDCharacterAsset } from '../data/characters';
import { type Product } from '../types/product';
import { generateRealisticCharacterRender } from '../services/aiGenerator';
import {
  generateStudioPhotorealRender,
  getCompositeCharacterImage,
  clearCompositeCache,
} from '../utils/characterCompositor';
import { compressImageFile } from '../utils/imageCompressor';
import { useProducts } from '../hooks/useProducts';

interface AiRenderGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: Product | null;
  onApplySuccess?: (productId: string, imageUrl: string) => void;
}

type RenderEngine = 'studio' | 'gemini';
type StudioStyle = 'octane' | 'cyberpunk' | 'industrial' | 'chrome' | 'clean';

function getDescriptiveCharacterDetails(char: HDCharacterAsset): string {
  switch (char.id) {
    case 'char_01':
      return 'Aegis Vanguard (a golden-horned sci-fi mecha guardian with polished gold and dark titanium battle armor, curved golden horns on its cyber helmet, and a glowing cyan energy visor)';
    case 'char_02':
      return 'Obsidian Phantom (a stealth cybernetic assassin robot in matte black carbon-fiber armor with bat-wing cowl helmet and glowing neon crimson red visor slit)';
    case 'char_03':
      return 'Crimson Centurion (a heavy Spartan gladiator battle robot with crimson red heavy armor, glowing orange helmet plume visor, and metallic pauldrons)';
    case 'char_04':
      return 'Void Reaver (a cybernetic hooded reaper warrior in dark nanotechnology armor with a luminous purple neon glowing visor mask)';
    case 'char_05':
      return 'Ronin Kabuto (an ornate futuristic cyber samurai robot wearing a golden kabuto helmet with curved horns and glowing amber optics)';
    case 'char_06':
      return 'Cryo Enforcer (a heavy titanium-arc combat robot with brushed chrome and white alloy plating, glowing bright cyan energy arc reactor core and visor)';
    case 'char_07':
      return 'Solar Apex (an aerodynamic high-speed mecha pilot suit with bright orange and gold armor plating and glowing amber visor)';
    case 'char_08':
      return 'Infernal Demon (a menacing cybernetic mech warrior with dual curved demon horns, dark obsidian alloy plates, and glowing cyan plasma energy)';
    case 'char_09':
      return 'Desert Commando (a tactical military spec-ops cyber soldier with desert tan and gunmetal armor plates, glowing teal ocular sensors)';
    case 'char_10':
      return 'Venom Striker (a lethal cyber ninja with dark carbon exoskeleton armor, sharp aerodynamic lines, and glowing acid-green visor)';
    case 'char_11':
      return 'Valkyrie Frost (a sleek Nordic shield-maiden mech with winged silver helmet armor, elegant chrome finish, and glowing frost-blue visor)';
    case 'char_12':
      return 'Crimson Juggernaut (a colossal heavy-duty industrial mech with reinforced crimson red armor plating, massive mechanical hands, and amber hydraulic lights)';
    default:
      return `${char.name} (${char.codename}), a futuristic robotic warrior in ${char.category} armor with glowing ${char.themeColor} elements`;
  }
}

function getStudioPromptForEngine(
  char: HDCharacterAsset,
  productName?: string,
  gradeCode?: string,
  engineType: RenderEngine = 'studio'
) {
  const brand = productName || 'ABC LUBRICANTS VENOL Synthetic Oil';
  const grade = gradeCode ? ` ${gradeCode}` : '';
  const charDetails = getDescriptiveCharacterDetails(char);

  if (engineType === 'gemini') {
    return `${charDetails}. Place the uploaded ${brand}${grade} oil bottle securely resting on top of the metallic pedestal. Modify the uploaded character standing behind the pedestal so that both of its robotic hands are firmly gripping the sides of the bottle in a clean, symmetric two-handed hold. Maintain the character's exact armor details, glowing elements, and metallic texture. Render the final composite as an HD Studio Product Shot against a clean, solid, bright off-white background with soft, neutral studio lighting and no stray shadows or background artifacts.`.trim();
  }

  return `Place ${char.name} standing behind the metallic pedestal with mechanical robotic hands wrapping around and gripping the sides of ${brand}${grade} motor oil canister on top of the pedestal. HD Studio Product Shot with realistic studio lighting and reflections.`.trim();
}

/** Converts an image path or URL into a clean base64 data URL */
async function imageSrcToDataUrl(src?: string | null): Promise<string | undefined> {
  if (!src) return undefined;
  if (src.startsWith('data:image/')) return src;

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 720;
    canvas.height = img.naturalHeight || img.height || 1073;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (err) {
    console.warn('Could not convert imageSrc to dataUrl:', err);
    return undefined;
  }
}

export default function AiRenderGeneratorModal({
  isOpen,
  onClose,
  initialProduct,
  onApplySuccess,
}: AiRenderGeneratorModalProps): JSX.Element | null {
  const { products, updateProduct } = useProducts();

  // Selected Target Product
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.id || (products.length > 0 ? products[0].id : '')
  );

  const currentProduct =
    products.find((p) => p.id === selectedProductId) || initialProduct || products[0];

  // Selected Character
  const [selectedCharId, setSelectedCharId] = useState<string>(
    currentProduct?.characterId || HD_CHARACTERS_LIST[0].id
  );

  const selectedChar: HDCharacterAsset =
    HD_CHARACTERS_LIST.find((c) => c.id === selectedCharId) || HD_CHARACTERS_LIST[0];

  // Bottle Image State (Default from product OR custom uploaded by user)
  const [customBottleFile, setCustomBottleFile] = useState<File | null>(null);
  const [activeBottleDataUrl, setActiveBottleDataUrl] = useState<string | null>(
    currentProduct?.bottleImageUrl || currentProduct?.imageUrl || null
  );
  const [autoCleanWhiteBg, setAutoCleanWhiteBg] = useState(true);
  const [processingBottle, setProcessingBottle] = useState(false);

  // Engine selection: 'studio' (Instant 4K Engine, zero quota) vs 'gemini' (Cloud AI)
  const [engine, setEngine] = useState<RenderEngine>('studio');
  const [studioStyle, setStudioStyle] = useState<StudioStyle>('octane');
  const [outputFormat, setOutputFormat] = useState<'full-studio' | 'transparent'>('full-studio');

  // Editable grade text shown on the pedestal plaque (defaults to product code)
  const [gradeOverride, setGradeOverride] = useState<string>(currentProduct?.code || '');
  const [extraPrompt, setExtraPrompt] = useState<string>(() =>
    getStudioPromptForEngine(selectedChar, currentProduct?.name, currentProduct?.code, 'studio')
  );
  const [bgColor, setBgColor] = useState<string>(currentProduct?.bg || '#F8F9FA');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Auto-sync prompt when character or engine changes
  const updatePromptForSelection = (newChar = selectedChar, newEngine = engine, newProd = currentProduct) => {
    setExtraPrompt(getStudioPromptForEngine(newChar, newProd?.name, gradeOverride, newEngine));
  };

  // Sync bottle when current product changes (unless custom file uploaded)
  useEffect(() => {
    if (!customBottleFile && currentProduct) {
      setActiveBottleDataUrl(currentProduct.bottleImageUrl || currentProduct.imageUrl || null);
      if (currentProduct.bg) setBgColor(currentProduct.bg);
      if (currentProduct.characterId) setSelectedCharId(currentProduct.characterId);
      setGradeOverride(currentProduct.code || '');
    }
  }, [currentProduct, customBottleFile]);

  if (!isOpen) return null;

  async function handleBottleUpload(file: File | undefined) {
    if (!file) return;
    setCustomBottleFile(file);
    setProcessingBottle(true);
    try {
      const cleaned = await compressImageFile(file, 720, autoCleanWhiteBg);
      setActiveBottleDataUrl(cleaned || URL.createObjectURL(file));
    } catch {
      setActiveBottleDataUrl(URL.createObjectURL(file));
    } finally {
      setProcessingBottle(false);
    }
  }

  function handleRemoveCustomBottle() {
    setCustomBottleFile(null);
    setActiveBottleDataUrl(currentProduct?.bottleImageUrl || currentProduct?.imageUrl || null);
  }

  async function handleGenerate(preferredEngine: RenderEngine = engine) {
    if (!currentProduct || !selectedChar) return;
    clearCompositeCache(selectedChar.id);
    setIsGenerating(true);
    setGenerationError(null);
    setIsQuotaError(false);
    setAppliedSuccess(false);

    try {
      if (preferredEngine === 'gemini') {
        // Convert reference images to base64 data URLs
        const charBase64 = await imageSrcToDataUrl(selectedChar.imageSrc);
        const bottleBase64 = await imageSrcToDataUrl(
          activeBottleDataUrl || currentProduct.imageUrl
        );

        // Attempt Cloud AI generation (Gemini multimodal)
        const res = await generateRealisticCharacterRender({
          engine: preferredEngine,
          characterName: selectedChar.name,
          characterTheme: `${selectedChar.codename} - ${selectedChar.category}. Armor accents: ${selectedChar.themeColor}`,
          productName: currentProduct.name,
          gradeCode: gradeOverride,
          viscosity: currentProduct.viscosity,
          backgroundColor: bgColor,
          characterImageBase64: charBase64,
          bottleImageBase64: bottleBase64,
          customPromptExtra: extraPrompt,
        });

        if (res.success && res.imageUrl) {
          setGeneratedImage(res.imageUrl);
        } else {
          const errStr = res.error || '';
          if (errStr.includes('quota') || errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
            setIsQuotaError(true);
            setGenerationError(
              'Gemini Image quota exceeded. Switched to our Instant 3D Studio Engine with zero quota limits!'
            );
            // Fallback to Instant Studio
            await runStudioEngine();
          } else {
            setGenerationError(errStr || 'Failed to generate AI render.');
          }
        }
      } else {
        // Run Instant 3D Studio Engine (100% client-side reliable, 0 quota)
        await runStudioEngine();
      }
    } catch (err: any) {
      const errStr = err?.message || '';
      if (errStr.includes('quota') || errStr.includes('429')) {
        setIsQuotaError(true);
        setGenerationError(
          'Gemini Cloud Quota exceeded. Generating photoreal 3D render with Instant Studio Engine instead...'
        );
        await runStudioEngine();
      } else {
        setGenerationError(errStr || 'Generation error occurred.');
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function runStudioEngine() {
    const gradeText = gradeOverride || currentProduct?.code || 'GRADE';
    if (outputFormat === 'transparent') {
      const cutout = await getCompositeCharacterImage({
        character: selectedChar,
        bottleImageSrc: activeBottleDataUrl,
        gradeText,
        viscosityText: currentProduct?.viscosity || 'SYNTHETIC',
        showPlaque: true,
      });
      setGeneratedImage(cutout);
    } else {
      const fullStudio = await generateStudioPhotorealRender({
        character: selectedChar,
        bottleImageSrc: activeBottleDataUrl,
        gradeText,
        viscosityText: currentProduct?.viscosity || 'SYNTHETIC',
        backgroundColor: bgColor,
        studioStyle: studioStyle,
      });
      setGeneratedImage(fullStudio);
    }
  }

  async function handleApplyToSite() {
    if (!currentProduct || !generatedImage) return;
    try {
      await updateProduct(currentProduct.id, {
        characterId: selectedCharId,
        compositeImageUrl: generatedImage,
        ...(customBottleFile && activeBottleDataUrl ? { bottleImageUrl: activeBottleDataUrl } : {}),
      });
      setAppliedSuccess(true);
      if (onApplySuccess) {
        onApplySuccess(currentProduct.id, generatedImage);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setGenerationError('Failed to save to database: ' + (err?.message || ''));
    }
  }

  function handleDownload() {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `${currentProduct?.code || 'titan'}_${selectedChar.name.replace(/\s+/g, '_')}_3D_Render.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-[#121215] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-white font-body">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Wand2 size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display uppercase tracking-wider text-white">
                  AI 3D Character Studio
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 rounded-full font-bold">
                  Admin Master Studio
                </span>
              </div>
              <p className="text-xs text-white/60">
                Upload your product bottle, select a Titan Guardian, and generate a photorealistic 3D render holding the bottle on a glowing pedestal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Controls & Bottle Upload (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Step 1: Upload Product Bottle Photo */}
            <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 font-mono">
                  <UploadCloud size={15} className="text-cyan-400" />
                  1. Product Bottle Photo
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/60">Clean White BG</span>
                  <input
                    type="checkbox"
                    checked={autoCleanWhiteBg}
                    onChange={(e) => setAutoCleanWhiteBg(e.target.checked)}
                    className="rounded accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Upload Dropzone */}
              <label className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-900/30 hover:border-cyan-400 p-3.5 cursor-pointer transition-all text-center">
                <UploadCloud size={22} className="text-cyan-400 animate-bounce" />
                <div className="text-xs">
                  <span className="font-bold text-white">Click or Drag & Drop Bottle Photo</span>
                  <span className="text-cyan-200/60 block text-[10px] mt-0.5">
                    PNG, JPG or WEBP (auto background isolation)
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleBottleUpload(e.target.files?.[0])}
                />
              </label>

              {/* Bottle Preview Status */}
              {activeBottleDataUrl && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/60 border border-white/10">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={activeBottleDataUrl}
                      alt="Bottle preview"
                      className="w-10 h-12 object-contain bg-black/40 rounded p-0.5 border border-white/10"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-white">
                        {customBottleFile ? customBottleFile.name : `Catalog Bottle: ${currentProduct.code}`}
                      </p>
                      <p className="text-[10px] text-cyan-400 font-mono">
                        {customBottleFile ? 'Custom Uploaded' : 'Default Grade Image'}
                      </p>
                    </div>
                  </div>

                  {customBottleFile && (
                    <button
                      type="button"
                      onClick={handleRemoveCustomBottle}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                      title="Reset to Catalog Bottle"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Target Grade & Titan Guardian */}
            <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                  <Layers size={13} className="text-amber-400" />
                  2. Target Grade & Guardian
                </label>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {selectedChar.name}
                </span>
              </div>

              {/* Product selector */}
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const prod = products.find((p) => p.id === e.target.value);
                  if (prod?.bg) setBgColor(prod.bg);
                  if (prod?.characterId) setSelectedCharId(prod.characterId);
                  if (!customBottleFile && prod) {
                    setActiveBottleDataUrl(prod.bottleImageUrl || prod.imageUrl || null);
                  }
                }}
                className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                    {p.code} — {p.name} ({p.viscosity})
                  </option>
                ))}
                </select>

                {/* Editable Pedestal Grade */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono font-bold text-white/80 flex items-center gap-1.5">
                    <Layers size={12} className="text-amber-400" />
                    Pedestal Grade (Editable)
                  </label>
                  <input
                    type="text"
                    value={gradeOverride}
                    onChange={(e) => setGradeOverride(e.target.value)}
                    className="w-full bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. 10W-40 DIESEL XHPD"
                  />
                  <p className="text-[9px] text-white/40">
                    This text is printed on the glowing pedestal plaque and used in the generation prompt.
                  </p>
                </div>

                {/* Character Grid */}
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                {HD_CHARACTERS_LIST.map((char) => {
                  const isSelected = char.id === selectedCharId;
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => {
                        setSelectedCharId(char.id);
                        updatePromptForSelection(char, engine, currentProduct);
                      }}
                      className={`relative rounded-lg overflow-hidden border transition-all p-1 flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/20 ring-2 ring-cyan-400/50'
                          : 'border-white/10 bg-black/40 hover:border-white/30'
                      }`}
                    >
                      <img
                        src={char.imageSrc}
                        alt={char.name}
                        className="w-full h-10 object-cover rounded"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[9px] font-mono text-white/80 truncate w-full text-center">
                        {char.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Render Engine & Studio Style */}
            <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
              <label className="text-[11px] font-mono uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                <Sliders size={13} className="text-purple-400" />
                3. Rendering Engine & Style
              </label>

              {/* Engine Toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setEngine('studio');
                    updatePromptForSelection(selectedChar, 'studio', currentProduct);
                  }}
                  className={`py-2 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    engine === 'studio'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Zap size={13} />
                    <span>3D Studio Engine</span>
                  </div>
                  <span className="text-[9px] font-normal opacity-80">Connects Exact Images</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEngine('gemini');
                    updatePromptForSelection(selectedChar, 'gemini', currentProduct);
                  }}
                  className={`py-2 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    engine === 'gemini'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Cpu size={13} />
                    <span>Gemini AI</span>
                  </div>
                  <span className="text-[9px] font-normal opacity-80">Cloud Multimodal</span>
                </button>
              </div>

              {/* Engine Helper Notice */}
              <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-[10px] leading-relaxed">
                {engine === 'studio' && (
                  <p className="text-cyan-200/90">
                    ⚡ <span className="font-bold text-cyan-300">3D Studio Engine:</span> Directly takes your <strong>selected guardian ({selectedChar.name})</strong> and your <strong>exact uploaded bottle</strong>, seating it on the 3D metallic pedestal with contact shadows, reflections, and studio lighting.
                  </p>
                )}
                {engine === 'gemini' && (
                  <p className="text-blue-200/90">
                    ✨ <span className="font-bold text-blue-300">Gemini Cloud AI:</span> Sends both image files directly to Google Gemini's multimodal image model. Requires active API key quota.
                  </p>
                )}
              </div>

              {/* Backdrop Color & Output Format */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-white/20"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-24 bg-black/60 border border-white/20 rounded-lg px-2 py-1 text-xs text-white font-mono"
                      placeholder="#F8F9FA"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setOutputFormat('full-studio')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                        outputFormat === 'full-studio' ? 'bg-white/20 text-white' : 'text-white/40'
                      }`}
                    >
                      Full Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutputFormat('transparent')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                        outputFormat === 'transparent' ? 'bg-white/20 text-white' : 'text-white/40'
                      }`}
                    >
                      Cutout
                    </button>
                  </div>
                </div>

                {/* Quick Color Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: 'Off-White (Prompt Standard)', val: '#F8F9FA' },
                    { label: 'Studio Neutral', val: '#E5E7EB' },
                    { label: 'Royal Blue', val: '#0052cc' },
                    { label: 'Titan Dark', val: '#0B0F19' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setBgColor(preset.val)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center gap-1.5 ${
                        bgColor.toLowerCase() === preset.val.toLowerCase()
                          ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                          : 'border-white/10 bg-black/40 text-white/50 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full border border-black/40"
                        style={{ backgroundColor: preset.val }}
                      />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['octane', 'cyberpunk', 'industrial', 'chrome', 'clean'] as StudioStyle[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStudioStyle(st)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider border transition-all ${
                      studioStyle === st
                        ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold'
                        : 'border-white/10 bg-black/40 text-white/50 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Custom Prompt Directives (Always visible and customizable) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-mono font-bold text-white/80 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-cyan-300" />
                    <span>3D Studio Generation Prompt</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => updatePromptForSelection(selectedChar, engine, currentProduct)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-200 underline decoration-cyan-400/40"
                  >
                    Auto-Sync Prompt for {selectedChar.name.split(' ')[0]} & {gradeOverride || currentProduct.code}
                  </button>
                </div>
                <textarea
                  value={extraPrompt}
                  onChange={(e) => setExtraPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-black/70 border border-white/20 focus:border-cyan-400 rounded-xl p-2.5 text-xs text-white placeholder-white/40 focus:outline-none leading-relaxed font-sans"
                  placeholder="Enter your prompt directives..."
                />
                <p className="text-[9px] text-white/40">
                  {engine === 'studio' &&
                    '⚡ Instant 3D Studio: High-precision 4K compositor keeping your exact original character art with realistic bottle grip.'}
                  {engine === 'gemini' &&
                    '✨ Gemini Cloud AI: Multimodal model using reference images + custom prompt.'}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => handleGenerate(engine)}
              disabled={isGenerating || processingBottle}
              className={`w-full py-3.5 px-4 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all ${
                isGenerating || processingBottle
                  ? 'bg-neutral-800 text-white/40 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white shadow-lg shadow-cyan-500/25 active:scale-[0.98]'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="animate-spin text-cyan-400" />
                  <span>Synthesizing Realistic 3D Render...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-yellow-300 animate-pulse" />
                  <span>
                    {engine === 'studio' && '⚡ Render 3D Photo (Instant 4K)'}
                    {engine === 'gemini' && '✨ Generate with Gemini Cloud AI'}
                  </span>
                </>
              )}
            </button>

            {generationError && (
              <div className="flex flex-col gap-2 p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-red-300 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                  <span className="leading-relaxed">{generationError}</span>
                </div>
                {isQuotaError && (
                  <button
                    type="button"
                    onClick={() => {
                      setEngine('studio');
                      handleGenerate('studio');
                    }}
                    className="self-start px-3 py-1.5 rounded-lg bg-cyan-400 text-black font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow"
                  >
                    <Zap size={13} />
                    <span>Switch to Instant 3D Studio Engine</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: High-Resolution Render Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-black/50 border border-white/10 rounded-xl p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-cyan-400" />
                  <span className="text-xs font-mono uppercase tracking-wider text-white/90 font-bold">
                    {generatedImage ? '3D Realistic Studio Photo' : 'Interactive Preview Canvas'}
                  </span>
                </div>
                {generatedImage && (
                  <span className="text-[10px] font-mono text-green-400 bg-green-950/40 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={10} /> 4K Photoreal Render Ready
                  </span>
                )}
              </div>

              {/* Preview Canvas Area */}
              <div
                className="relative flex-1 min-h-[420px] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center transition-colors"
                style={{ backgroundColor: outputFormat === 'transparent' ? '#0a0a0c' : bgColor }}
              >
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="w-16 h-16 rounded-full border-4 border-cyan-400/20 border-t-cyan-400 animate-spin flex items-center justify-center">
                      <Sparkles size={24} className="text-cyan-400 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold font-display uppercase tracking-wider text-white">
                        Synthesizing 3D Studio Composition
                      </p>
                      <p className="text-xs text-white/60 font-mono max-w-xs">
                        Aligning cyber pedestal, positioning bottle, and generating studio lighting...
                      </p>
                    </div>
                  </div>
                ) : generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="AI Generated Render"
                    className="w-full h-full object-contain max-h-[500px] animate-fadeIn"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-center p-6 text-white/50">
                    <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center">
                      <Wand2 size={28} className="text-white/40" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white/80">
                        Ready to Generate 3D Character Photo
                      </p>
                      <p className="text-xs text-white/50 max-w-xs">
                        Upload your bottle photo above, select a Guardian, and click <strong>"Render 3D Photo"</strong> to produce the exact Image 1 quality scene!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions when generated */}
              {generatedImage && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleApplyToSite}
                    disabled={appliedSuccess}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all ${
                      appliedSuccess
                        ? 'bg-green-600 text-white'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    {appliedSuccess ? (
                      <>
                        <Check size={16} />
                        <span>Saved & Published to Live Site!</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Apply & Publish to Live Storefront</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="py-3 px-4 rounded-xl border border-white/20 bg-black/40 hover:bg-white/10 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                    title="Download 4K PNG"
                  >
                    <Download size={14} />
                    <span>Download PNG</span>
                  </button>

                  <button
                    onClick={() => handleGenerate(engine)}
                    disabled={isGenerating}
                    className="py-3 px-4 rounded-xl border border-white/20 bg-black/40 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={14} />
                    <span>Regenerate</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-white/50">
          <span className="font-mono flex items-center gap-2">
            <Info size={13} className="text-cyan-400" />
            Active Engine: {engine === 'studio' ? 'Instant 4K 3D Studio Renderer (0 Quota)' : 'Gemini 3.1 Flash Cloud AI'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-white/15 hover:bg-white/10 text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
