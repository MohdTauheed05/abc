import { useEffect, useState, useCallback, useRef } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { SEED_PRODUCTS } from '../data/products';
import { processAndUploadProductImage } from '../utils/imageCompressor';
import { clearCompositeCache } from '../utils/characterCompositor';
import type { Product } from '../types/product';

const LOCAL_STORAGE_KEY = 'abc_lubricants_products_catalog_v3';
const CATALOG_CHANGE_EVENT = 'abc_lubricants_catalog_changed';

/**
 * Strips all `undefined` values recursively so Firestore never throws
 * "Unsupported field value: undefined" errors.
 */
function sanitizeForFirestore(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      clean[key] = sanitizeForFirestore(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function getStoredLocalProducts(): Product[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse local products from storage, using seed:', err);
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_PRODUCTS));
  } catch {
    // ignore
  }
  return SEED_PRODUCTS;
}

function saveLocalProducts(products: Product[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent(CATALOG_CHANGE_EVENT, { detail: products }));
  } catch (err) {
    console.warn('LocalStorage quota or write warning:', err);
  }
}

export interface UseProductsResult {
  products: Product[];
  loading: boolean;
  source: 'firestore' | 'demo';
  firestoreEmpty: boolean;
  addProduct: (
    data: Omit<Product, 'id'> & { id?: string },
    imageFile?: File | null,
    fullCharacterFile?: File | null
  ) => Promise<Product>;
  updateProduct: (
    id: string,
    updates: Partial<Product>,
    imageFile?: File | null,
    fullCharacterFile?: File | null
  ) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  seedCatalog: () => Promise<void>;
  resetCatalog: () => Promise<void>;
}

