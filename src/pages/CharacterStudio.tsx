import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Grid,
  Square,
  Moon,
  Sun,
  Sparkles,
  Copy,
  Check,
  Maximize2,
  Package,
  ArrowLeft,
} from 'lucide-react';
import { HD_CHARACTERS_LIST, type HDCharacterAsset } from '../data/characters';
import { type BackgroundPreviewMode } from '../types/charector';
import { useProducts } from '../hooks/useProducts';

export default function CharacterStudio(): JSX.Element {
  useProducts();
  const [characters] = useState<HDCharacterAsset[]>(HD_CHARACTERS_LIST);
  const [previewMode, setPreviewMode] = useState<BackgroundPreviewMode>('checker-dark');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedCharacter, setSelectedCharacter] = useState<HDCharacterAsset | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredList = characters.filter((c) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'diesel')
      return (
        c.category.toLowerCase().includes('diesel') ||
        c.category.toLowerCase().includes('fleet') ||
        c.category.toLowerCase().includes('heavy')
      );
    if (activeCategory === 'racing')
      return (
        c.category.toLowerCase().includes('racing') ||
        c.category.toLowerCase().includes('sport') ||
        c.category.toLowerCase().includes('turbo')
      );
    if (activeCategory === 'eco')
      return (
        c.category.toLowerCase().includes('eco') ||
        c.category.toLowerCase().includes('hybrid') ||
        c.category.toLowerCase().includes('ultra-low')
      );
    return true;
  });

  const getPreviewBgStyle = () => {
    switch (previewMode) {
      case 'checker-dark':
        return {
          backgroundColor: '#070707',
          backgroundImage:
            'linear-gradient(45deg, #141414 25%, transparent 25%), linear-gradient(-45deg, #141414 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #141414 75%), linear-gradient(-45deg, transparent 75%, #141414 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        };
      case 'checker-light':
        return {
          backgroundColor: '#ffffff',
          backgroundImage:
            'linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        };
      case 'black':
        return { backgroundColor: '#000000' };
      case 'white':
        return { backgroundColor: '#ffffff' };
      case 'cyber-grid':
        return {
          backgroundColor: '#050505',
          backgroundImage:
            'linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        };
      default:
        return {};
    }
  };

  const handleCopy = async (char: HDCharacterAsset) => {
    setCopiedId(char.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] flex flex-col font-sans selection:bg-cyan-400 selection:text-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0A0A0A] sticky top-0 z-40 px-4 sm:px-8 py-4 flex items-center shrink-0">
        <div className="w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              to="/"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
              title="Return to Main Storefront"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="w-10 h-10 bg-cyan-400 flex items-center justify-center rounded-sm shrink-0 shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <Package className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Character Bottle Studio
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono px-2 py-0.5 border border-cyan-400/40 text-cyan-300 bg-cyan-950/50 font-bold">
                  4K PRO
                </span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-mono mt-0.5">
                Choose Your Titan Guardian • HD Character Assets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="px-3.5 py-2 text-xs font-mono uppercase tracking-wider border border-white/20 hover:border-white text-white/80 hover:text-white rounded bg-white/5 hover:bg-white/10 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-[#050505] w-full mx-auto px-4 sm:px-8 py-8 space-y-7">
        {/* Section Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Cyber Warrior Guardians
              <span className="text-xs sm:text-sm font-mono text-cyan-400">
                [{String(filteredList.length).padStart(2, '0')} Models]
              </span>
            </h2>
            <p className="text-[11px] text-gray-400 font-mono mt-1">
              Select any character to assign it to your lubricant product
            </p>
          </div>

          {/* Background Mode & Category Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Background Preview Buttons */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1">
              <button
                onClick={() => setPreviewMode('checker-dark')}
                className={`p-1.5 ${previewMode === 'checker-dark' ? 'bg-white text-black font-bold' : 'text-gray-500 hover:text-white'}`}
                title="Dark Checker"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewMode('checker-light')}
                className={`p-1.5 ${previewMode === 'checker-light' ? 'bg-white text-black font-bold' : 'text-gray-500 hover:text-white'}`}
                title="Light Checker"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewMode('black')}
                className={`p-1.5 ${previewMode === 'black' ? 'bg-white text-black font-bold' : 'text-gray-500 hover:text-white'}`}
                title="Black"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewMode('white')}
                className={`p-1.5 ${previewMode === 'white' ? 'bg-white text-black font-bold' : 'text-gray-500 hover:text-white'}`}
                title="White"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPreviewMode('cyber-grid')}
                className={`p-1.5 ${previewMode === 'cyber-grid' ? 'bg-white text-black font-bold' : 'text-gray-500 hover:text-white'}`}
                title="Cyber Grid"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap border border-white/15 bg-white/5 p-0.5 text-xs font-mono">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider ${activeCategory === 'all' ? 'bg-cyan-400 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                All ({characters.length})
              </button>
              <button
                onClick={() => setActiveCategory('diesel')}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider ${activeCategory === 'diesel' ? 'bg-cyan-400 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                Diesel
              </button>
              <button
                onClick={() => setActiveCategory('racing')}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider ${activeCategory === 'racing' ? 'bg-cyan-400 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                Racing
              </button>
              <button
                onClick={() => setActiveCategory('eco')}
                className={`px-3 py-1 text-[10px] uppercase tracking-wider ${activeCategory === 'eco' ? 'bg-cyan-400 text-black font-bold' : 'text-gray-400 hover:text-white'}`}
              >
                Eco
              </button>
            </div>
          </div>
        </div>

        {/* Character Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredList.map((char) => (
            <div
              key={char.id}
              className="group relative bg-white/[0.03] border border-white/10 hover:border-cyan-400/50 transition-all duration-300 flex flex-col overflow-hidden shadow-2xl rounded-lg"
            >
              {/* Header */}
              <div className="px-4 py-2.5 bg-[#0A0A0A] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rotate-45"></div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-gray-300">
                    {char.codename}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase">{char.number}</span>
              </div>

              {/* Image Display */}
              <div
                className="relative flex-1 min-h-[300px] flex items-center justify-center p-4 cursor-pointer overflow-hidden transition-all select-none"
                style={getPreviewBgStyle()}
                onClick={() => setSelectedCharacter(char)}
              >
                <img
                  src={char.imageSrc}
                  alt={char.name}
                  className="max-h-[280px] w-auto object-contain transition-transform duration-500 group-hover:scale-105 filter drop-shadow-2xl"
                  referrerPolicy="no-referrer"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-cyan-400 text-black text-[10px] uppercase tracking-widest font-bold hover:bg-white transition-all">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-[#0A0A0A] border-t border-white/10 flex flex-col gap-2">
                <div>
                  <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">Guardian</p>
                  <p className="font-bold text-white text-sm">{char.name}</p>
                  <p className="text-[10px] text-cyan-300 font-mono mt-1">{char.defaultGrade}</p>
                </div>
                <div className="flex gap-1.5 pt-2">
                  <button
                    onClick={() => setSelectedCharacter(char)}
                    className="flex-1 py-1.5 px-2.5 bg-white/10 hover:bg-white/20 text-white text-[9px] uppercase font-bold rounded transition-all"
                  >
                    Info
                  </button>
                  <button
                    onClick={() => handleCopy(char)}
                    className="p-1.5 border border-white/10 bg-white/5 hover:border-cyan-400 text-gray-400 hover:text-white transition-all rounded"
                    title="Copy Character ID"
                  >
                    {copiedId === char.id ? (
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Character Detail Modal */}
      {selectedCharacter && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedCharacter(null)}
        >
          <div
            className="bg-[#0A0A0A] border border-cyan-400/40 w-full max-w-2xl max-h-[95vh] flex flex-col shadow-[0_0_60px_rgba(0,240,255,0.2)] rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0A0A0A] border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedCharacter.name}</h2>
                <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider mt-0.5">
                  {selectedCharacter.codename} • {selectedCharacter.number}
                </p>
              </div>
              <button
                onClick={() => setSelectedCharacter(null)}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Image */}
              <div
                className="flex-1 min-h-[300px] flex items-center justify-center p-6 overflow-auto border-b lg:border-b-0 lg:border-r border-white/10"
                style={getPreviewBgStyle()}
              >
                <img
                  src={selectedCharacter.imageSrc}
                  alt={selectedCharacter.name}
                  className="max-h-[500px] w-auto object-contain filter drop-shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Details */}
              <div className="w-full lg:w-80 bg-[#0e0e12] p-6 flex flex-col gap-5 overflow-y-auto">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-300 font-bold">Guardian Name</p>
                  <p className="text-lg font-bold text-white">{selectedCharacter.name}</p>
                </div>

                <div className="space-y-1.5 border-t border-white/10 pt-3">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-300 font-bold">Category</p>
                  <p className="text-white text-sm">{selectedCharacter.category}</p>
                </div>

                <div className="space-y-1.5 border-t border-white/10 pt-3">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-300 font-bold">Default Grade</p>
                  <p className="text-white text-sm font-mono">{selectedCharacter.defaultGrade}</p>
                  <p className="text-gray-400 text-xs">{selectedCharacter.defaultViscosity}</p>
                </div>

                <div className="space-y-1.5 border-t border-white/10 pt-3">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-300 font-bold">Theme Color</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded border border-white/20"
                      style={{ backgroundColor: selectedCharacter.themeColor }}
                    ></div>
                    <code className="text-sm font-mono text-gray-400">{selectedCharacter.themeColor}</code>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCharacter(null)}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black text-xs uppercase font-bold tracking-widest rounded shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all mt-auto"
                >
                  <Copy size={14} />
                  <span>Close Details</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
