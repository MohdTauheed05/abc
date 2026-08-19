import type { ReactNode } from 'react';
import { X, Gauge, Thermometer, Flame, ShieldCheck } from 'lucide-react';
import type { Product } from '../types/product';

interface Props {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export default function SpecDrawer({ product, open, onClose }: Props) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black transition-opacity duration-300"
        style={{
          zIndex: 90,
          opacity: open ? 0.5 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#14110F] text-white transition-transform duration-500 flex flex-col"
        style={{
          zIndex: 100,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transitionTimingFunction: 'cubic-bezier(0.4,0,0.2,1)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Technical specifications for ${product.name}`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <p className="font-display text-lg tracking-wide uppercase">Spec Sheet</p>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Close spec sheet"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1">
          <span
            className="inline-block text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3"
            style={{ backgroundColor: product.bg, color: product.accent }}
          >
            {product.apiStandard}
          </span>
          <h2 className="font-display text-3xl uppercase leading-none mb-2">{product.code}</h2>
          <p className="text-sm text-white/60 mb-6">{product.name}</p>
          <p className="text-sm text-white/75 leading-relaxed mb-8">{product.description}</p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <SpecTile icon={<Gauge size={16} />} label="Viscosity Index" value={product.specs?.viscosityIndex || 'N/A'} />
            <SpecTile icon={<Thermometer size={16} />} label="Pour Point" value={product.specs?.pourPoint || 'N/A'} />
            <SpecTile icon={<Flame size={16} />} label="Flash Point" value={product.specs?.flashPoint || 'N/A'} />
            <SpecTile icon={<ShieldCheck size={16} />} label="OEM Approvals" value={`${product.specs?.oemApprovals?.length ?? 0} listed`} />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50 mb-3">OEM Approvals</p>
          <ul className="space-y-2">
            {(product.specs?.oemApprovals || []).map((a) => (
              <li key={a} className="text-sm text-white/85 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                <ShieldCheck size={14} className="text-white/50 shrink-0" />
                {a}
              </li>
            ))}
            {(!product.specs?.oemApprovals || product.specs.oemApprovals.length === 0) && (
              <li className="text-xs text-white/40 italic px-3 py-2">Standard OEM requirements met</li>
            )}
          </ul>
        </div>
      </aside>
    </>
  );
}

function SpecTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-white/50 mb-1.5">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
