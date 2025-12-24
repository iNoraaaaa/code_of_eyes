
export enum AppMode {
  NATURAL = 'NATURAL',
  ARCHITECTURAL = 'ARCHITECTURAL'
}

export interface Point {
  x: number;
  y: number;
}

export interface FittingResult {
  formula: string;
  points: Point[];
  coefficients: number[];
  type: 'polynomial' | 'sine';
}

export interface AppState {
  rationalIntensity: number; // 1-10 (Polynomial degree)
  fieldOpacity: number; // 0-1
  mode: AppMode;
  isScanning: boolean;
  imageLoaded: boolean;
  edgeDensity: number; // threshold for edge detection
}
