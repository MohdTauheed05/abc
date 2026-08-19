import { useEffect, useRef } from 'react';
import type { Product } from '../types/product';

interface Props {
  grades: Product[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function GradeSelector({ grades, activeId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active grade into view
  useEffect(() => {
    if (!containerRef.current) return;
    const activeBtn = containerRef.current.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeId]);

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-2 overflow-x-auto py-1 px-1 max-w-full no-scrollbar select-none"
      role="tablist"
      aria-label="Available product grades"
    >
      {grades.map((g) => {
        const isActive = g.id === activeId;
        return (
          <button
            key={g.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(g.id)}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold uppercase tracking-wider border transition-all duration-200"
            style={{
              borderColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
              backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.2)',
              color: '#FFFFFF',
              backdropFilter: 'blur(6px)',
              boxShadow: isActive ? '0 0 12px rgba(255,255,255,0.3)' : 'none',
              transform: isActive ? 'scale(1.04)' : 'scale(1)',
            }}
          >
            {g.code}
          </button>
        );
      })}
    </div>
  );
}
