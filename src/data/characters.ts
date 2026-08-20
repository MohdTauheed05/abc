// Character Studio Data - HD photoreal characters (ported from
// hd-character-separator-&-background-remover). This is the single
// source of truth for character assets used across the storefront,
// admin panel, and the /character-studio gallery.

import char01 from '../assets/characters/char_01_gold_horn.jpg';
import char02 from '../assets/characters/char_02_shadow_bat.jpg';
import char03 from '../assets/characters/char_03_spartan_crest.jpg';
import char04 from '../assets/characters/char_04_void_hood.jpg';
import char05 from '../assets/characters/char_05_samurai_kabuto.jpg';
import char06 from '../assets/characters/char_06_titanium_arc.jpg';
import char07 from '../assets/characters/char_07_solar_orange.jpg';
import char08 from '../assets/characters/char_08_horned_demon.jpg';
import char09 from '../assets/characters/char_09_desert_commando.jpg';
import char10 from '../assets/characters/char_10_venom_green.jpg';
import char11 from '../assets/characters/char_11_valkyrie_nordic.jpg';
import char12 from '../assets/characters/char_12_crimson_juggernaut.jpg';

export interface HDCharacterAsset {
  id: string;
  number: string;
  name: string;
  codename: string;
  category: string;
  defaultGrade: string;
  defaultViscosity: string;
  themeColor: string;
  glowColor: string;
  imageSrc: string;
  /** Actual Y ratio (0-1) where the metallic pedestal top surface is located in this character's photo */
  pedestalSurfaceRatio: number;
  /** Normalized vertical hand grip center line ratio (0-1) */
  handLevelRatio?: number;
  /** Left hand inner grip X ratio (0-1) */
  handLeftRatio?: number;
  /** Right hand inner grip X ratio (0-1) */
  handRightRatio?: number;
  /** Accent metal color for mechanical gripping fingers */
  metalTrimColor?: string;
}

