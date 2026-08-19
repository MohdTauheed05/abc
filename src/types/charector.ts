export interface RemovalSettings {
  mode: 'flood' | 'global' | 'chroma';
  threshold: number;
  feather: number;
  edgeInset: number;
  pedestalCutoff: number;
  pedestalCompression: number;
  deSpillBlack: boolean;
  blackLevel: number;
  glowColor?: string;
  glowIntensity?: number;
  dropShadow?: boolean;
}

export type BackgroundPreviewMode =
  | 'checker-dark'
  | 'checker-light'
  | 'black'
  | 'white'
  | 'cyber-grid';

export type ExportScale = 1 | 2 | 4;

export interface BottleOverlayConfig {
  image: HTMLImageElement | HTMLCanvasElement;
  scale: number;
  widthScale: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  shadow: boolean;
  handsInFront: boolean;
}