export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>(() => getStoredLocalProducts());
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [firestoreEmpty, setFirestoreEmpty] = useState<boolean>(false);
  const productsRef = useRef<Product[]>(products);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Initial Firestore real-time listener or Local storage event listener
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      const handleLocalChange = () => {
        const stored = getStoredLocalProducts();
        setProducts(stored);
      };
      window.addEventListener(CATALOG_CHANGE_EVENT, handleLocalChange);
      window.addEventListener('storage', handleLocalChange);
      setLoading(false);
      return () => {
        window.removeEventListener(CATALOG_CHANGE_EVENT, handleLocalChange);
        window.removeEventListener('storage', handleLocalChange);
      };
    }

    const q = query(collection(db, 'products'), orderBy('category'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          const local = getStoredLocalProducts();
          setProducts(local);
          setFirestoreEmpty(true);
        } else {
          const items = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              imageUrl: data.imageUrl || data.bottleImageUrl || undefined,
              bottleImageUrl: data.bottleImageUrl || data.imageUrl || undefined,
              compositeImageUrl: data.compositeImageUrl || undefined,
            } as Product;
          });
          setProducts(items);
          saveLocalProducts(items);
          setFirestoreEmpty(false);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore snapshot listener notice:', error);
        setProducts(getStoredLocalProducts());
        setFirestoreEmpty(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addProduct = useCallback(
    async (
      data: Omit<Product, 'id'> & { id?: string },
      imageFile?: File | null,
      fullCharacterFile?: File | null
    ): Promise<Product> => {
      const generatedId =
        data.id?.trim() ||
        `${data.category}-${data.code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

      // 1. Process and upload bottle image if provided
      let finalImageUrl: string | undefined = data.imageUrl || data.bottleImageUrl || undefined;
      if (imageFile) {
        finalImageUrl = await processAndUploadProductImage(imageFile, `${generatedId}_bottle`);
      }

      // 2. Process and upload full realistic character image if provided
      let finalFullCharUrl: string | undefined = data.compositeImageUrl || undefined;
      if (fullCharacterFile) {
        finalFullCharUrl = await processAndUploadProductImage(fullCharacterFile, `${generatedId}_fullchar`);
      }

      const newProduct: Product = {
        ...data,
        id: generatedId,
        imageUrl: finalImageUrl,
        bottleImageUrl: finalImageUrl,
        compositeImageUrl: finalFullCharUrl,
        characterId: data.characterId || 'char_01',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // 3. Immediate optimistic update to state & local cache
      const current = productsRef.current.length > 0 ? productsRef.current : getStoredLocalProducts();
      const updated = [newProduct, ...current.filter((p) => p.id !== newProduct.id)];
      setProducts(updated);
      saveLocalProducts(updated);
      setFirestoreEmpty(false);

      // 4. Write directly to Firestore
      if (isFirebaseConfigured && db) {
        const docRef = doc(db, 'products', generatedId);
        const rawData = {
          category: data.category,
          code: data.code,
          name: data.name,
          apiStandard: data.apiStandard,
          description: data.description,
          characterId: data.characterId || 'char_01',
          bg: data.bg,
          panel: data.panel,
          accent: data.accent,
          imageUrl: finalImageUrl || null,
          bottleImageUrl: finalImageUrl || null,
          compositeImageUrl: finalFullCharUrl || null,
          specs: data.specs || {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const cleanData = sanitizeForFirestore(rawData);
        console.log('[Firestore] Saving document products/' + generatedId, cleanData);
        await setDoc(docRef, cleanData, { merge: true });
        console.log('[Firestore] Saved product ' + generatedId);
      }

      if (data.characterId) {
        clearCompositeCache(data.characterId);
      }
      return newProduct;
    },
    []
  );

  const updateProduct = useCallback(
    async (
      id: string,
      updates: Partial<Product>,
      imageFile?: File | null,
      fullCharacterFile?: File | null
    ): Promise<void> => {
      const currentList =
        productsRef.current.length > 0 ? productsRef.current : getStoredLocalProducts();
      const existingProduct = currentList.find((p) => p.id === id);

      if (updates.characterId) {
        clearCompositeCache(updates.characterId);
      }
      if (existingProduct?.characterId) {
        clearCompositeCache(existingProduct.characterId);
      }

      // 1. Process bottle image upload if supplied or handle explicit updates
      let finalImageUrl: string | undefined = undefined;
      if (imageFile) {
        finalImageUrl = await processAndUploadProductImage(imageFile, `${id}_bottle`);
      } else if ('imageUrl' in updates || 'bottleImageUrl' in updates) {
        finalImageUrl = updates.imageUrl || updates.bottleImageUrl || undefined;
      } else {
        finalImageUrl = existingProduct?.imageUrl || existingProduct?.bottleImageUrl || undefined;
      }

      // 2. Process realistic character image upload if supplied or handle explicit updates
      let finalFullCharUrl: string | undefined = undefined;
      if (fullCharacterFile) {
        finalFullCharUrl = await processAndUploadProductImage(fullCharacterFile, `${id}_fullchar`);
      } else if ('compositeImageUrl' in updates) {
        finalFullCharUrl = updates.compositeImageUrl ? updates.compositeImageUrl : undefined;
      } else {
        finalFullCharUrl = existingProduct?.compositeImageUrl || undefined;
      }

      const updatedProduct: Product = {
        ...(existingProduct || ({} as Product)),
        ...updates,
        id,
        imageUrl: finalImageUrl,
        bottleImageUrl: finalImageUrl,
        compositeImageUrl: finalFullCharUrl,
        characterId: updates.characterId || existingProduct?.characterId || 'char_01',
        specs: {
          viscosityIndex:
            updates.specs?.viscosityIndex ?? existingProduct?.specs?.viscosityIndex ?? 'N/A',
          pourPoint: updates.specs?.pourPoint ?? existingProduct?.specs?.pourPoint ?? 'N/A',
          flashPoint: updates.specs?.flashPoint ?? existingProduct?.specs?.flashPoint ?? 'N/A',
          oemApprovals:
            updates.specs?.oemApprovals ?? existingProduct?.specs?.oemApprovals ?? [],
        },
        updatedAt: Date.now(),
      };

      // 3. Immediate update to memory & state
      const index = currentList.findIndex((p) => p.id === id);
      let updated: Product[];
      if (index >= 0) {
        updated = [...currentList];
        updated[index] = updatedProduct;
      } else {
        updated = [updatedProduct, ...currentList];
      }

      setProducts(updated);
      saveLocalProducts(updated);
      setFirestoreEmpty(false);

      // 4. Sync directly to Cloud Firestore
      if (isFirebaseConfigured && db) {
        const docRef = doc(db, 'products', id);
        const rawUpdates: Record<string, unknown> = {
          ...updates,
          imageUrl: finalImageUrl || null,
          bottleImageUrl: finalImageUrl || null,
          compositeImageUrl: finalFullCharUrl || null,
          characterId: updates.characterId || existingProduct?.characterId || 'char_01',
          updatedAt: Date.now(),
        };

        const cleanData = sanitizeForFirestore(rawUpdates);
        console.log('[Firestore] Updating product document in Firestore products/' + id, cleanData);
        await setDoc(docRef, cleanData, { merge: true });
        console.log('[Firestore] Updated product ' + id + ' successfully in Firestore');
      }
    },
    []
  );

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    const current = productsRef.current.length > 0 ? productsRef.current : getStoredLocalProducts();
    const filtered = current.filter((p) => p.id !== id);
    setProducts(filtered);
    saveLocalProducts(filtered);
    setFirestoreEmpty(filtered.length === 0);

    if (isFirebaseConfigured && db) {
      console.log('[Firestore] Deleting product products/' + id);
      await deleteDoc(doc(db, 'products', id));
      console.log('[Firestore] Deleted product ' + id);
    }
  }, []);

  const seedCatalog = useCallback(async (): Promise<void> => {
    setProducts(SEED_PRODUCTS);
    saveLocalProducts(SEED_PRODUCTS);

    if (isFirebaseConfigured && db) {
      console.log('[Firestore] Seeding all default products into Firestore');
      const batch = writeBatch(db);
      const col = collection(db, 'products');
      for (const p of SEED_PRODUCTS) {
        const id = p.id;
        const cleanItem = sanitizeForFirestore({
          ...p,
          updatedAt: Date.now(),
        });
        batch.set(doc(col, id), cleanItem, { merge: true });
      }
      await batch.commit();
      console.log('[Firestore] Default products seeded successfully to Firestore!');
      setFirestoreEmpty(false);
    }
  }, []);

  const resetCatalog = useCallback(async (): Promise<void> => {
    setProducts(SEED_PRODUCTS);
    saveLocalProducts(SEED_PRODUCTS);
    if (isFirebaseConfigured && db) {
      await seedCatalog();
    }
  }, [seedCatalog]);

  return {
    products,
    loading,
    source: isFirebaseConfigured ? 'firestore' : 'demo',
    firestoreEmpty,
    addProduct,
    updateProduct,
    deleteProduct,
    seedCatalog,
    resetCatalog,
  };
}
