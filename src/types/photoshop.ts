export type ToolType =
  // Move & Navigation
  | 'move'
  | 'artboard'
  // Marquee
  | 'marquee-rect'
  | 'marquee-ellipse'
  | 'marquee-single-row'
  | 'marquee-single-col'
  // Lasso
  | 'lasso'
  | 'lasso-polygon'
  | 'lasso-magnetic'
  // Selection
  | 'object-select'
  | 'quick-select'
  | 'magic-wand'
  // Crop & Slice
  | 'crop'
  | 'perspective-crop'
  | 'slice'
  | 'slice-select'
  | 'frame'
  // Eyedropper & Measure
  | 'eyedropper'
  | 'color-sampler'
  | 'ruler-tool'
  | 'note-tool'
  | 'count-tool'
  // Healing & AI Retouch
  | 'remove-tool'
  | 'spot-healing'
  | 'healing-brush'
  | 'patch'
  | 'content-aware-move'
  | 'red-eye'
  // Brush & Painting
  | 'brush'
  | 'pencil'
  | 'color-replacement'
  | 'mixer-brush'
  // Clone Stamp
  | 'clone-stamp'
  | 'pattern-stamp'
  // History Brush
  | 'history-brush'
  | 'art-history-brush'
  // Eraser
  | 'eraser'
  | 'background-eraser'
  | 'magic-eraser'
  // Gradient & Bucket
  | 'gradient'
  | 'paint-bucket'
  // Blur, Sharpen, Smudge
  | 'blur-tool'
  | 'sharpen-tool'
  | 'smudge-tool'
  // Dodge, Burn, Sponge
  | 'dodge'
  | 'burn'
  | 'sponge'
  // Pen
  | 'pen'
  | 'freeform-pen'
  | 'curvature-pen'
  // Type
  | 'text'
  | 'text-vertical'
  // Path Selection
  | 'path-select'
  | 'direct-select'
  // Shape
  | 'shape-rect'
  | 'shape-rounded-rect'
  | 'shape-ellipse'
  | 'shape-polygon'
  | 'shape-line'
  | 'shape-star'
  | 'custom-shape'
  // Hand & Zoom
  | 'hand'
  | 'rotate-view'
  | 'zoom';

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface LayerAdjustments {
  brightness: number;   // -100 to 100 (0 default)
  contrast: number;     // -100 to 100 (0 default)
  saturation: number;   // -100 to 100 (0 default)
  hue: number;          // -180 to 180 (0 default)
  exposure: number;     // -100 to 100 (0 default)
  vibrance: number;     // -100 to 100 (0 default)
  warmth: number;       // -100 to 100 (0 default)
  invert: number;       // 0 to 100 (0 default)
  sepia: number;        // 0 to 100 (0 default)
  grayscale: number;    // 0 to 100 (0 default)
  blur: number;         // 0 to 50 px (0 default)
}

export interface Layer {
  id: string;
  name: string;
  type: 'raster' | 'text' | 'shape';
  visible: boolean;
  locked: boolean;
  opacity: number;        // 0 to 100
  blendMode: BlendMode;
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  adjustments: LayerAdjustments;
  // Metadata for text/shape re-editing
  textData?: {
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: string;
    align: 'left' | 'center' | 'right';
  };
  shapeData?: {
    shapeType: 'rect' | 'ellipse' | 'star';
    fill: string;
    stroke: string;
    strokeWidth: number;
    radius?: number;
  };
}

export interface SelectionState {
  active: boolean;
  type: 'rect' | 'ellipse' | 'lasso';
  x: number;
  y: number;
  width: number;
  height: number;
  points?: { x: number; y: number }[];
}

export interface ToolSettings {
  brushSize: number;
  brushHardness: number;
  brushOpacity: number;
  brushFlow: number;
  foregroundColor: string;
  backgroundColor: string;
  tolerance: number;
  feather: number;
  shapeFill: string;
  shapeStroke: string;
  shapeStrokeWidth: number;
  shapeRadius: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  textColor: string;
  textAlign: 'left' | 'center' | 'right';
  cropAspect: 'free' | '1:1' | '16:9' | '4:3' | '9:16';
  gradientType?: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond';
  polygonSides?: number;
  customShapeType?: 'star' | 'heart' | 'arrow' | 'banner' | 'bubble';
}

export interface GenerativeVariation {
  id: number;
  title: string;
  colors: string[];
  lighting: string;
  texture: string;
  gradientAngle: number;
  glowIntensity: number;
  description: string;
  canvasDataUrl?: string;
}

export interface HistoryItem {
  id: string;
  name: string;
  timestamp: number;
  thumbnail?: string;
  layers: {
    id: string;
    name: string;
    type: 'raster' | 'text' | 'shape';
    visible: boolean;
    locked: boolean;
    opacity: number;
    blendMode: BlendMode;
    x: number;
    y: number;
    width: number;
    height: number;
    adjustments: LayerAdjustments;
    textData?: Layer['textData'];
    shapeData?: Layer['shapeData'];
    dataUrl: string;
  }[];
  activeLayerId: string;
  canvasWidth: number;
  canvasHeight: number;
}

export interface ProjectDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string;
}
