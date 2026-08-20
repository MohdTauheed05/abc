import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, waitForPendingWrites } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { SEED_PRODUCTS } from '../data/products';
import { processAndUploadProductImage } from '../utils/imageCompressor';
import { clearCompositeCache } from '../utils/characterCompositor';
import type { Product } from '../types/product';

const LOCAL_STORAGE_KEY = 'abc_lubricants_products_catalog_v3';
const CATALOG_CHANGE_EVENT = 'abc_lubricants_catalog_changed';
const FIRESTORE_WRITE_TIMEOUT_MS = 15000;

function sanitizeForFirestore(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      clean[key] = sanitizeForFirestore(value as Record<string, unknown>);
    } else clean[key] = value;
  }
  return clean;
}

function getStoredLocalProducts(): Product[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Product[];
    }
  } catch (err) {
    console.warn('[Catalog] Failed to parse local cache:', err);
  }
  return [];
}

function saveLocalProducts(products: Product[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
    window.dispatchEvent(new CustomEvent(CATALOG_CHANGE_EVENT, { detail: products }));
  } catch (err) {
    console.warn('[Catalog] Local cache write warning:', err);
  }
}

function withFirestoreTimeout<T>(promise: Promise<T>, operation: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Firestore ${operation} timed out after 15 seconds. The write was not confirmed by Firebase. Check your Firestore database/rules and network connection.`));
    }, FIRESTORE_WRITE_TIMEOUT_MS);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function saveToFirestore(id: string, data: Record<string, unknown>) {
  if (!db) throw new Error('Firebase Firestore is not configured in this deployment.');

  // setDoc can be reflected immediately by Firestore's local cache while the
  // server write is still pending. Waiting for pending writes makes the Save
  // button succeed only after Firebase has actually acknowledged the write.
  await withFirestoreTimeout(
    setDoc(doc(db, 'products', id), data, { merge: true }),
    'write',
  );
  await withFirestoreTimeout(waitForPendingWrites(db), 'server acknowledgement');
}

export interface UseProductsResult {
  products: Product[];
  loading: boolean;
  source: 'firestore' | 'demo';
  firestoreEmpty: boolean;
  addProduct: (data: Omit<Product, 'id'> & { id?: string }, imageFile?: File | null, fullCharacterFile?: File | null) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>, imageFile?: File | null, fullCharacterFile?: File | null) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  seedCatalog: () => Promise<void>;
  resetCatalog: () => Promise<void>;
}

export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>(() => isFirebaseConfigured ? [] : getStoredLocalProducts());
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [firestoreEmpty, setFirestoreEmpty] = useState<boolean>(false);
  const productsRef = useRef<Product[]>(products);

  useEffect(() => { productsRef.current = products; }, [products]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      const handleLocalChange = () => setProducts(getStoredLocalProducts());
      window.addEventListener(CATALOG_CHANGE_EVENT, handleLocalChange);
      window.addEventListener('storage', handleLocalChange);
      setLoading(false);
      return () => {
        window.removeEventListener(CATALOG_CHANGE_EVENT, handleLocalChange);
        window.removeEventListener('storage', handleLocalChange);
      };
    }

    // Avoid orderBy('category'): one legacy document missing that field can
    // make the entire realtime query fail and make valid products disappear.
    const productsCollection = collection(db, 'products');
    const unsubscribe = onSnapshot(productsCollection, (snapshot) => {
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
      productsRef.current = items;
      saveLocalProducts(items);
      setFirestoreEmpty(snapshot.empty);
      setLoading(false);
    }, (error) => {
      console.error('[Catalog] Firestore listener failed:', error);
      // Do not turn a Firestore failure into fake persistence by replacing the
      // cloud result with localStorage. The admin save operation now reports
      // the real Firebase error instead.
      setFirestoreEmpty(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addProduct = useCallback(async (data: Omit<Product, 'id'> & { id?: string }, imageFile?: File | null, fullCharacterFile?: File | null): Promise<Product> => {
    const generatedId = data.id?.trim() || `${data.category}-${data.code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    let finalImageUrl = data.imageUrl || data.bottleImageUrl || undefined;
    if (imageFile) finalImageUrl = await processAndUploadProductImage(imageFile, `${generatedId}_bottle`);
    let finalFullCharUrl = data.compositeImageUrl || undefined;
    if (fullCharacterFile) finalFullCharUrl = await processAndUploadProductImage(fullCharacterFile, `${generatedId}_fullchar`);
    const now = Date.now();
    const newProduct: Product = {
      ...data,
      id: generatedId,
      imageUrl: finalImageUrl,
      bottleImageUrl: finalImageUrl,
      compositeImageUrl: finalFullCharUrl,
      characterId: data.characterId || 'char_01',
      createdAt: now,
      updatedAt: now,
    };

    if (isFirebaseConfigured && db) {
      await saveToFirestore(generatedId, sanitizeForFirestore({
        ...newProduct,
        imageUrl: finalImageUrl || null,
        bottleImageUrl: finalImageUrl || null,
        compositeImageUrl: finalFullCharUrl || null,
      } as unknown as Record<string, unknown>));
    } else {
      const updated = [newProduct, ...productsRef.current.filter((p) => p.id !== generatedId)];
      setProducts(updated);
      productsRef.current = updated;
      saveLocalProducts(updated);
    }

    if (data.characterId) clearCompositeCache(data.characterId);
    return newProduct;
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>, imageFile?: File | null, fullCharacterFile?: File | null): Promise<void> => {
    const currentList = productsRef.current;
    const existingProduct = currentList.find((p) => p.id === id);
    if (updates.characterId) clearCompositeCache(updates.characterId);
    if (existingProduct?.characterId) clearCompositeCache(existingProduct.characterId);

    let finalImageUrl: string | undefined;
    if (imageFile) finalImageUrl = await processAndUploadProductImage(imageFile, `${id}_bottle`);
    else if ('imageUrl' in updates || 'bottleImageUrl' in updates) finalImageUrl = updates.imageUrl || updates.bottleImageUrl || undefined;
    else finalImageUrl = existingProduct?.imageUrl || existingProduct?.bottleImageUrl || undefined;

    let finalFullCharUrl: string | undefined;
    if (fullCharacterFile) finalFullCharUrl = await processAndUploadProductImage(fullCharacterFile, `${id}_fullchar`);
    else if ('compositeImageUrl' in updates) finalFullCharUrl = updates.compositeImageUrl || undefined;
    else finalFullCharUrl = existingProduct?.compositeImageUrl || undefined;

    const updatedProduct: Product = {
      ...(existingProduct || ({} as Product)),
      ...updates,
      id,
      imageUrl: finalImageUrl,
      bottleImageUrl: finalImageUrl,
      compositeImageUrl: finalFullCharUrl,
      characterId: updates.characterId || existingProduct?.characterId || 'char_01',
      specs: {
        viscosityIndex: updates.specs?.viscosityIndex ?? existingProduct?.specs?.viscosityIndex ?? 'N/A',
        pourPoint: updates.specs?.pourPoint ?? existingProduct?.specs?.pourPoint ?? 'N/A',
        flashPoint: updates.specs?.flashPoint ?? existingProduct?.specs?.flashPoint ?? 'N/A',
        oemApprovals: updates.specs?.oemApprovals ?? existingProduct?.specs?.oemApprovals ?? [],
      },
      updatedAt: Date.now(),
    };

    if (isFirebaseConfigured && db) {
      await saveToFirestore(id, sanitizeForFirestore({
        ...updates,
        imageUrl: finalImageUrl || null,
        bottleImageUrl: finalImageUrl || null,
        compositeImageUrl: finalFullCharUrl || null,
        characterId: updatedProduct.characterId,
        updatedAt: updatedProduct.updatedAt,
      }));
    } else {
      const index = currentList.findIndex((p) => p.id === id);
      const updated = [...currentList];
      if (index >= 0) updated[index] = updatedProduct;
      else updated.unshift(updatedProduct);
      setProducts(updated);
      productsRef.current = updated;
      saveLocalProducts(updated);
    }
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await withFirestoreTimeout(deleteDoc(doc(db, 'products', id)), 'delete');
      await withFirestoreTimeout(waitForPendingWrites(db), 'server acknowledgement');
    } else {
      const filtered = productsRef.current.filter((p) => p.id !== id);
      setProducts(filtered);
      productsRef.current = filtered;
      saveLocalProducts(filtered);
    }
  }, []);

  const seedCatalog = useCallback(async (): Promise<void> => {
    if (isFirebaseConfigured && db) {
      const batch = writeBatch(db);
      const col = collection(db, 'products');
      for (const p of SEED_PRODUCTS) {
        batch.set(doc(col, p.id), sanitizeForFirestore({ ...p, updatedAt: Date.now() }), { merge: true });
      }
      await withFirestoreTimeout(batch.commit(), 'batch write');
      await withFirestoreTimeout(waitForPendingWrites(db), 'server acknowledgement');
    } else {
      setProducts(SEED_PRODUCTS);
      productsRef.current = SEED_PRODUCTS;
      saveLocalProducts(SEED_PRODUCTS);
    }
  }, []);

  const resetCatalog = useCallback(async (): Promise<void> => { await seedCatalog(); }, [seedCatalog]);

  return { products, loading, source: isFirebaseConfigured ? 'firestore' : 'demo', firestoreEmpty, addProduct, updateProduct, deleteProduct, seedCatalog, resetCatalog };
}
