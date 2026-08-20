import { useCallback, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, deleteDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import {
  BUILTIN_CHARACTERS,
  setLiveCharacters,
  type HDCharacterAsset,
} from '../data/characters';
import { processAndUploadProductImage } from '../utils/imageCompressor';

const LOCAL_STORAGE_KEY = 'abc_lubricants_characters_v1';

interface LocalCharacterState {
  custom: HDCharacterAsset[];
  hiddenBuiltinIds: string[];
}

function getLocalState(): LocalCharacterState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.custom) && Array.isArray(parsed.hiddenBuiltinIds)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return { custom: [], hiddenBuiltinIds: [] };
}

function saveLocalState(state: LocalCharacterState) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function mergeCharacters(custom: HDCharacterAsset[], hiddenBuiltinIds: string[]): HDCharacterAsset[] {
  const visibleBuiltins = BUILTIN_CHARACTERS.filter((c) => !hiddenBuiltinIds.includes(c.id));
  return [...visibleBuiltins, ...custom];
}

/** Reasonable, averaged pedestal/hand calibration so a freshly-uploaded
 * character composites onto the bottle-holding pedestal sensibly without the
 * admin needing to hand-tune coordinates. */
const DEFAULT_CALIBRATION = {
  pedestalSurfaceRatio: 0.665,
  handLevelRatio: 0.5,
  handLeftRatio: 0.285,
  handRightRatio: 0.715,
};

export interface NewCharacterInput {
  name: string;
  codename: string;
  category: string;
  themeColor: string;
}

export interface UseCharactersResult {
  characters: HDCharacterAsset[];
  loading: boolean;
  source: 'firestore' | 'local';
  addCharacter: (data: NewCharacterInput, imageFile: File) => Promise<HDCharacterAsset>;
  deleteCharacter: (id: string) => Promise<void>;
}

export function useCharacters(): UseCharactersResult {
  const [custom, setCustom] = useState<HDCharacterAsset[]>(() => getLocalState().custom);
  const [hiddenBuiltinIds, setHiddenBuiltinIds] = useState<string[]>(() => getLocalState().hiddenBuiltinIds);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);

  // Keep the global live-character store (used by getCharacterById everywhere
  // else in the app) in sync whenever our local merged view changes.
  useEffect(() => {
    setLiveCharacters(mergeCharacters(custom, hiddenBuiltinIds));
  }, [custom, hiddenBuiltinIds]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }

    const unsubCustom = onSnapshot(
      collection(db, 'characters'),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as HDCharacterAsset);
        setCustom(items);
        saveLocalState({ custom: items, hiddenBuiltinIds });
        setLoading(false);
      },
      (err) => {
        console.warn('Characters snapshot notice:', err);
        setLoading(false);
      }
    );

    const unsubConfig = onSnapshot(
      doc(db, 'meta', 'characterConfig'),
      (snap) => {
        const ids: string[] = (snap.exists() && (snap.data().hiddenBuiltinIds as string[])) || [];
        setHiddenBuiltinIds(ids);
      },
      (err) => console.warn('Character config snapshot notice:', err)
    );

    return () => {
      unsubCustom();
      unsubConfig();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCharacter = useCallback(async (data: NewCharacterInput, imageFile: File): Promise<HDCharacterAsset> => {
    const id = `char_custom_${Date.now().toString(36)}`;
    const imageSrc = await processAndUploadProductImage(imageFile, id, true, 'characters');

    const newCharacter: HDCharacterAsset = {
      id,
      number: `#${id.slice(-4).toUpperCase()}`,
      name: data.name,
      codename: data.codename || data.name.toUpperCase(),
      category: data.category || 'Custom',
      defaultGrade: '',
      defaultViscosity: '',
      themeColor: data.themeColor,
      glowColor: data.themeColor,
      imageSrc,
      metalTrimColor: data.themeColor,
      ...DEFAULT_CALIBRATION,
    };

    const updated = [...custom, newCharacter];
    setCustom(updated);
    saveLocalState({ custom: updated, hiddenBuiltinIds });

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'characters', id), { ...newCharacter, createdAt: Date.now() });
    }

    return newCharacter;
  }, [custom, hiddenBuiltinIds]);

  const deleteCharacter = useCallback(async (id: string): Promise<void> => {
    const isBuiltin = BUILTIN_CHARACTERS.some((c) => c.id === id);

    if (isBuiltin) {
      const updatedHidden = [...new Set([...hiddenBuiltinIds, id])];
      setHiddenBuiltinIds(updatedHidden);
      saveLocalState({ custom, hiddenBuiltinIds: updatedHidden });
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'meta', 'characterConfig'), { hiddenBuiltinIds: updatedHidden }, { merge: true });
      }
    } else {
      const updated = custom.filter((c) => c.id !== id);
      setCustom(updated);
      saveLocalState({ custom: updated, hiddenBuiltinIds });
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'characters', id));
      }
    }
  }, [custom, hiddenBuiltinIds]);

  return {
    characters: mergeCharacters(custom, hiddenBuiltinIds),
    loading,
    source: isFirebaseConfigured ? 'firestore' : 'local',
    addCharacter,
    deleteCharacter,
  };
}
