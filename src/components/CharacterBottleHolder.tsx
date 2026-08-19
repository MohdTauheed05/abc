import { useEffect, useMemo, useState } from 'react';
import type { Product } from '../types/product';
import { getCharacterById, type HDCharacterAsset } from '../data/characters';
import { getCompositeCharacterImage } from '../utils/characterCompositor';

interface Props {
  product: Product;
  characterOverride?: HDCharacterAsset;
  showPedestal?: boolean;
  className?: string;
  onSelectCharacter?: (charId: string) => void;
}

export default function CharacterBottleHolder({
  product,
  characterOverride,
  showPedestal = true,
  className = '',
}: Props) {
  const character = useMemo(() => {
    if (characterOverride) return characterOverride;
    return getCharacterById(product.characterId);
  }, [characterOverride, product.characterId]);

  // If an admin uploaded a full realistic composite (character + bottle
  // already merged into one photo), that always takes priority — this is
  // existing abc-main functionality and is left untouched.
  const fullCompositeSrc = product.compositeImageUrl;
  const bottleSrc = product.bottleImageUrl || product.imageUrl;

  const gradeText = product.code || '';
  const viscosityText = product.code ? `SAE ${product.code}` : '';

  const [renderedSrc, setRenderedSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fullCompositeSrc) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getCompositeCharacterImage({
      character,
      bottleImageSrc: bottleSrc || null,
      gradeText,
      viscosityText,
      showPlaque: showPedestal,
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setRenderedSrc(dataUrl);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Character composite render failed, falling back to raw stand photo:', err);
        if (!cancelled) {
          setRenderedSrc(character.imageSrc);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [character, bottleSrc, gradeText, viscosityText, showPedestal, fullCompositeSrc]);

  if (fullCompositeSrc) {
    return (
      <div
        className={`relative w-full h-full flex flex-col items-center justify-end select-none pointer-events-none ${className}`}
        style={{ filter: `drop-shadow(0 20px 35px rgba(0,0,0,0.6))` }}
      >
        <img
          src={fullCompositeSrc}
          alt={product.name}
          className="w-full h-full max-h-[820px] object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-end select-none pointer-events-none ${className}`}
      style={{ filter: `drop-shadow(0 20px 35px rgba(0,0,0,0.6))` }}
    >
      {loading && !renderedSrc ? (
        // While the flood-fill background removal + compositing runs (first
        // time only — cached after), show the raw stand photo so there's no
        // blank flash.
        <img
          src={character.imageSrc}
          alt={product.name}
          className="w-full h-full max-h-[820px] object-contain opacity-70 animate-pulse"
        />
      ) : (
        <img
          src={renderedSrc || character.imageSrc}
          alt={product.name}
          className="w-full h-full max-h-[820px] object-contain"
        />
      )}
    </div>
  );
}