export const HD_CHARACTERS_LIST: HDCharacterAsset[] = [
  {
    id: 'char_01',
    number: '#001',
    name: 'Aegis Vanguard',
    codename: 'GOLDEN HORN GUARDIAN',
    category: 'Heavy Diesel / XHPD',
    defaultGrade: '10W-40 DIESEL XHPD',
    defaultViscosity: 'SAE 10W-40',
    themeColor: '#f59e0b',
    glowColor: '#38bdf8',
    imageSrc: char01,
    pedestalSurfaceRatio: 0.585,
    handLevelRatio: 0.465,
    handLeftRatio: 0.29,
    handRightRatio: 0.71,
    metalTrimColor: '#eab308',
  },
  {
    id: 'char_02',
    number: '#002',
    name: 'Obsidian Phantom',
    codename: 'SHADOW BAT ASSASSIN',
    category: 'Full Synthetic Racing',
    defaultGrade: '5W-30 SYNTHETIC RACING',
    defaultViscosity: 'SAE 5W-30',
    themeColor: '#ef4444',
    glowColor: '#f87171',
    imageSrc: char02,
    pedestalSurfaceRatio: 0.585,
    handLevelRatio: 0.465,
    handLeftRatio: 0.29,
    handRightRatio: 0.71,
    metalTrimColor: '#ef4444',
  },
  {
    id: 'char_03',
    number: '#003',
    name: 'Crimson Centurion',
    codename: 'ARES SPARTAN GLADIATOR',
    category: 'High-Temp / Endurance',
    defaultGrade: '15W-50 SUPER TOURING',
    defaultViscosity: 'SAE 15W-50',
    themeColor: '#dc2626',
    glowColor: '#fb923c',
    imageSrc: char03,
    pedestalSurfaceRatio: 0.655,
    handLevelRatio: 0.495,
    handLeftRatio: 0.285,
    handRightRatio: 0.715,
    metalTrimColor: '#dc2626',
  },
  {
    id: 'char_04',
    number: '#004',
    name: 'Void Reaver',
    codename: 'ASTRAL HOODED REAPER',
    category: 'Ultra-Low Viscosity Eco',
    defaultGrade: '0W-20 HYBRID ULTRA',
    defaultViscosity: 'SAE 0W-20',
    themeColor: '#a855f7',
    glowColor: '#c084fc',
    imageSrc: char04,
    pedestalSurfaceRatio: 0.645,
    handLevelRatio: 0.490,
    handLeftRatio: 0.29,
    handRightRatio: 0.71,
    metalTrimColor: '#9333ea',
  },
  {
    id: 'char_05',
    number: '#005',
    name: 'Ronin Kabuto',
    codename: 'SHADOW CYBER SAMURAI',
    category: 'Premium Multi-Grade',
    defaultGrade: '5W-40 MULTI-SYNTH',
    defaultViscosity: 'SAE 5W-40',
    themeColor: '#eab308',
    glowColor: '#f59e0b',
    imageSrc: char05,
    pedestalSurfaceRatio: 0.675,
    handLevelRatio: 0.510,
    handLeftRatio: 0.28,
    handRightRatio: 0.72,
    metalTrimColor: '#ca8a04',
  },
  {
    id: 'char_06',
    number: '#006',
    name: 'Cryo Enforcer',
    codename: 'TITANIUM ARC SOLDIER',
    category: 'Cold-Climate Extreme',
    defaultGrade: '0W-30 CRYO PROTECTION',
    defaultViscosity: 'SAE 0W-30',
    themeColor: '#38bdf8',
    glowColor: '#67e8f9',
    imageSrc: char06,
    pedestalSurfaceRatio: 0.665,
    handLevelRatio: 0.505,
    handLeftRatio: 0.285,
    handRightRatio: 0.715,
    metalTrimColor: '#38bdf8',
  },
  {
    id: 'char_07',
    number: '#007',
    name: 'Solar Apex',
    codename: 'AMBER OVERDRIVE PILOT',
    category: 'Turbo-Charged Sport',
    defaultGrade: '5W-50 TURBO BOOST',
    defaultViscosity: 'SAE 5W-50',
    themeColor: '#f97316',
    glowColor: '#fbbf24',
    imageSrc: char07,
    pedestalSurfaceRatio: 0.690,
    handLevelRatio: 0.520,
    handLeftRatio: 0.285,
    handRightRatio: 0.715,
    metalTrimColor: '#f97316',
  },
  {
    id: 'char_08',
    number: '#008',
    name: 'Infernal Demon',
    codename: 'NETHER MECH OVERLORD',
    category: 'Extreme Heavy Industrial',
    defaultGrade: '20W-50 SEVERE DUTY',
    defaultViscosity: 'SAE 20W-50',
    themeColor: '#06b6d4',
    glowColor: '#22d3ee',
    imageSrc: char08,
    pedestalSurfaceRatio: 0.670,
    handLevelRatio: 0.505,
    handLeftRatio: 0.285,
    handRightRatio: 0.715,
    metalTrimColor: '#0891b2',
  },
  {
    id: 'char_09',
    number: '#009',
    name: 'Desert Commando',
    codename: 'SANDSTORM SPEC-OPS',
    category: 'Commercial Fleet / 4x4',
    defaultGrade: '15W-40 FLEET MASTER',
    defaultViscosity: 'SAE 15W-40',
    themeColor: '#14b8a6',
    glowColor: '#2dd4bf',
    imageSrc: char09,
    pedestalSurfaceRatio: 0.675,
    handLevelRatio: 0.508,
    handLeftRatio: 0.285,
    handRightRatio: 0.715,
    metalTrimColor: '#0d9488',
  },
  {
    id: 'char_10',
    number: '#010',
    name: 'Venom Striker',
    codename: 'ACID CYBERBLADE',
    category: 'High-RPM Supercharged',
    defaultGrade: '10W-60 COMPETITION',
    defaultViscosity: 'SAE 10W-60',
    themeColor: '#84cc16',
    glowColor: '#4ade80',
    imageSrc: char10,
    pedestalSurfaceRatio: 0.665,
    handLevelRatio: 0.502,
    handLeftRatio: 0.285,
    handRightRatio: 0.715,
    metalTrimColor: '#65a30d',
  },
  {
    id: 'char_11',
    number: '#011',
    name: 'Frost Valkyrie',
    codename: 'NORDIC WINGED PALADIN',
    category: 'Clean Energy & Hybrid',
    defaultGrade: '0W-16 ECO DYNAMICS',
    defaultViscosity: 'SAE 0W-16',
    themeColor: '#e0e7ff',
    glowColor: '#818cf8',
    imageSrc: char11,
    pedestalSurfaceRatio: 0.675,
    handLevelRatio: 0.505,
    handLeftRatio: 0.285,
    handRightRatio: 0.715,
    metalTrimColor: '#a5b4fc',
  },
  {
    id: 'char_12',
    number: '#012',
    name: 'Crimson Juggernaut',
    codename: 'FORTIFIED SIEGE MECH',
    category: 'Mega-Torque Commercial',
    defaultGrade: '20W-60 HEAVY HAUL',
    defaultViscosity: 'SAE 20W-60',
    themeColor: '#b91c1c',
    glowColor: '#f87171',
    imageSrc: char12,
    pedestalSurfaceRatio: 0.640,
    handLevelRatio: 0.490,
    handLeftRatio: 0.285,
    handRightRatio: 0.715,
    metalTrimColor: '#b91c1c',
  },
];

export const DEFAULT_CHARACTER_ID = 'char_01';

/** The original 12 bundled characters — always available as a fallback set. */
export const BUILTIN_CHARACTERS = HD_CHARACTERS_LIST;

/**
 * Live, merged character roster. Starts out equal to the bundled 12 built-in
 * characters, but is kept in sync by `useCharacters()` (see
 * ../hooks/useCharacters.ts) with any custom characters an admin uploads, and
 * with any built-in characters an admin has removed. Components that just
 * need to look a character up by id (rendering, compositing) can keep using
 * the plain `getCharacterById` helper below — it always reads the latest
 * merged list. Components that need to re-render when the roster itself
 * changes (pickers, galleries, the admin manager) should use the
 * `useCharacters()` hook instead.
 */
let liveCharacters: HDCharacterAsset[] = HD_CHARACTERS_LIST;
const listeners = new Set<() => void>();

export function getAllCharacters(): HDCharacterAsset[] {
  return liveCharacters;
}

/** Internal — called by useCharacters() when Firestore/local data changes. */
export function setLiveCharacters(next: HDCharacterAsset[]) {
  liveCharacters = next;
  listeners.forEach((fn) => fn());
}

export function subscribeCharacters(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCharacterById(id: string | null | undefined): HDCharacterAsset {
  if (!id) return liveCharacters[0] || HD_CHARACTERS_LIST[0];
  return (
    liveCharacters.find((char) => char.id === id) ||
    HD_CHARACTERS_LIST.find((char) => char.id === id) ||
    liveCharacters[0] ||
    HD_CHARACTERS_LIST[0]
  );
}

export function getCharactersByCategory(category: string): HDCharacterAsset[] {
  if (category === 'all') return liveCharacters;
  return liveCharacters.filter((char) => char.category.toLowerCase().includes(category.toLowerCase()));
}
