import React, { useState } from 'react';
import { 
  Layer, 
  BlendMode, 
  LayerAdjustments, 
  HistoryItem, 
  SelectionState,
  GenerativeVariation
} from '../types/photoshop';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  Plus, 
  Copy, 
  ArrowDown, 
  Sparkles, 
  Layers as LayersIcon, 
  Sliders, 
  Palette, 
  Clock, 
  Maximize2, 
  RotateCcw,
  Wand2,
  ChevronDown,
  Grid,
  UserCheck,
  Scissors
} from 'lucide-react';
import { generateThumbnail } from '../utils/canvasUtils';
import { SwatchesPanel } from './SwatchesPanel';

interface RightPanelDockProps {
  layers: Layer[];
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onNewLayer: () => void;
  onDuplicateLayer: () => void;
  onDeleteLayer: () => void;
  onMergeDown: () => void;
  onMoveLayerUp: (id: string) => void;
  onMoveLayerDown: (id: string) => void;
  history: HistoryItem[];
  historyIndex: number;
  onGoToHistory: (index: number) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selection: SelectionState;
  onApplyGenerativeFill: (prompt: string) => void;
  onApplyNeuralStyle: (style: 'colorize' | 'depth-blur' | 'golden-hour' | 'cyber-glow' | 'noir' | 'portrait-pop' | 'vintage-chrome' | 'super-res', options?: any) => void;
  onSelectSubject?: () => Promise<void>;
  onRemoveBackground?: () => Promise<void>;
  variations?: GenerativeVariation[];
  activeVariationIndex?: number;
  onSelectVariation?: (index: number) => void;
  foregroundColor: string;
  backgroundColor?: string;
  onChangeForegroundColor: (color: string) => void;
  onChangeBackgroundColor?: (color: string) => void;
}

const BLEND_MODES: { label: string; value: BlendMode }[] = [
  { label: 'Normal', value: 'source-over' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Screen', value: 'screen' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'Darken', value: 'darken' },
  { label: 'Lighten', value: 'lighten' },
  { label: 'Color Dodge', value: 'color-dodge' },
  { label: 'Color Burn', value: 'color-burn' },
  { label: 'Hard Light', value: 'hard-light' },
  { label: 'Soft Light', value: 'soft-light' },
  { label: 'Difference', value: 'difference' },
  { label: 'Exclusion', value: 'exclusion' },
  { label: 'Hue', value: 'hue' },
  { label: 'Saturation', value: 'saturation' },
  { label: 'Color', value: 'color' },
  { label: 'Luminosity', value: 'luminosity' },
];

const PRESET_SWATCHES = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#1e293b', '#64748b', '#cbd5e1', '#b91c1c', '#c2410c', '#b45309', '#047857', '#0e7490', '#1d4ed8', '#6d28d9',
  '#fecdd3', '#fef08a', '#bbf7d0', '#bae6fd', '#ddd6fe', '#fae8ff', '#00f0ff', '#ff0055', '#ffe600', '#00ff66'
];

