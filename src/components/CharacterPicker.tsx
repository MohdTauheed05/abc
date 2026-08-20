import { useState } from 'react';
import { useCharacters } from '../hooks/useCharacters';
import { Check, Search } from 'lucide-react';

interface Props {
  selectedId: string | null | undefined;
  onSelect: (characterId: string) => void;
}

export default function CharacterPicker({ selectedId, onSelect }: Props) {
  const { characters } = useCharacters();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = Array.from(new Set(characters.map((c) => c.category)));

  const filtered = characters.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.codename.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || c.category === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-3">
      {/* Search & Filter */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search characters (e.g. Vanguard, Samurai, Juggernaut)..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-white/30 outline-none"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 outline-none max-w-[180px]"
        >
          <option value="all" className="bg-[#1C1815]">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat} className="bg-[#1C1815]">
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Grid of Characters — real HD photoreal thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[290px] overflow-y-auto pr-1">
        {filtered.map((char) => {
          const isSelected = selectedId === char.id;
          return (
            <button
              type="button"
              key={char.id}
              onClick={() => onSelect(char.id)}
              className={`rounded-xl border text-left transition-all relative overflow-hidden flex flex-col group ${
                isSelected
                  ? 'border-[#D97B2E] bg-[#D97B2E]/15 ring-1 ring-[#D97B2E]'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div
                className="relative w-full aspect-[3/4] overflow-hidden bg-black/40"
              >
                <img
                  src={char.imageSrc}
                  alt={char.name}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#D97B2E] flex items-center justify-center text-white shadow-md">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
                <span
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{ backgroundColor: char.themeColor }}
                />
              </div>

              <div className="p-2">
                <p className="text-xs font-semibold text-white group-hover:text-[#D97B2E] transition-colors line-clamp-1">
                  {char.name}
                </p>
                <p className="text-[10px] text-white/40 font-mono line-clamp-1">
                  {char.codename}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
