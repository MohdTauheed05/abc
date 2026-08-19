import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Droplet, ArrowLeft, ArrowRight, ArrowUpRight, ShieldCheck, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import GrainOverlay from './GrainOverlay';
import CategoryTabs from './CategoryTabs';
import SpecDrawer from './SpecDrawer';
import CharacterBottleHolder from './CharacterBottleHolder';
import CharacterPicker from './CharacterPicker';
import { useProducts } from '../hooks/useProducts';
import { CATEGORIES, type CategoryId } from '../types/product';

type Role = 'center' | 'left' | 'right' | 'back';

export default function HeroCarousel(): JSX.Element {
  const { products, updateProduct } = useProducts();
  const [category, setCategory] = useState<CategoryId>('motor-oil');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);

  const grades = useMemo(() => products.filter((p) => p.category === category), [products, category]);
  const count = grades.length;

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 640);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [category]);

  useEffect(() => {
    if (count > 0 && activeIndex >= count) setActiveIndex(0);
  }, [count, activeIndex]);

  function navigate(direction: 'next' | 'prev') {
    if (isAnimating || count === 0) return;
    setIsAnimating(true);
    setActiveIndex((prev) => (direction === 'next' ? (prev + 1) % count : (prev + count - 1) % count));
    window.setTimeout(() => setIsAnimating(false), 650);
  }

  if (count === 0) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-[#14110F] text-white font-body px-6">
        <Droplet size={40} className="text-[#D97B2E] mb-3" />
        <p className="text-lg uppercase font-display mb-1">No Grades Found</p>
        <p className="text-white/60 text-xs mb-6 text-center max-w-sm">
          There are currently no products registered under {CATEGORIES.find((c) => c.id === category)?.label}.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setCategory('motor-oil')}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold uppercase tracking-wider text-white"
          >
            Go to Motor Oil
          </button>
        </div>
      </div>
    );
  }

  const active = grades[activeIndex] || grades[0];

  const roleOf = (i: number): Role => {
    if (count === 1) return 'center';
    if (i === activeIndex) return 'center';
    if (count === 2) return i === (activeIndex + 1) % count ? 'right' : 'left';
    if (i === (activeIndex + count - 1) % count) return 'left';
    if (i === (activeIndex + 1) % count) return 'right';
    return 'back';
  };

  const roleStyle = (role: Role): CSSProperties => {
    switch (role) {
      case 'center':
        return {
          left: '50%',
          height: isMobile ? '64%' : '76%',
          bottom: isMobile ? '16%' : '8%',
          transform: `translateX(-50%) scale(${isMobile ? 1.0 : 1.05})`,
          filter: 'blur(0px)',
          opacity: 1,
          zIndex: 30,
        };
      case 'left':
        return {
          left: isMobile ? '8%' : '20%',
          height: isMobile ? '20%' : '30%',
          bottom: isMobile ? '26%' : '18%',
          transform: 'translateX(-50%) scale(0.85)',
          filter: 'blur(2.5px)',
          opacity: 0.7,
          zIndex: 20,
        };
      case 'right':
        return {
          left: isMobile ? '92%' : '80%',
          height: isMobile ? '20%' : '30%',
          bottom: isMobile ? '26%' : '18%',
          transform: 'translateX(-50%) scale(0.85)',
          filter: 'blur(2.5px)',
          opacity: 0.7,
          zIndex: 20,
        };
      case 'back':
      default:
        return {
          left: '50%',
          height: isMobile ? '14%' : '22%',
          bottom: isMobile ? '28%' : '22%',
          transform: 'translateX(-50%) scale(0.7)',
          filter: 'blur(6px)',
          opacity: 0.4,
          zIndex: 10,
        };
    }
  };

  async function handleSelectCharacter(charId: string) {
    if (!active) return;
    try {
      await updateProduct(active.id, {
        characterId: charId,
        compositeImageUrl: '',
      });
      setCharacterPickerOpen(false);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="relative w-full overflow-hidden font-body"
      style={{
        backgroundColor: active.bg,
        transition: 'background-color 650ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <div className="relative w-full" style={{ height: '100vh', overflow: 'hidden' }}>
        <GrainOverlay />

        {/* Giant ghost text of the active grade code */}
        <div
          className="absolute inset-x-0 flex items-center justify-center pointer-events-none select-none px-4 text-center"
          style={{ top: isMobile ? '22%' : '14%', zIndex: 2 }}
        >
          <span
            className="font-display uppercase text-white"
            style={{
              fontSize: 'clamp(56px, 20vw, 360px)',
              lineHeight: 0.9,
              letterSpacing: '-0.02em',
              opacity: 0.22,
              whiteSpace: isMobile ? 'normal' : 'nowrap',
            }}
          >
            {active.code}
          </span>
        </div>

        {/* UNIFIED RESPONSIVE HEADER STACK */}
        <header className="absolute top-0 inset-x-0 flex flex-col gap-2.5 px-4 sm:px-8 pt-4 pb-2" style={{ zIndex: 60 }}>
          {/* Row 1: Brand & Character Customizer & Admin Link */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-black/30 border border-white/20 flex items-center justify-center">
                <Droplet size={18} className="text-white" fill="white" fillOpacity={0.4} />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-display uppercase tracking-widest text-white block leading-none">
                  ABC Lubricants
                </span>
                <span className="text-[9px] uppercase tracking-wider text-white/60 font-mono">
                  Titan Character Studio
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Active Single Grade Pill for the Current Character View */}
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/40 bg-white/20 text-white backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#D97B2E] animate-pulse" />
                <span>Grade: {active.code}</span>
              </div>

              {/* Admin Portal Access Button */}
              <Link
                to="/admin"
                className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white bg-black/30 hover:bg-white/15 border border-white/20 rounded-full px-3 py-1.5 transition-all"
                title="Admin Portal"
              >
                <Lock size={12} className="text-[#D97B2E]" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </div>
          </div>

          {/* Row 2: Category Tabs */}
          <div className="w-full flex justify-start sm:justify-center overflow-hidden">
            <CategoryTabs active={category} onSelect={setCategory} />
          </div>
        </header>

        {/* 3D CAROUSEL: Characters holding bottles on illuminated pedestals */}
        <div className="absolute inset-0" style={{ zIndex: 3 }}>
          {grades.map((g, i) => {
            const role = roleOf(i);
            const style = roleStyle(role);
            return (
              <div
                key={g.id}
                className="absolute flex items-end justify-center cursor-pointer"
                onClick={() => {
                  if (role !== 'center' && !isAnimating) {
                    setIsAnimating(true);
                    setActiveIndex(i);
                    window.setTimeout(() => setIsAnimating(false), 650);
                  }
                }}
                style={{
                  aspectRatio: '0.65 / 1',
                  transition:
                    'transform 650ms cubic-bezier(0.4,0,0.2,1), filter 650ms cubic-bezier(0.4,0,0.2,1), opacity 650ms cubic-bezier(0.4,0,0.2,1), left 650ms cubic-bezier(0.4,0,0.2,1), bottom 650ms cubic-bezier(0.4,0,0.2,1)',
                  willChange: 'transform, filter, opacity',
                  ...style,
                }}
              >
                <CharacterBottleHolder
                  product={g}
                  showPedestal={true}
                  className="w-full h-full"
                />
              </div>
            );
          })}
        </div>

        {/* Bottom-left: Product details + Navigation controls */}
        <div
          className="absolute bottom-4 left-4 sm:bottom-12 sm:left-12 max-w-[280px] sm:max-w-[360px]"
          style={{ zIndex: 60 }}
        >
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            <span
              className="inline-block text-[9px] sm:text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 sm:py-1 rounded-full shadow-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: active.bg }}
            >
              {active.apiStandard}
            </span>
            <span className="text-[10px] text-white/80 uppercase font-mono tracking-wider hidden sm:inline">
              SAE {active.code}
            </span>
          </div>

          <p
            className="font-display uppercase text-sm sm:text-2xl text-white mb-1.5 sm:mb-2 tracking-wide leading-tight drop-shadow-md"
            style={{ opacity: 0.98 }}
          >
            {active.name}
          </p>

          <p className="hidden sm:block text-xs text-white/85 leading-relaxed mb-4 line-clamp-2 max-w-sm">
            {active.description}
          </p>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => navigate('prev')}
              aria-label="Previous grade"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/80 bg-black/25 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-150 hover:border-white hover:bg-black/40"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => navigate('next')}
              aria-label="Next grade"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white/80 bg-black/25 backdrop-blur-sm flex items-center justify-center text-white transition-all duration-150 hover:border-white hover:bg-black/40"
            >
              <ArrowRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Bottom-right: Discover Specs Drawer button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="absolute bottom-4 right-4 sm:bottom-12 sm:right-12 flex items-center gap-1.5 sm:gap-2 group bg-black/30 backdrop-blur-sm border border-white/25 rounded-full px-3.5 sm:px-5 py-2 hover:bg-black/50 hover:border-white/40 transition-all"
          style={{ zIndex: 60 }}
        >
          <span
            className="font-display uppercase text-xs sm:text-lg text-white tracking-wide"
            style={{ letterSpacing: '0.04em', lineHeight: 1 }}
          >
            Discover Specs
          </span>
          <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
        </button>

        <SpecDrawer product={active} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {/* Floating Quick Character Switcher Modal */}
        {characterPickerOpen && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setCharacterPickerOpen(false);
            }}
          >
            <div className="bg-[#1C1815] border border-white/20 rounded-2xl p-6 max-w-2xl w-full text-white shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-display text-lg uppercase tracking-wide">
                    Choose Character Guardian for {active.code}
                  </h3>
                  <p className="text-xs text-white/50">
                    Select any of the 12 robotic titans to hold this lubricant bottle on the pedestal.
                  </p>
                </div>
                <button
                  onClick={() => setCharacterPickerOpen(false)}
                  className="text-white/60 hover:text-white text-xs px-2.5 py-1 rounded bg-white/10"
                >
                  Close
                </button>
              </div>

              <CharacterPicker
                selectedId={active.characterId}
                onSelect={handleSelectCharacter}
              />
            </div>
          </div>
        )}

        {/* Trust strip (Desktop) */}
        <div
          className="hidden xl:flex absolute bottom-12 left-1/2 -translate-x-1/2 items-center gap-2 text-white/80 text-[11px] font-semibold uppercase tracking-widest bg-black/25 backdrop-blur-sm rounded-full px-4 py-2"
          style={{ zIndex: 55 }}
        >
          <ShieldCheck size={14} className="text-[#D97B2E]" />
          <span>{active.specs?.oemApprovals?.length ?? 0} OEM approvals on file</span>
        </div>
      </div>
    </div>
  );
}