export const RightPanelDock: React.FC<RightPanelDockProps> = ({
  layers,
  activeLayerId,
  setActiveLayerId,
  onUpdateLayer,
  onNewLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onMergeDown,
  onMoveLayerUp,
  onMoveLayerDown,
  history,
  historyIndex,
  onGoToHistory,
  activeTab,
  setActiveTab,
  selection,
  onApplyGenerativeFill,
  onApplyNeuralStyle,
  onSelectSubject,
  onRemoveBackground,
  variations = [],
  activeVariationIndex = 0,
  onSelectVariation,
  foregroundColor,
  backgroundColor,
  onChangeForegroundColor,
  onChangeBackgroundColor,
}) => {
  const [generativePrompt, setGenerativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [bokehAperture, setBokehAperture] = useState(1.4);

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generativePrompt.trim()) return;
    setIsGenerating(true);
    await onApplyGenerativeFill(generativePrompt);
    setIsGenerating(false);
  };

  const handleAdjustmentChange = (key: keyof LayerAdjustments, value: number) => {
    if (!activeLayer) return;
    const newAdj = { ...activeLayer.adjustments, [key]: value };
    onUpdateLayer(activeLayer.id, { adjustments: newAdj });
  };

  const handleResetAdjustments = () => {
    if (!activeLayer) return;
    onUpdateLayer(activeLayer.id, {
      adjustments: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
        exposure: 0,
        vibrance: 0,
        warmth: 0,
        invert: 0,
        sepia: 0,
        grayscale: 0,
        blur: 0,
      },
    });
  };

  return (
    <div className="w-80 bg-[#232323] border-l border-[#383838] flex flex-col h-full select-none shrink-0 z-40">
      {/* Panel Tab Navigation */}
      <div className="flex items-center bg-[#1c1c1c] border-b border-[#383838] px-1 py-1 gap-1 text-[11px] overflow-x-auto">
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-sm font-medium transition-colors shrink-0 ${
            activeTab === 'layers'
              ? 'bg-[#2e2e2e] text-white shadow-sm border-t-2 border-[#00a8ff]'
              : 'text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#252525]'
          }`}
        >
          <LayersIcon className="w-3.5 h-3.5 text-[#00a8ff]" />
          <span>Layers</span>
        </button>

        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-sm font-medium transition-colors shrink-0 ${
            activeTab === 'adjustments'
              ? 'bg-[#2e2e2e] text-white shadow-sm border-t-2 border-[#a855f7]'
              : 'text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#252525]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#a855f7]" />
          <span>Adjust</span>
        </button>

        <button
          onClick={() => setActiveTab('swatches')}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-sm font-medium transition-colors shrink-0 ${
            activeTab === 'swatches'
              ? 'bg-[#2e2e2e] text-white shadow-sm border-t-2 border-[#10b981]'
              : 'text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#252525]'
          }`}
        >
          <Grid className="w-3.5 h-3.5 text-[#10b981]" />
          <span>Swatches</span>
        </button>

        <button
          onClick={() => setActiveTab('color')}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-sm font-medium transition-colors shrink-0 ${
            activeTab === 'color'
              ? 'bg-[#2e2e2e] text-white shadow-sm border-t-2 border-[#ec4899]'
              : 'text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#252525]'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-[#ec4899]" />
          <span>Color</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-sm font-medium transition-colors shrink-0 ${
            activeTab === 'history'
              ? 'bg-[#2e2e2e] text-white shadow-sm border-t-2 border-[#eab308]'
              : 'text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#252525]'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-[#eab308]" />
          <span>History</span>
        </button>

        <button
          onClick={() => setActiveTab('generative')}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-sm font-medium transition-colors shrink-0 ${
            activeTab === 'generative'
              ? 'bg-[#2e2e2e] text-white shadow-sm border-t-2 border-[#38bdf8]'
              : 'text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#252525]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>AI</span>
        </button>
      </div>

      {/* TAB CONTENT: LAYERS PANEL */}
      {activeTab === 'layers' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#252525]">
          {/* Blend Mode & Opacity Controls */}
          {activeLayer && (
            <div className="p-2.5 bg-[#2a2a2a] border-b border-[#383838] flex flex-col gap-2 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#888888] text-[10px]">Blend:</span>
                <select
                  value={activeLayer.blendMode}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { blendMode: e.target.value as BlendMode })}
                  className="bg-[#1c1c1c] border border-[#404040] rounded px-2 py-1 text-white text-[11px] flex-1 outline-none"
                >
                  {BLEND_MODES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[#888888] text-[10px]">Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeLayer.opacity}
                  onChange={(e) => onUpdateLayer(activeLayer.id, { opacity: Number(e.target.value) })}
                  className="flex-1 accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
                <span className="font-mono tabular-nums text-white w-8 text-right">
                  {activeLayer.opacity}%
                </span>
              </div>
            </div>
          )}

          {/* Layer List Container (rendered top-to-bottom: higher layers on top) */}
          <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
            {[...layers].reverse().map((layer) => {
              const isActive = layer.id === activeLayerId;
              const thumbUrl = generateThumbnail(layer.canvas, 36);

              return (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`flex items-center justify-between p-1.5 rounded transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#374151]/70 border-[#00a8ff] text-white shadow-sm'
                      : 'bg-[#2b2b2b] border-[#363636] text-[#b8b8b8] hover:bg-[#323232]'
                  }`}
                >
                  {/* Left: Visibility & Lock */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateLayer(layer.id, { visible: !layer.visible });
                      }}
                      className="p-1 text-[#888888] hover:text-white transition-colors"
                      title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    >
                      {layer.visible ? (
                        <Eye className="w-3.5 h-3.5 text-[#00a8ff]" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-[#555555]" />
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateLayer(layer.id, { locked: !layer.locked });
                      }}
                      className="p-1 text-[#888888] hover:text-white transition-colors"
                      title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      {layer.locked ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-[#555555]" />
                      )}
                    </button>
                  </div>

                  {/* Center: Thumbnail & Name */}
                  <div className="flex items-center gap-2 flex-1 mx-1.5 overflow-hidden">
                    <div className="w-8 h-8 rounded bg-[#1c1c1c] border border-[#444444] ps-checkerboard flex items-center justify-center overflow-hidden shrink-0">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full bg-[#333333]" />
                      )}
                    </div>

                    <div className="flex flex-col truncate">
                      <span className="text-[11px] font-medium truncate">{layer.name}</span>
                      <span className="text-[9px] text-[#777777] uppercase font-mono">
                        {layer.type} · {layer.blendMode.replace('source-over', 'normal')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Layer Reorder Buttons */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayerUp(layer.id);
                      }}
                      className="p-1 hover:bg-[#404040] rounded text-[#888888] hover:text-white"
                      title="Move Layer Up"
                    >
                      <ArrowDown className="w-3 h-3 rotate-180" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveLayerDown(layer.id);
                      }}
                      className="p-1 hover:bg-[#404040] rounded text-[#888888] hover:text-white"
                      title="Move Layer Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Layer Panel Bottom Toolbar */}
          <div className="h-9 bg-[#232323] border-t border-[#383838] flex items-center justify-between px-3 text-[#cccccc] shrink-0">
            <div className="text-[10px] text-[#777777] font-mono tabular-nums">
              {layers.length} {layers.length === 1 ? 'Layer' : 'Layers'}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onMergeDown}
                title="Merge Down (Ctrl+E)"
                className="p-1.5 hover:bg-[#383838] rounded text-[#aaaaaa] hover:text-white transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDuplicateLayer}
                title="Duplicate Layer (Ctrl+J)"
                className="p-1.5 hover:bg-[#383838] rounded text-[#aaaaaa] hover:text-white transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onNewLayer}
                title="Create New Layer (Ctrl+Shift+N)"
                className="p-1.5 hover:bg-[#383838] rounded text-[#aaaaaa] hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#00a8ff]" />
              </button>
              <button
                onClick={onDeleteLayer}
                title="Delete Layer (Del)"
                className="p-1.5 hover:bg-[#383838] rounded text-[#aaaaaa] hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ADJUSTMENTS PANEL */}
      {activeTab === 'adjustments' && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 text-[11px] bg-[#252525]">
          <div className="flex items-center justify-between pb-2 border-b border-[#383838]">
            <span className="font-semibold text-white">Live Adjustments</span>
            <button
              onClick={handleResetAdjustments}
              className="text-[10px] text-[#00a8ff] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </button>
          </div>

          {activeLayer ? (
            <div className="flex flex-col gap-3">
              {/* Brightness */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[#aaaaaa]">
                  <span>Brightness</span>
                  <span className="font-mono tabular-nums">{activeLayer.adjustments.brightness}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={activeLayer.adjustments.brightness}
                  onChange={(e) => handleAdjustmentChange('brightness', Number(e.target.value))}
                  className="accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
              </div>

              {/* Contrast */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[#aaaaaa]">
                  <span>Contrast</span>
                  <span className="font-mono tabular-nums">{activeLayer.adjustments.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={activeLayer.adjustments.contrast}
                  onChange={(e) => handleAdjustmentChange('contrast', Number(e.target.value))}
                  className="accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[#aaaaaa]">
                  <span>Saturation</span>
                  <span className="font-mono tabular-nums">{activeLayer.adjustments.saturation}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={activeLayer.adjustments.saturation}
                  onChange={(e) => handleAdjustmentChange('saturation', Number(e.target.value))}
                  className="accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
              </div>

              {/* Hue */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[#aaaaaa]">
                  <span>Hue Rotate</span>
                  <span className="font-mono tabular-nums">{activeLayer.adjustments.hue}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={activeLayer.adjustments.hue}
                  onChange={(e) => handleAdjustmentChange('hue', Number(e.target.value))}
                  className="accent-[#a855f7] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
              </div>

              {/* Exposure */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[#aaaaaa]">
                  <span>Exposure</span>
                  <span className="font-mono tabular-nums">{activeLayer.adjustments.exposure}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={activeLayer.adjustments.exposure}
                  onChange={(e) => handleAdjustmentChange('exposure', Number(e.target.value))}
                  className="accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
              </div>

              {/* Blur */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[#aaaaaa]">
                  <span>Gaussian Softness (Blur)</span>
                  <span className="font-mono tabular-nums">{activeLayer.adjustments.blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={activeLayer.adjustments.blur}
                  onChange={(e) => handleAdjustmentChange('blur', Number(e.target.value))}
                  className="accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
              </div>

              {/* Grayscale */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[#aaaaaa]">
                  <span>Black & White (Grayscale)</span>
                  <span className="font-mono tabular-nums">{activeLayer.adjustments.grayscale}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeLayer.adjustments.grayscale}
                  onChange={(e) => handleAdjustmentChange('grayscale', Number(e.target.value))}
                  className="accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
              </div>

              {/* Sepia */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[#aaaaaa]">
                  <span>Vintage Sepia</span>
                  <span className="font-mono tabular-nums">{activeLayer.adjustments.sepia}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeLayer.adjustments.sepia}
                  onChange={(e) => handleAdjustmentChange('sepia', Number(e.target.value))}
                  className="accent-[#f59e0b] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
              </div>

              {/* Invert */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[#aaaaaa]">
                  <span>Invert Colors</span>
                  <span className="font-mono tabular-nums">{activeLayer.adjustments.invert}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeLayer.adjustments.invert}
                  onChange={(e) => handleAdjustmentChange('invert', Number(e.target.value))}
                  className="accent-[#ec4899] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="text-[#777777] text-center py-8">Select a layer to adjust</div>
          )}
        </div>
      )}

      {/* TAB CONTENT: DEDICATED SWATCHES PANEL */}
      {activeTab === 'swatches' && (
        <SwatchesPanel
          foregroundColor={foregroundColor}
          backgroundColor={backgroundColor || '#000000'}
          onChangeForegroundColor={onChangeForegroundColor}
          onChangeBackgroundColor={onChangeBackgroundColor}
        />
      )}

      {/* TAB CONTENT: COLOR MIXER */}
      {activeTab === 'color' && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 text-[11px] bg-[#252525]">
          <div className="flex items-center justify-between pb-2 border-b border-[#383838]">
            <span className="font-semibold text-white">Color Mixer</span>
            <button
              onClick={() => setActiveTab('swatches')}
              className="text-[10px] text-[#10b981] hover:underline flex items-center gap-1 font-medium"
            >
              <Grid className="w-3 h-3" />
              <span>Open Swatches</span>
            </button>
          </div>

          {/* Active Color Preview & Hex Input */}
          <div className="flex items-center gap-2 bg-[#1e1e1e] p-2 rounded border border-[#3e3e3e]">
            <div
              className="w-10 h-10 rounded border border-[#555555] shadow-inner shrink-0"
              style={{ backgroundColor: foregroundColor }}
            />
            <div className="flex flex-col flex-1 gap-1">
              <span className="text-[10px] text-[#888888]">Current Foreground:</span>
              <input
                type="text"
                value={foregroundColor.toUpperCase()}
                onChange={(e) => onChangeForegroundColor(e.target.value)}
                className="bg-[#292929] border border-[#444444] rounded px-2 py-0.5 text-white font-mono text-[11px] outline-none"
              />
            </div>
          </div>

          {/* Preset Swatches Grid */}
          <div className="flex flex-col gap-1.5 mt-2">
            <span className="text-[10px] text-[#888888] uppercase font-semibold">PhotoLab Color Swatches</span>
            <div className="grid grid-cols-6 gap-1.5 bg-[#1e1e1e] p-2 rounded border border-[#383838]">
              {PRESET_SWATCHES.map((hex, i) => (
                <button
                  key={i}
                  onClick={() => onChangeForegroundColor(hex)}
                  title={hex}
                  className="w-full aspect-square rounded-sm border border-[#444444] hover:scale-110 hover:border-white transition-transform shadow-sm"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: HISTORY PANEL */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 text-[11px] bg-[#252525]">
          <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#383838]">
            <span className="font-semibold text-white">History Stack</span>
            <span className="text-[10px] text-[#777777] font-mono tabular-nums">{history.length} states</span>
          </div>

          <div className="flex flex-col gap-0.5 mt-1">
            {history.map((item, idx) => {
              const isCurrent = idx === historyIndex;
              const isFuture = idx > historyIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => onGoToHistory(idx)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-[#005fb8] text-white font-medium shadow-sm'
                      : isFuture
                      ? 'text-[#666666] hover:bg-[#2c2c2c]'
                      : 'text-[#cccccc] hover:bg-[#323232]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 opacity-60" />
                  <span className="truncate flex-1">{item.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'generative' && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 text-[11px] bg-[#252525]">
          <div className="flex items-center gap-2 pb-2 border-b border-[#383838]">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#0284c7] to-[#ec4899] text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white">Photoshop AI Studio</div>
              <div className="text-[10px] text-[#7dd3fc]">Powered by Gemini & Firefly Engine</div>
            </div>
          </div>

          {/* 1-Click Quick AI Tools */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-[#888888] uppercase font-semibold">1-Click AI Actions</span>
            <div className="grid grid-cols-2 gap-2">
              {onSelectSubject && (
                <button
                  type="button"
                  onClick={onSelectSubject}
                  className="flex items-center gap-2 p-2 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] rounded-md text-left transition-all group"
                >
                  <UserCheck className="w-4 h-4 text-[#38bdf8] group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-medium text-white">Select Subject</div>
                    <div className="text-[9px] text-[#9ca3af]">Auto-detect bounds</div>
                  </div>
                </button>
              )}

              {onRemoveBackground && (
                <button
                  type="button"
                  onClick={onRemoveBackground}
                  className="flex items-center gap-2 p-2 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] rounded-md text-left transition-all group"
                >
                  <Scissors className="w-4 h-4 text-[#f43f5e] group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-medium text-white">Remove BG</div>
                    <div className="text-[9px] text-[#9ca3af]">Transparent cutout</div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Generative Fill Form */}
          <form onSubmit={handlePromptSubmit} className="flex flex-col gap-2 pt-2 border-t border-[#383838]">
            <div className="flex items-center justify-between">
              <span className="text-[#cccccc] font-medium">Generative Fill</span>
              {selection.active ? (
                <span className="text-[10px] text-[#38bdf8] font-mono">
                  {Math.round(selection.width)}×{Math.round(selection.height)}px
                </span>
              ) : (
                <span className="text-[9px] text-[#888888]">Active layer</span>
              )}
            </div>

            <textarea
              value={generativePrompt}
              onChange={(e) => setGenerativePrompt(e.target.value)}
              placeholder="Describe what to generate or add (e.g. 'sunset sky with mountains', 'cyberpunk neon visor', 'soft bokeh orbs', 'remove wire and blemish')..."
              className="w-full bg-[#1c1c1c] border border-[#444444] rounded p-2 text-white placeholder-[#666666] text-[11px] h-20 outline-none focus:border-[#38bdf8] transition-colors resize-none"
            />

            {/* Quick Prompt Idea Chips */}
            <div className="flex flex-wrap gap-1">
              {[
                'Studio Rim Lighting',
                'Sunset Gold & Clouds',
                'Neon Cyber Glow',
                'Erase & Remove Object',
                'Misty Ambient Forest',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setGenerativePrompt(chip)}
                  className="px-2 py-0.5 rounded-full bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-[10px] text-[#94a3b8] hover:text-white transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isGenerating || !generativePrompt.trim()}
              className={`flex items-center justify-center gap-2 py-2 rounded-md font-medium text-white shadow-md transition-all ${
                isGenerating || !generativePrompt.trim()
                  ? 'bg-[#334155] opacity-50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] hover:brightness-110'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Synthesizing with Gemini...' : 'Generate with AI'}</span>
            </button>
          </form>

          {/* Active Variations (if available) */}
          {variations.length > 0 && onSelectVariation && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[#383838]">
              <span className="text-[#cccccc] font-medium">Generative Variations</span>
              <div className="grid grid-cols-3 gap-1.5">
                {variations.map((v, i) => (
                  <button
                    key={v.id || i}
                    type="button"
                    onClick={() => onSelectVariation(i)}
                    className={`flex flex-col p-1.5 rounded border text-left transition-all ${
                      i === activeVariationIndex
                        ? 'bg-[#0369a1]/30 border-[#38bdf8] text-white shadow-sm'
                        : 'bg-[#1e1e1e] border-[#383838] text-[#aaaaaa] hover:border-[#555555]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span>Var {i + 1}</span>
                      {i === activeVariationIndex && <span className="text-[#38bdf8]">✓</span>}
                    </div>
                    <div className="flex gap-0.5 mt-1 h-2 rounded overflow-hidden">
                      {(v.colors || ['#38bdf8']).slice(0, 4).map((c: string, ci: number) => (
                        <div key={ci} className="flex-1" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Photoshop Neural Filters Section */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#383838]">
            <div className="flex items-center justify-between">
              <span className="text-[#cccccc] font-medium">Neural Filters</span>
              <span className="text-[9px] text-[#38bdf8]">Live GPU & AI</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onApplyNeuralStyle('colorize')}
                className="p-2 bg-[#262626] border border-[#404040] hover:border-[#38bdf8] rounded-md text-left transition-all"
              >
                <div className="font-medium text-[#38bdf8]">Colorize B&W</div>
                <div className="text-[9px] text-[#a3a3a3]">Colorize monochrome photo</div>
              </button>

              <button
                type="button"
                onClick={() => onApplyNeuralStyle('super-res')}
                className="p-2 bg-[#262626] border border-[#404040] hover:border-[#10b981] rounded-md text-left transition-all"
              >
                <div className="font-medium text-[#10b981]">Super Resolution</div>
                <div className="text-[9px] text-[#a3a3a3]">Enhance sharpness & detail</div>
              </button>

              <button
                type="button"
                onClick={() => onApplyNeuralStyle('depth-blur', { intensity: 1.0, aperture: bokehAperture })}
                className="p-2 bg-[#262626] border border-[#404040] hover:border-[#a855f7] rounded-md text-left transition-all"
              >
                <div className="font-medium text-[#c084fc]">Depth Blur / Bokeh</div>
                <div className="text-[9px] text-[#a3a3a3]">DSLR lens aperture blur</div>
              </button>

              <button
                type="button"
                onClick={() => onApplyNeuralStyle('golden-hour')}
                className="p-2 bg-[#2d2a23] border border-[#b45309]/50 hover:border-[#f59e0b] rounded-md text-left transition-all"
              >
                <div className="font-medium text-[#fde047]">Golden Hour</div>
                <div className="text-[9px] text-[#a3a3a3]">Warm sunset radiance</div>
              </button>

              <button
                type="button"
                onClick={() => onApplyNeuralStyle('cyber-glow')}
                className="p-2 bg-[#1b253b] border border-[#06b6d4]/50 hover:border-[#38bdf8] rounded-md text-left transition-all"
              >
                <div className="font-medium text-[#38bdf8]">Cyber Neon</div>
                <div className="text-[9px] text-[#a3a3a3]">Teal & magenta bloom</div>
              </button>

              <button
                type="button"
                onClick={() => onApplyNeuralStyle('noir')}
                className="p-2 bg-[#1f1f1f] border border-[#525252] hover:border-white rounded-md text-left transition-all"
              >
                <div className="font-medium text-white">Film Noir</div>
                <div className="text-[9px] text-[#a3a3a3]">Deep contrast monochrome</div>
              </button>

              <button
                type="button"
                onClick={() => onApplyNeuralStyle('portrait-pop')}
                className="p-2 bg-[#2d222a] border border-[#f43f5e]/40 hover:border-[#fb7185] rounded-md text-left transition-all"
              >
                <div className="font-medium text-[#f472b6]">Portrait Soften</div>
                <div className="text-[9px] text-[#a3a3a3]">Luminance skin glow</div>
              </button>

              <button
                type="button"
                onClick={() => onApplyNeuralStyle('vintage-chrome')}
                className="p-2 bg-[#292524] border border-[#78716c]/50 hover:border-[#d6d3d1] rounded-md text-left transition-all"
              >
                <div className="font-medium text-[#e7e5e4]">Vintage Chrome</div>
                <div className="text-[9px] text-[#a3a3a3]">Analog film tone</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
