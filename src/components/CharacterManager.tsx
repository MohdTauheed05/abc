import { useState, type FormEvent } from 'react';
import { Plus, Trash2, UploadCloud, X, Check, Loader2 } from 'lucide-react';
import { useCharacters } from '../hooks/useCharacters';

export default function CharacterManager() {
  const { characters, loading, source, addCharacter, deleteCharacter } = useCharacters();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await deleteCharacter(id);
      setDeleteConfirmId(null);
      showToast('Character removed. It will no longer appear in the picker.');
    } catch (err) {
      console.error(err);
      showToast('Failed to remove character.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[250] bg-emerald-500 text-black font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide">Characters</h1>
          <p className="text-xs text-ink/50 mt-1">
            {characters.length} character{characters.length === 1 ? '' : 's'} available ·{' '}
            {source === 'firestore' ? 'synced live to everyone via Firestore' : 'saved to this browser'}
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 bg-[#D97B2E] text-ink text-xs font-bold uppercase tracking-wider rounded-full px-5 py-2.5 hover:bg-[#c46b23] transition-colors shadow-lg w-fit"
        >
          <Plus size={16} />
          Upload New Character
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink/40 text-sm">Loading characters…</div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {characters.map((char) => (
            <div
              key={char.id}
              className="rounded-2xl border border-line/10 bg-surface overflow-hidden group relative"
            >
              <div className="relative aspect-[3/4] bg-black/40">
                <img
                  src={char.imageSrc}
                  alt={char.name}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
                <span
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: char.themeColor }}
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold text-ink line-clamp-1">{char.name}</p>
                <p className="text-[10px] text-ink/40 font-mono line-clamp-1">{char.codename}</p>
                <p className="text-[10px] text-ink/30 mt-0.5 line-clamp-1">{char.category}</p>
              </div>

              <div className="px-3 pb-3">
                {deleteConfirmId === char.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDelete(char.id)}
                      disabled={busyId === char.id}
                      className="flex-1 text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1.5 bg-red-500/10 rounded-lg flex items-center justify-center gap-1"
                    >
                      {busyId === char.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-xs text-ink/40 hover:text-ink px-2 py-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(char.id)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-ink/60 hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-tint/5 transition-colors"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <AddCharacterModal
          onClose={() => setFormOpen(false)}
          onAdd={async (data, file) => {
            await addCharacter(data, file);
            setFormOpen(false);
            showToast('New character uploaded and live for everyone.');
          }}
        />
      )}
    </div>
  );
}

function AddCharacterModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (
    data: { name: string; codename: string; category: string; themeColor: string },
    file: File
  ) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [codename, setCodename] = useState('');
  const [category, setCategory] = useState('');
  const [themeColor, setThemeColor] = useState('#D97B2E');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !file) {
      setError('A character name and photo are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd({ name: name.trim(), codename: codename.trim(), category: category.trim(), themeColor }, file);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not upload character.');
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
        className="w-full max-w-md bg-surface text-ink rounded-2xl border border-line/15 shadow-2xl my-4 flex flex-col max-h-[92vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line/10 shrink-0">
          <h2 className="font-display text-lg uppercase tracking-wide">Upload New Character</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-tint/10 flex items-center justify-center text-ink/60 hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-xs">
              {error}
            </div>
          )}

          <label className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line/20 p-4 cursor-pointer hover:border-line/40 hover:bg-tint/5 transition-all text-center">
            {preview ? (
              <img src={preview} alt="Preview" className="h-32 object-contain rounded" />
            ) : (
              <>
                <UploadCloud size={20} className="text-ink/60" />
                <span className="text-xs font-semibold text-ink">Upload Character Photo</span>
                <span className="text-ink/40 block text-[10px]">PNG or JPG, transparent background preferred</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>

          <div>
            <label className="label mb-1.5 block">Character Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Aegis Vanguard"
              required
            />
          </div>
          <div>
            <label className="label mb-1.5 block">Codename (optional)</label>
            <input
              value={codename}
              onChange={(e) => setCodename(e.target.value)}
              className="input"
              placeholder="GOLDEN HORN GUARDIAN"
            />
          </div>
          <div>
            <label className="label mb-1.5 block">Category (optional)</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input"
              placeholder="Heavy Diesel / XHPD"
            />
          </div>
          <div>
            <label className="label mb-1.5 block">Theme Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-line/20 bg-transparent"
              />
              <input
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="input font-mono text-xs uppercase"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line/10 shrink-0 bg-surface2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-ink/60 hover:text-ink hover:bg-tint/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#D97B2E] text-ink text-xs font-bold uppercase tracking-wider hover:bg-[#c46b23] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
            {saving ? 'Uploading…' : 'Add Character'}
          </button>
        </div>
      </form>
    </div>
  );
}
