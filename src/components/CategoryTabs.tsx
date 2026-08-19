import { useRef, useEffect } from 'react';
import { CATEGORIES, type CategoryId } from '../types/product';

interface Props {
  active: CategoryId;
  onSelect: (id: CategoryId) => void;
}

export default function CategoryTabs({ active, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view on mobile
  useEffect(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 max-w-full rounded-full no-scrollbar"
      style={{
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
      role="tablist"
      aria-label="Product categories"
    >
      {CATEGORIES.map((cat) => {
        const isActive = cat.id === active;
        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(cat.id)}
            className="shrink-0 px-3.5 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-all duration-200"
            style={{
              color: isActive ? '#14110F' : 'rgba(255,255,255,0.85)',
              backgroundColor: isActive ? '#FFFFFF' : 'transparent',
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
            }}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
