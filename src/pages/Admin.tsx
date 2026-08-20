import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  LogOut,
  Edit2,
  Trash2,
  ExternalLink,
  Droplet,
  RefreshCw,
  DatabaseZap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { CATEGORIES, type CategoryId, type Product } from '../types/product';
import ProductForm from '../components/ProductForm';
import CharacterManager from '../components/CharacterManager';
import ThemeToggle from '../components/ThemeToggle';
import { getCharacterById } from '../data/characters';

export default function Admin() {
  const { user, logout } = useAuth();
  const {
    products,
    source,
    firestoreEmpty,
    addProduct,
    updateProduct,
    deleteProduct,
    seedCatalog,
    resetCatalog,
  } = useProducts();

  const [activeTab, setActiveTab] = useState<'catalog' | 'characters'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.apiStandard.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<CategoryId, Product[]>();
    for (const c of CATEGORIES) map.set(c.id, []);
    for (const p of filteredProducts) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [filteredProducts]);

  async function handleDelete(id: string) {
    try {
      await deleteProduct(id);
      setDeleteConfirmId(null);
      showToast('Product grade successfully deleted.');
    } catch {
      showToast('Failed to delete product.');
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedCatalog();
      showToast('Standard lubricant grades successfully synced to Firestore!');
    } catch (err: any) {
      console.error('Seed error:', err);
      showToast(`Firestore Sync Notice: ${err?.message || 'Check console'}`);
    } finally {
      setSeeding(false);
    }
  }

  async function handleReset() {
    if (!window.confirm('Reset all catalog grades back to default demo items?')) return;
    setSeeding(true);
    try {
      await resetCatalog();
      showToast('Catalog restored to default grades.');
    } catch {
      showToast('Failed to reset catalog.');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink font-body">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[250] bg-emerald-500 text-black font-semibold text-xs px-4 py-3 rounded-xl shadow-2xl animate-fade-in flex items-center gap-2">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="border-b border-line/10 bg-surface/90 backdrop-blur-md sticky top-0 z-40 px-6 sm:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D97B2E]/10 border border-[#D97B2E]/20 flex items-center justify-center">
              <Droplet size={22} fill="#D97B2E" className="text-[#D97B2E]" />
            </div>
            <div>
              <p className="font-display text-lg uppercase tracking-wide leading-none">ABC Lubricants Admin</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-ink/40">{user?.email || 'Administrator'}</span>
                <span className="text-ink/20">·</span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    source === 'firestore'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  }`}
                >
                  {source === 'firestore' ? 'abc-lubricants-catalog (Firestore)' : 'Local Storage'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink/70 hover:text-ink transition-colors bg-tint/5 hover:bg-tint/10 border border-line/15 rounded-full px-4 py-2"
            >
              <ExternalLink size={14} />
              View Storefront
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink/60 hover:text-ink transition-colors border border-line/15 rounded-full px-3.5 py-2 hover:bg-tint/5"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 sm:px-10 py-8 max-w-7xl mx-auto">
        {/* Banner Notice */}
        {source === 'demo' && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs px-4 py-3 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="font-semibold text-amber-300">Local Catalog Mode:</span> Changes you make (Create, Edit, Delete, Seed) are automatically saved to your browser&apos;s local storage and live in the storefront.
            </div>
            <button
              onClick={handleReset}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300 hover:text-amber-100 underline decoration-amber-500/40 underline-offset-2"
            >
              <RefreshCw size={12} />
              Reset Catalog
            </button>
          </div>
        )}

        {source === 'firestore' && firestoreEmpty && (
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs px-4 py-3 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="font-semibold text-blue-300">Empty Cloud Database:</span> Your Firestore products collection is empty. Click below to populate it with starter grades.
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-100 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <DatabaseZap size={13} />
              {seeding ? 'Seeding…' : 'Seed Cloud Catalog'}
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 mb-8 p-1 bg-surface border border-line/10 rounded-full w-fit">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'catalog' ? 'bg-[#D97B2E] text-ink shadow-md' : 'text-ink/60 hover:text-ink'
            }`}
          >
            Catalog Grades
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'characters' ? 'bg-[#D97B2E] text-ink shadow-md' : 'text-ink/60 hover:text-ink'
            }`}
          >
            Characters
          </button>
        </div>

        {activeTab === 'characters' ? (
          <CharacterManager />
        ) : (
        <>
        {/* Action & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl uppercase tracking-wide">Catalog Grades</h1>
            <p className="text-xs text-ink/50 mt-1">
              Showing {filteredProducts.length} of {products.length} registered lubricant grades with holding titans
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-2 bg-[#D97B2E] text-ink text-xs font-bold uppercase tracking-wider rounded-full px-5 py-2.5 hover:bg-[#c46b23] transition-colors shadow-lg"
            >
              <Plus size={16} />
              Add New Grade
            </button>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, product name, approval, or spec..."
              className="w-full bg-surface border border-line/10 rounded-full pl-10 pr-4 py-2 text-xs text-ink placeholder-ink/30 focus:border-line/30 outline-none"
            />
          </div>

          {/* Category Badges Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-ink text-canvas'
                  : 'bg-tint/5 text-ink/60 hover:text-ink hover:bg-tint/10'
              }`}
            >
              All ({products.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = products.filter((p) => p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    selectedCategory === cat.id
                      ? 'bg-ink text-canvas'
                      : 'bg-tint/5 text-ink/60 hover:text-ink hover:bg-tint/10'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty state */}
        {filteredProducts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line/20 p-12 text-center my-8">
            <Droplet size={36} className="mx-auto text-ink/20 mb-3" />
            <p className="font-display text-lg uppercase mb-1">No Lubricant Grades Found</p>
            <p className="text-xs text-ink/40 max-w-sm mx-auto mb-6">
              {searchQuery
                ? `No products matched "${searchQuery}". Try clearing search filters.`
                : 'No grades are currently registered in this category.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold px-4 py-2 rounded-full border border-line/20 hover:bg-tint/5 text-ink"
                >
                  Clear Search
                </button>
              )}
              <button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="text-xs font-semibold px-4 py-2 rounded-full bg-ink text-canvas hover:bg-ink/90"
              >
                Create First Grade
              </button>
            </div>
          </div>
        )}

        {/* Product Cards Grouped by Category */}
        <div className="space-y-10">
          {CATEGORIES.map((cat) => {
            const items = grouped.get(cat.id) ?? [];
            if (items.length === 0) return null;

            return (
              <section key={cat.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-line/10 pb-2">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#D97B2E] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D97B2E]" />
                    {cat.label} ({items.length})
                  </h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((p) => {
                    const char = getCharacterById(p.characterId);
                    return (
                      <div
                        key={p.id}
                        className="group rounded-2xl border border-line/10 bg-surface hover:border-line/25 p-5 flex flex-col justify-between transition-all hover:shadow-xl relative overflow-hidden"
                      >
                        {/* Top Accent Strip */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1.5"
                          style={{ backgroundColor: p.bg }}
                        />

                        <div>
                          {/* Header with Color Badge and Code */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-4 h-4 rounded-full ring-2 ring-white/10 shrink-0"
                                style={{ backgroundColor: p.bg }}
                                title={`Theme color: ${p.bg}`}
                              />
                              <span
                                className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                                style={{ backgroundColor: `${p.bg}25`, color: p.accent || '#FFFFFF' }}
                              >
                                {p.code}
                              </span>
                            </div>

                            {/* Character & Art Badges */}
                            <div className="flex items-center gap-1.5">
                              {p.compositeImageUrl ? (
                                <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Sparkles size={10} className="text-[#D97B2E]" />
                                  Realistic 3D
                                </span>
                              ) : (
                                <span
                                  className="text-[10px] uppercase font-semibold text-ink/80 bg-tint/10 border border-line/15 px-2 py-0.5 rounded-full flex items-center gap-1"
                                  title={`Guardian Character: ${char.name}`}
                                >
                                  <Sparkles size={10} className="text-[#D97B2E]" />
                                  {char.name.split(' ')[0]}
                                </span>
                              )}
                              {p.imageUrl && !p.compositeImageUrl && (
                                <span className="text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                                  Bottle Photo
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Product Title & API */}
                          <h3 className="font-semibold text-base text-ink group-hover:text-[#D97B2E] transition-colors line-clamp-1">
                            {p.name}
                          </h3>
                          <p className="text-xs text-ink/50 mt-0.5 mb-3 font-mono">{p.apiStandard}</p>

                          <p className="text-xs text-ink/60 line-clamp-2 leading-relaxed mb-4">
                            {p.description}
                          </p>

                          {/* Specs Grid Mini */}
                          <div className="grid grid-cols-3 gap-2 bg-tint/5 rounded-xl p-2.5 mb-4 text-[11px]">
                            <div>
                              <span className="text-ink/40 block text-[9px] uppercase tracking-wider">Viscosity</span>
                              <span className="font-medium text-ink/90 truncate block">
                                {p.specs?.viscosityIndex || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-ink/40 block text-[9px] uppercase tracking-wider">Pour Pt</span>
                              <span className="font-medium text-ink/90 truncate block">
                                {p.specs?.pourPoint || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-ink/40 block text-[9px] uppercase tracking-wider">Flash Pt</span>
                              <span className="font-medium text-ink/90 truncate block">
                                {p.specs?.flashPoint || '—'}
                              </span>
                            </div>
                          </div>

                          {p.specs?.oemApprovals && p.specs.oemApprovals.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-4">
                              {p.specs.oemApprovals.slice(0, 2).map((appr) => (
                                <span
                                  key={appr}
                                  className="text-[10px] px-2 py-0.5 rounded bg-tint/5 text-ink/60 border border-line/10 truncate max-w-[130px]"
                                >
                                  {appr}
                                </span>
                              ))}
                              {p.specs.oemApprovals.length > 2 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-tint/5 text-ink/40">
                                  +{p.specs.oemApprovals.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-line/10 mt-auto">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => {
                                setEditing(p);
                                setFormOpen(true);
                              }}
                              className="flex items-center gap-1 text-xs font-semibold text-ink/80 hover:text-ink px-2.5 py-1.5 rounded-lg hover:bg-tint/10 transition-colors"
                              aria-label={`Edit ${p.name}`}
                            >
                              <Edit2 size={13} />
                              Edit
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {deleteConfirmId === p.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-xs text-ink/40 hover:text-ink px-1.5 py-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(p.id)}
                                className="text-ink/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-tint/5 transition-colors"
                                aria-label={`Delete ${p.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        </>
        )}
      </main>

      {/* Product Form Modal */}
      {formOpen && (
        <ProductForm
          initial={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setFormOpen(false);
            setEditing(null);
            showToast(editing ? 'Grade updated successfully.' : 'New grade created successfully.');
          }}
          onAdd={addProduct}
          onUpdate={updateProduct}
        />
      )}
    </div>
  );
}
