import React from 'react';
import { 
  ToolType, 
  ToolSettings, 
  SelectionState 
} from '../types/photoshop';
import { 
  Sparkles, 
  Check, 
  X, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Square, 
  Circle, 
  Star,
  Sliders,
  Maximize2,
  UserCheck,
  Scissors
} from 'lucide-react';

interface ToolOptionsBarProps {
  currentTool: ToolType;
  settings: ToolSettings;
  updateSettings: (partial: Partial<ToolSettings>) => void;
  selection: SelectionState;
  onOpenGenerativeFill: () => void;
  onDeselect: () => void;
  onCommitCrop: () => void;
  onCancelCrop: () => void;
  onFitScreen: () => void;
  onActualPixels: () => void;
  onSelectSubject?: () => void;
  onRemoveBackground?: () => void;
  onGenerativeExpand?: () => void;
}

export const ToolOptionsBar: React.FC<ToolOptionsBarProps> = ({
  currentTool,
  settings,
  updateSettings,
  selection,
  onOpenGenerativeFill,
  onDeselect,
  onCommitCrop,
  onCancelCrop,
  onFitScreen,
  onActualPixels,
  onSelectSubject,
  onRemoveBackground,
  onGenerativeExpand,
}) => {
  return (
    <div className="h-8 bg-[#2b2b2b] border-b border-[#383838] px-3 flex items-center justify-between text-[11px] text-[#cccccc] select-none shrink-0 overflow-x-auto">
      <div className="flex items-center gap-3">
        {/* Tool Name Indicator Badge */}
        <div className="flex items-center gap-1.5 font-medium text-[#ffffff] pr-2 border-r border-[#404040]">
          <span className="capitalize">{currentTool.replace('-', ' ')}</span>
        </div>

        {/* AI Remove Tool Options */}
        {currentTool === 'remove-tool' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#999999]">Size:</span>
              <input
                type="range"
                min="5"
                max="250"
                value={settings.brushSize}
                onChange={(e) => updateSettings({ brushSize: Number(e.target.value) })}
                className="w-24 accent-[#ec4899] h-1.5 bg-[#404040] rounded cursor-pointer"
              />
              <span className="font-mono tabular-nums w-8 text-right text-white">{settings.brushSize}px</span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#831843]/40 border border-[#f43f5e]/40 px-2 py-0.5 rounded-full text-[10px] text-[#fbcfe8]">
              <Sparkles className="w-3 h-3 text-[#f472b6]" />
              <span>AI Remove Tool: Brush over unwanted items to magically erase & blend</span>
            </div>
          </div>
        )}

        {/* Brush / Pencil / Eraser / Stamp / Healing / Blur / Tone Controls */}
        {(['brush', 'pencil', 'color-replacement', 'mixer-brush', 'eraser', 'background-eraser', 'clone-stamp', 'pattern-stamp', 'history-brush', 'art-history-brush', 'spot-healing', 'healing-brush', 'patch', 'blur-tool', 'sharpen-tool', 'smudge-tool', 'dodge', 'burn', 'sponge'].includes(currentTool)) && (
          <div className="flex items-center gap-4">
            {/* Size */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#999999]">Size:</span>
              <input
                type="range"
                min="1"
                max="300"
                value={settings.brushSize}
                onChange={(e) => updateSettings({ brushSize: Number(e.target.value) })}
                className="w-20 accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
              />
              <span className="font-mono tabular-nums w-8 text-right text-white">{settings.brushSize}px</span>
            </div>

            {/* Hardness */}
            {currentTool !== 'pencil' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[#999999]">Hardness:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.brushHardness}
                  onChange={(e) => updateSettings({ brushHardness: Number(e.target.value) })}
                  className="w-16 accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
                <span className="font-mono tabular-nums w-7 text-right text-white">{settings.brushHardness}%</span>
              </div>
            )}

            {/* Opacity / Strength / Exposure */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#999999]">
                {['blur-tool', 'sharpen-tool', 'smudge-tool'].includes(currentTool)
                  ? 'Strength:'
                  : ['dodge', 'burn', 'sponge'].includes(currentTool)
                  ? 'Exposure:'
                  : 'Opacity:'}
              </span>
              <input
                type="range"
                min="1"
                max="100"
                value={settings.brushOpacity}
                onChange={(e) => updateSettings({ brushOpacity: Number(e.target.value) })}
                className="w-16 accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
              />
              <span className="font-mono tabular-nums w-7 text-right text-white">{settings.brushOpacity}%</span>
            </div>

            {/* Flow */}
            {['brush', 'mixer-brush', 'clone-stamp'].includes(currentTool) && (
              <div className="flex items-center gap-1.5">
                <span className="text-[#999999]">Flow:</span>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={settings.brushFlow}
                  onChange={(e) => updateSettings({ brushFlow: Number(e.target.value) })}
                  className="w-16 accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
                <span className="font-mono tabular-nums w-7 text-right text-white">{settings.brushFlow}%</span>
              </div>
            )}

            {/* Clone Stamp Alt Helper */}
            {currentTool === 'clone-stamp' && (
              <div className="flex items-center gap-1 bg-[#1e1e1e] px-2 py-0.5 rounded text-[10px] text-[#38bdf8] border border-[#38bdf8]/30">
                <span>Tip: Hold Alt + Click to set sample origin</span>
              </div>
            )}
          </div>
        )}

        {/* Selection Tools Options (Marquee, Lasso, Wand, Object Select) */}
        {(['marquee-rect', 'marquee-ellipse', 'marquee-single-row', 'marquee-single-col', 'lasso', 'lasso-polygon', 'lasso-magnetic', 'object-select', 'quick-select', 'magic-wand'].includes(currentTool)) && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#999999]">Feather:</span>
              <input
                type="number"
                min="0"
                max="50"
                value={settings.feather}
                onChange={(e) => updateSettings({ feather: Math.max(0, Number(e.target.value)) })}
                className="w-12 bg-[#1c1c1c] border border-[#444444] rounded px-1.5 py-0.5 text-center text-white font-mono"
              />
              <span>px</span>
            </div>

            {(['magic-wand', 'quick-select', 'object-select'].includes(currentTool)) && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-[#404040]">
                <span className="text-[#999999]">Tolerance:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.tolerance}
                  onChange={(e) => updateSettings({ tolerance: Number(e.target.value) })}
                  className="w-16 accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
                <span className="font-mono tabular-nums text-white w-5">{settings.tolerance}</span>
              </div>
            )}

            {/* 1-Click AI Select Subject & Remove BG buttons */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#404040]">
              {onSelectSubject && (
                <button
                  onClick={onSelectSubject}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] text-[#38bdf8] font-medium"
                  title="Photoshop AI: Select Subject"
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Select Subject</span>
                </button>
              )}
              {onRemoveBackground && (
                <button
                  onClick={onRemoveBackground}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] text-[#f43f5e] font-medium"
                  title="Photoshop AI: Remove Background Cutout"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Remove BG</span>
                </button>
              )}
            </div>

            {selection.active && (
              <div className="flex items-center gap-2 pl-2 border-l border-[#404040]">
                <button
                  onClick={onOpenGenerativeFill}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-gradient-to-r from-[#0284c7] to-[#38bdf8] text-white font-medium hover:brightness-110 shadow-sm"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generative Fill</span>
                </button>
                <button
                  onClick={onDeselect}
                  className="px-2 py-0.5 rounded bg-[#3a3a3a] hover:bg-[#484848] text-[#cccccc]"
                >
                  Deselect (Ctrl+D)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Paint Bucket & Gradient Tool Options */}
        {(['paint-bucket', 'gradient', 'magic-eraser'].includes(currentTool)) && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#999999]">Tolerance:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.tolerance}
                onChange={(e) => updateSettings({ tolerance: Number(e.target.value) })}
                className="w-20 accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
              />
              <span className="font-mono tabular-nums text-white w-6">{settings.tolerance}</span>
            </div>

            {currentTool === 'gradient' && (
              <div className="flex items-center gap-2 pl-2 border-l border-[#404040]">
                <span className="text-[#999999]">Type:</span>
                <select
                  value={settings.gradientType || 'linear'}
                  onChange={(e) => updateSettings({ gradientType: e.target.value as any })}
                  className="bg-[#1c1c1c] border border-[#444444] rounded px-2 py-0.5 text-white"
                >
                  <option value="linear">Linear Gradient</option>
                  <option value="radial">Radial Gradient</option>
                  <option value="angle">Angle Gradient</option>
                  <option value="reflected">Reflected Gradient</option>
                  <option value="diamond">Diamond Gradient</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Text Tool Options */}
        {(['text', 'text-vertical'].includes(currentTool)) && (
          <div className="flex items-center gap-3">
            <select
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              className="bg-[#1c1c1c] border border-[#444444] rounded px-2 py-0.5 text-white"
            >
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
              <option value="sans-serif">System Sans</option>
              <option value="serif">Classic Serif</option>
              <option value="monospace">Monospace</option>
              <option value="Impact">Impact Headline</option>
            </select>

            <div className="flex items-center gap-1">
              <span className="text-[#999999]">Size:</span>
              <input
                type="number"
                min="8"
                max="240"
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-14 bg-[#1c1c1c] border border-[#444444] rounded px-1.5 py-0.5 text-center text-white font-mono"
              />
              <span>pt</span>
            </div>

            <select
              value={settings.fontWeight}
              onChange={(e) => updateSettings({ fontWeight: e.target.value })}
              className="bg-[#1c1c1c] border border-[#444444] rounded px-2 py-0.5 text-white"
            >
              <option value="normal">Regular</option>
              <option value="bold">Bold</option>
              <option value="600">SemiBold</option>
            </select>

            {/* Alignment */}
            <div className="flex items-center bg-[#1e1e1e] border border-[#444444] rounded p-0.5">
              <button
                onClick={() => updateSettings({ textAlign: 'left' })}
                className={`p-1 rounded ${settings.textAlign === 'left' ? 'bg-[#3b3b3b] text-white' : 'text-[#888888]'}`}
                title="Left Align"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateSettings({ textAlign: 'center' })}
                className={`p-1 rounded ${settings.textAlign === 'center' ? 'bg-[#3b3b3b] text-white' : 'text-[#888888]'}`}
                title="Center Align"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateSettings({ textAlign: 'right' })}
                className={`p-1 rounded ${settings.textAlign === 'right' ? 'bg-[#3b3b3b] text-white' : 'text-[#888888]'}`}
                title="Right Align"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Text Color */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#999999]">Color:</span>
              <input
                type="color"
                value={settings.textColor}
                onChange={(e) => updateSettings({ textColor: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border border-[#555555] bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Shape Tools Options */}
        {(['shape-rect', 'shape-rounded-rect', 'shape-ellipse', 'shape-polygon', 'shape-line', 'shape-star', 'custom-shape'].includes(currentTool)) && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#999999]">Fill:</span>
              <input
                type="color"
                value={settings.shapeFill}
                onChange={(e) => updateSettings({ shapeFill: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border border-[#555555] bg-transparent"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#999999]">Stroke:</span>
              <input
                type="color"
                value={settings.shapeStroke}
                onChange={(e) => updateSettings({ shapeStroke: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer border border-[#555555] bg-transparent"
              />
              <input
                type="number"
                min="0"
                max="50"
                value={settings.shapeStrokeWidth}
                onChange={(e) => updateSettings({ shapeStrokeWidth: Number(e.target.value) })}
                className="w-12 bg-[#1c1c1c] border border-[#444444] rounded px-1.5 py-0.5 text-center text-white font-mono"
              />
              <span>px</span>
            </div>

            {currentTool === 'shape-polygon' && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-[#404040]">
                <span className="text-[#999999]">Sides:</span>
                <input
                  type="number"
                  min="3"
                  max="12"
                  value={settings.polygonSides || 5}
                  onChange={(e) => updateSettings({ polygonSides: Number(e.target.value) })}
                  className="w-12 bg-[#1c1c1c] border border-[#444444] rounded px-1.5 py-0.5 text-center text-white font-mono"
                />
              </div>
            )}

            {currentTool === 'custom-shape' && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-[#404040]">
                <span className="text-[#999999]">Shape:</span>
                <select
                  value={settings.customShapeType || 'star'}
                  onChange={(e) => updateSettings({ customShapeType: e.target.value as any })}
                  className="bg-[#1c1c1c] border border-[#444444] rounded px-2 py-0.5 text-white"
                >
                  <option value="star">5-Point Star</option>
                  <option value="heart">Heart</option>
                  <option value="arrow">Arrow</option>
                  <option value="banner">Banner Ribbon</option>
                  <option value="bubble">Speech Bubble</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Crop Tool Options */}
        {currentTool === 'crop' && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[#999999]">Aspect:</span>
              <select
                value={settings.cropAspect}
                onChange={(e) => updateSettings({ cropAspect: e.target.value as any })}
                className="bg-[#1c1c1c] border border-[#444444] rounded px-2 py-0.5 text-white"
              >
                <option value="free">Free Ratio</option>
                <option value="1:1">1:1 Square</option>
                <option value="16:9">16:9 Cinematic</option>
                <option value="4:3">4:3 Standard</option>
                <option value="9:16">9:16 Portrait</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-[#404040]">
              <button
                onClick={onCommitCrop}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Crop</span>
              </button>
              {onGenerativeExpand && (
                <button
                  onClick={onGenerativeExpand}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-gradient-to-r from-[#0284c7] to-[#38bdf8] hover:brightness-110 text-white font-medium shadow-sm"
                  title="Generative Expand with AI"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generative Expand</span>
                </button>
              )}
              <button
                onClick={onCancelCrop}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#3b3b3b] hover:bg-[#484848] text-[#cccccc]"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {/* Hand & Zoom Options */}
        {(['hand', 'zoom'].includes(currentTool)) && (
          <div className="flex items-center gap-2">
            <button
              onClick={onFitScreen}
              className="px-2.5 py-0.5 rounded bg-[#383838] hover:bg-[#484848] text-white"
            >
              Fit on Screen
            </button>
            <button
              onClick={onActualPixels}
              className="px-2.5 py-0.5 rounded bg-[#383838] hover:bg-[#484848] text-white"
            >
              100% Actual Pixels
            </button>
          </div>
        )}
      </div>

      {/* Floating Selection Banner on the Right */}
      {selection.active && (
        <div className="flex items-center gap-2 bg-[#1c2a38] border border-[#0284c7]/40 px-2 py-0.5 rounded text-[10px]">
          <span className="text-[#38bdf8] font-medium">
            Active Selection: {Math.round(selection.width)} × {Math.round(selection.height)} px
          </span>
          <button
            onClick={onOpenGenerativeFill}
            className="flex items-center gap-1 bg-[#0284c7] hover:bg-[#0369a1] text-white px-2 py-0.5 rounded font-medium"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Fill</span>
          </button>
        </div>
      )}
    </div>
  );
};
