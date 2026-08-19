export type CategoryId =
  | 'motor-oil'
  | 'diesel-oil'
  | 'brake-fluid'
  | 'coolant'
  | 'heavy-grease';

export interface Category {
  id: CategoryId;
  label: string;
  short: string;
}

export interface GradeSpecs {
  viscosityIndex: string;
  pourPoint: string;
  flashPoint: string;
  oemApprovals: string[];
}

export interface Product {
  id: string;
  category: CategoryId;
  code: string;
  name: string;
  apiStandard: string;
  description: string;
  bg: string;
  panel: string;
  accent: string;

  // legacy image (existing)
  imageUrl?: string;

  // new composite/character fields (optional so older docs remain valid)
  bottleImageUrl?: string | null;      // original uploaded bottle image URL
  characterId?: string | null;        // selected character document id
  compositeImageUrl?: string | null;  // generated composite WebP public URL
  compositeMeta?: Record<string, any> | null; // optional metadata about the composite

  specs: GradeSpecs;
  createdAt?: number;
  updatedAt?: number;
}

export const CATEGORIES: Category[] = [
  { id: 'motor-oil', label: 'Motor Oil', short: 'Motor' },
  { id: 'diesel-oil', label: 'Diesel Oil', short: 'Diesel' },
  { id: 'brake-fluid', label: 'Brake Fluid', short: 'Brake' },
  { id: 'coolant', label: 'Coolant', short: 'Coolant' },
  { id: 'heavy-grease', label: 'Heavy Grease', short: 'Grease' },
];
