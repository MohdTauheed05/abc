import { useState, useId, type FormEvent } from 'react';
import { Sparkles, UploadCloud, X, Trash2, Image as ImageIcon, Check, Wand2, Loader2 } from 'lucide-react';
import { CATEGORIES, type CategoryId, type Product } from '../types/product';
import { getCharacterById } from '../data/characters';
import { compressImageFile } from '../utils/imageCompressor';
import CharacterBottleHolder from './CharacterBottleHolder';
import CharacterPicker from './CharacterPicker';
import AiRenderGeneratorModal from './AiRenderGeneratorModal';

interface Props {
  initial?: Product | null;
  onClose: () => void;
  onSaved: () => void;
  onAdd: (
    data: Omit<Product, 'id'> & { id?: string },
    imageFile?: File | null,
    fullCharacterFile?: File | null
  ) => Promise<Product>;
  onUpdate: (
    id: string,
    updates: Partial<Product>,
    imageFile?: File | null,
    fullCharacterFile?: File | null
  ) => Promise<void>;
}

export default function ProductForm({
  initial,
  onClose,
  onSaved,
  onAdd,
  onUpdate,
}: Props) {
  const [form, setForm] = useState({
    category: initial?.category || ('motor-oil' as CategoryId),
    code: initial?.code || '',
    name: initial?.name || '',
    apiStandard: initial?.apiStandard || '',
    description: initial?.description || '',
    characterId: initial?.characterId || 'char_01',
    bg: initial?.bg || '#14110F',
    panel: initial?.panel || '#2B1A12',
    accent: initial?.accent || '#D97B2E',
    viscosityIndex: initial?.specs?.viscosityIndex || '',
    pourPoint: initial?.specs?.pourPoint || '',
    flashPoint: initial?.specs?.flashPoint || '',
    oemApprovals: (initial?.specs?.oemApprovals || []).join(', '),
  });

  // Presentation Mode: 'robot-guardian' (HD Photoreal Character Library) vs 'realistic-3d' (Uploaded Realistic 3D Render)
  const [presentationMode, setPresentationMode] = useState<'robot-guardian' | 'realistic-3d'>(
    initial?.compositeImageUrl ? 'realistic-3d' : 'robot-guardian'
  );

  // Bottle image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initial?.bottleImageUrl || initial?.imageUrl || null
  );

  // Full Realistic Character Image (composite with bottle) state
  const [fullCharFile, setFullCharFile] = useState<File | null>(null);
  const [fullCharPreview, setFullCharPreview] = useState<string | null>(
    initial?.compositeImageUrl || null
  );
  const [processingImage, setProcessingImage] = useState(false);
  const [autoRemoveWhite, setAutoRemoveWhite] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiStudioOpen, setAiStudioOpen] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleBottleFile(file: File | undefined) {
    if (!file) return;
    setImageFile(file);
    setProcessingImage(true);
    try {
      const cleanedDataUrl = await compressImageFile(file, 640, autoRemoveWhite);
      setImagePreview(cleanedDataUrl || URL.createObjectURL(file));
    } catch {
      setImagePreview(URL.createObjectURL(file));
    } finally {
      setProcessingImage(false);
    }
  }

  function handleRemoveBottleImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  async function handleFullCharFile(file: File | undefined) {
    if (!file) return;
    setFullCharFile(file);
    setPresentationMode('realistic-3d');
    setProcessingImage(true);
    try {
      const cleanedDataUrl = await compressImageFile(file, 640, autoRemoveWhite);
      setFullCharPreview(cleanedDataUrl || URL.createObjectURL(file));
    } catch {
      setFullCharPreview(URL.createObjectURL(file));
    } finally {
      setProcessingImage(false);
    }
  }

  async function applyBackgroundRemover() {
    if (!fullCharPreview && !imagePreview) return;
    setProcessingImage(true);
    try {
      if (fullCharPreview) {
        const cleaned = await compressImageFile(fullCharPreview, 640, true);
        if (cleaned) setFullCharPreview(cleaned);
      }
      if (imagePreview) {
        const cleaned = await compressImageFile(imagePreview, 640, true);
        if (cleaned) setImagePreview(cleaned);
      }
    } catch (err) {
      console.warn('Auto remove white failed:', err);
    } finally {
      setProcessingImage(false);
    }
  }

  function handleRemoveFullCharImage() {
    setFullCharFile(null);
    setFullCharPreview(null);
    setPresentationMode('robot-guardian');
  }

  function handleSelectVectorGuardian(charId: string) {
    update('characterId', charId);
    setPresentationMode('robot-guardian');
    setFullCharPreview(null);
    setFullCharFile(null);
  }

  const selectedCharacter = getCharacterById(form.characterId);

  // Live preview product object based on active presentation mode
  const previewProduct: Product = {
    id: initial?.id || 'preview-temp',
    category: form.category,
    code: form.code || 'GRADE',
    name: form.name || 'Product Display Name',
    apiStandard: form.apiStandard || 'API Standard',
    description: form.description || '',
    characterId: form.characterId,
    bg: form.bg,
    panel: form.panel,
    accent: form.accent,
    imageUrl: imagePreview || undefined,
    bottleImageUrl: imagePreview || undefined,
    compositeImageUrl: presentationMode === 'realistic-3d' ? fullCharPreview || undefined : undefined,
    specs: {
      viscosityIndex: form.viscosityIndex || 'N/A',
      pourPoint: form.pourPoint || 'N/A',
      flashPoint: form.flashPoint || 'N/A',
      oemApprovals: form.oemApprovals ? form.oemApprovals.split(',').map((s) => s.trim()) : [],
    },
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError('Please fill in Grade Code and Product Name.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const is3dMode = presentationMode === 'realistic-3d';
      const payload: Partial<Product> = {
        category: form.category,
        code: form.code.trim(),
        name: form.name.trim(),
        apiStandard: form.apiStandard.trim() || 'Industry Standard',
        description: form.description.trim(),
        characterId: form.characterId,
        bg: form.bg,
        panel: form.panel,
        accent: form.accent,
        compositeImageUrl: is3dMode && fullCharPreview ? fullCharPreview : '',
        imageUrl: imagePreview || '',
        bottleImageUrl: imagePreview || '',
        specs: {
          viscosityIndex: form.viscosityIndex.trim() || 'N/A',
          pourPoint: form.pourPoint.trim() || 'N/A',
          flashPoint: form.flashPoint.trim() || 'N/A',
          oemApprovals: form.oemApprovals
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      };

      if (initial) {
        await onUpdate(initial.id, payload, imageFile, is3dMode ? fullCharFile : null);
      } else {
        await onAdd(payload as Omit<Product, 'id'>, imageFile, is3dMode ? fullCharFile : null);
      }

      onSaved();
    } catch (err) {
      console.error('Save product error:', err);
      setError(err instanceof Error ? err.message : 'Could not save grade. Please check your data.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center z-[200] p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl bg-[#1C1815] text-white rounded-2xl border border-white/15 shadow-2xl my-4 flex flex-col max-h-[92vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="font-display text-xl uppercase tracking-wide flex items-center gap-2">
              <Sparkles size={18} className="text-[#D97B2E]" />
              {initial ? 'Edit Grade & Realistic Character' : 'Add New Grade & Realistic Character'}
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Upload realistic character/bottle renders with auto-transparency or customize specifications.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Top Row: Form Details + Live Character Holder Preview */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Core Fields */}
            <div className="lg:col-span-7 space-y-4">
              {/* Category & Grade */}
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => update('category', e.target.value as CategoryId)}
                    className="input"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#1C1815]">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Grade Code (e.g. 10W-40, 20W-50, DOT 4)">
                  <input
                    required
                    value={form.code}
                    onChange={(e) => update('code', e.target.value)}
                    className="input font-bold"
                    placeholder="10W-40 DIESEL"
                  />
                </Field>
              </div>

              {/* Product Name & API Standard */}
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Product Display Name">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className="input"
                    placeholder="Venol Semisynthetic Diesel Truck"
                  />
                </Field>

                <Field label="API / Industry Standard">
                  <input
                    required
                    value={form.apiStandard}
                    onChange={(e) => update('apiStandard', e.target.value)}
                    className="input"
                    placeholder="API CI-4/CG-4 · ACEA E7"
                  />
                </Field>
              </div>

              {/* Description */}
              <Field label="Description & Application Notes">
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="input min-h-[70px] resize-y leading-relaxed"
                  placeholder="Engineered for high-mileage diesel fleet trucks, extreme thermal endurance and heavy torque protection..."
                />
              </Field>

              {/* PRESENTATION MODE TABS */}
              <div className="space-y-2">
                <span className="label text-white/80">Character Presentation Mode</span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setPresentationMode('robot-guardian');
                      setFullCharPreview(null);
                      setFullCharFile(null);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      presentationMode === 'robot-guardian'
                        ? 'bg-[#D97B2E] text-black shadow-md'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>🤖</span>
                    <span>HD Character Library</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresentationMode('realistic-3d')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      presentationMode === 'realistic-3d'
                        ? 'bg-[#D97B2E] text-black shadow-md'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>🎨</span>
                    <span>Realistic 3D Character</span>
                  </button>
                </div>
              </div>

              {presentationMode === 'realistic-3d' ? (
                /* UPLOAD SECTION 1: Full Realistic Character Render (with bottle) */
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#D97B2E]" />
                      Realistic 3D Character Photo
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/60">Auto Clean White BG</span>
                      <input
                        type="checkbox"
                        checked={autoRemoveWhite}
                        onChange={(e) => setAutoRemoveWhite(e.target.checked)}
                        className="rounded accent-[#D97B2E]"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Generate a photorealistic 3D robotic render holding your bottle on the pedestal using AI, or upload your own 3D image.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {/* Option A: Generate with AI Studio */}
                    <button
                      type="button"
                      onClick={() => setAiStudioOpen(true)}
                      className="py-3 px-3 rounded-lg bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900 hover:to-blue-900 border border-cyan-400/40 text-cyan-200 text-xs font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 shadow-lg shadow-cyan-950/40 transition-all"
                    >
                      <div className="flex items-center gap-1.5 text-cyan-300">
                        <Sparkles size={16} className="animate-pulse" />
                        <span>✨ Generate with AI Studio</span>
                      </div>
                      <span className="text-[9px] text-white/50 lowercase">
                        photoreal 3D octane render (Image 1 quality)
                      </span>
                    </button>

                    {/* Option B: Choose File */}
                    <label className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-amber-500/40 p-2.5 cursor-pointer hover:border-amber-400 hover:bg-amber-500/10 transition-all text-center">
                      <UploadCloud size={18} className="text-[#D97B2E]" />
                      <div className="text-xs">
                        <span className="font-semibold text-white">Upload File</span>
                        <span className="text-white/40 block text-[9px]">PNG / JPG</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFullCharFile(e.target.files?.[0])}
                      />
                    </label>
                  </div>

                  {fullCharPreview && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-amber-500/30">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={fullCharPreview}
                            alt="Full Character Preview"
                            className="h-12 w-10 object-contain rounded bg-black/30 p-0.5"
                          />
                          <div className="text-xs">
                            <p className="font-semibold text-white truncate max-w-[180px]">
                              {fullCharFile ? fullCharFile.name : 'Realistic 3D Character'}
                            </p>
                            <p className="text-amber-300 text-[10px]">Active character render</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={applyBackgroundRemover}
                            disabled={processingImage}
                            className="text-xs font-semibold px-2 py-1 rounded bg-[#D97B2E]/20 text-[#D97B2E] hover:bg-[#D97B2E]/30 flex items-center gap-1 transition-colors"
                            title="Click to strip white background"
                          >
                            {processingImage ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                            Clean White BG
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveFullCharImage}
                            className="text-red-400 hover:text-red-300 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                            title="Remove full character image"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* UPLOAD SECTION 2: Bottle-Only Photo (clamps inside vector robotic character) */
                <div className="space-y-2">
                   <span className="label block text-white/80">
                    Product Bottle Photo (will rest on the pedestal)
                  </span>
                  <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 p-3 cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all text-center">
                    <UploadCloud size={18} className="text-white/60" />
                    <div className="text-xs">
                      <span className="font-semibold text-white">Upload Isolated Bottle Photo</span>
                      <span className="text-white/40 block text-[10px] mt-0.5">PNG or JPG</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBottleFile(e.target.files?.[0])}
                    />
                  </label>

                  {imagePreview && (
                    <div className="mt-2 flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-10 w-10 object-contain rounded bg-black/20 p-1"
                        />
                        <div className="text-xs">
                          <p className="font-semibold text-white truncate max-w-[180px]">
                            {imageFile ? imageFile.name : 'Bottle Photo'}
                          </p>
                          <p className="text-emerald-400 text-[10px]">Held by {selectedCharacter.name}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveBottleImage}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        title="Remove image"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Live Interactive Character Bottle Holder Preview */}
            <div className="lg:col-span-5 bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-between min-h-[360px] relative overflow-hidden">
              <div className="w-full flex items-center justify-between text-xs pb-2 border-b border-white/10">
                <span className="font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-[#D97B2E]" />
                  Live Character Preview
                </span>
                <span className="text-[10px] text-[#D97B2E] font-mono uppercase">
                  {presentationMode === 'realistic-3d' && fullCharPreview
                    ? 'Realistic 3D Render'
                    : selectedCharacter.name}
                </span>
              </div>

              <div className="w-full h-[280px] my-2 flex items-center justify-center">
                <CharacterBottleHolder
                  product={previewProduct}
                  characterOverride={selectedCharacter}
                  showPedestal={true}
                />
              </div>

              <div className="w-full text-center text-[10px] text-white/40 pt-2 border-t border-white/10">
                {presentationMode === 'realistic-3d' && fullCharPreview
                  ? 'Showing full photorealistic 3D guardian render'
                  : `Active HD Character: ${selectedCharacter.name} holding bottle on pedestal`}
              </div>
            </div>
          </div>

          {/* Character Library Selector (24+ Prebuilt Characters) */}
          <div className="pt-2 border-t border-white/10">
            <div className="mb-2 flex items-center justify-between">
              <span className="label text-white/80">HD Character Library (12 Photoreal Guardians)</span>
              {presentationMode === 'realistic-3d' && (
                <span className="text-[10px] text-amber-400 font-mono">
                  (Selecting a character switches to HD Character mode)
                </span>
              )}
            </div>
            <CharacterPicker
              selectedId={form.characterId}
              onSelect={handleSelectVectorGuardian}
            />
          </div>

          {/* Color Palette Customization */}
          <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-white/10">
            <Field label="Hero Stage Background">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.bg}
                  onChange={(e) => update('bg', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-white/20 bg-transparent"
                />
                <input
                  type="text"
                  value={form.bg}
                  onChange={(e) => update('bg', e.target.value)}
                  className="input font-mono text-xs uppercase"
                />
              </div>
            </Field>

            <Field label="Panel Tint">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.panel}
                  onChange={(e) => update('panel', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-white/20 bg-transparent"
                />
                <input
                  type="text"
                  value={form.panel}
                  onChange={(e) => update('panel', e.target.value)}
                  className="input font-mono text-xs uppercase"
                />
              </div>
            </Field>

            <Field label="Accent Neon Glow">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accent}
                  onChange={(e) => update('accent', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-white/20 bg-transparent"
                />
                <input
                  type="text"
                  value={form.accent}
                  onChange={(e) => update('accent', e.target.value)}
                  className="input font-mono text-xs uppercase"
                />
              </div>
            </Field>
          </div>

          {/* Technical Specifications */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-display uppercase text-sm tracking-wide">Technical Specs (Discover Drawer)</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Viscosity Index">
                <input
                  value={form.viscosityIndex}
                  onChange={(e) => update('viscosityIndex', e.target.value)}
                  className="input font-mono"
                  placeholder="155"
                />
              </Field>
              <Field label="Pour Point">
                <input
                  value={form.pourPoint}
                  onChange={(e) => update('pourPoint', e.target.value)}
                  className="input font-mono"
                  placeholder="-36°C"
                />
              </Field>
              <Field label="Flash Point">
                <input
                  value={form.flashPoint}
                  onChange={(e) => update('flashPoint', e.target.value)}
                  className="input font-mono"
                  placeholder="224°C"
                />
              </Field>
            </div>
            <Field label="OEM Approvals (comma-separated)">
              <input
                value={form.oemApprovals}
                onChange={(e) => update('oemApprovals', e.target.value)}
                className="input"
                placeholder="MB 228.3, MAN M 3275-1, Volvo VDS-3, Renault RLD-2, Mack EO-N"
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 shrink-0 bg-[#171412]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || processingImage}
            className="px-6 py-2.5 rounded-xl bg-[#D97B2E] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#c46b23] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg"
          >
            <Check size={15} />
            {saving ? 'Saving to Firestore…' : initial ? 'Save Updates' : 'Add Grade to Catalog'}
          </button>
        </div>
      </form>

      {/* AI Realistic 3D Render Studio Modal */}
      <AiRenderGeneratorModal
        isOpen={aiStudioOpen}
        onClose={() => setAiStudioOpen(false)}
        initialProduct={
          initial || {
            id: 'temp_prod',
            code: form.code || 'GRADE',
            name: form.name || 'VENOL Synthetic Oil',
            category: form.category,
            viscosity: form.viscosity || 'SAE 0W-16',
            apiStandard: form.apiStandard,
            description: form.description,
            bg: form.bg,
            characterId: form.characterId,
            imageUrl: imagePreview || '',
            specs: {
              oemApprovals: [],
            },
          }
        }
        onApplySuccess={(_prodId, imageUrl) => {
          setFullCharPreview(imageUrl);
          setPresentationMode('realistic-3d');
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}
