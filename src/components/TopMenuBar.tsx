import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderOpen, 
  Save, 
  Download, 
  RotateCcw, 
  RotateCw, 
  Plus, 
  Copy, 
  Trash2, 
  Sliders, 
  Sparkles, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  Layers as LayersIcon,
  Eye,
  FileImage,
  ChevronDown,
  Monitor
} from 'lucide-react';

interface TopMenuBarProps {
  documentName: string;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNewDocument: () => void;
  onOpenImage: () => void;
  onLoadSample: (type: 'nebula' | 'cyberpunk') => void;
  onSaveProject: () => void;
  onExport: () => void;
  onOpenPCExport?: () => void;
  onNewLayer: () => void;
  onDuplicateLayer: () => void;
  onDeleteLayer: () => void;
  onMergeDown: () => void;
  onFlattenImage: () => void;
  onDeselect: () => void;
  onSelectAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  onActualPixels: () => void;
  onOpenFilterDialog: (filter: string) => void;
  onOpenAdjustments: (type: string) => void;
  onOpenGenerativeFill: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  activePanelTab: string;
  setActivePanelTab: (tab: string) => void;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  documentName,
  zoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNewDocument,
  onOpenImage,
  onLoadSample,
  onSaveProject,
  onExport,
  onOpenPCExport,
  onNewLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onMergeDown,
  onFlattenImage,
  onDeselect,
  onSelectAll,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  onActualPixels,
  onOpenFilterDialog,
  onOpenAdjustments,
  onOpenGenerativeFill,
  showRulers,
  onToggleRulers,
  activePanelTab,
  setActivePanelTab,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const handleAction = (callback: () => void) => {
    callback();
    setOpenMenu(null);
  };

  return (
    <div 
      ref={menuRef} 
      className="h-9 bg-[#232323] border-b border-[#383838] flex items-center justify-between px-2 text-[12px] text-[#cccccc] select-none z-50 shrink-0"
    >
      {/* Left: Brand Icon & Menus */}
      <div className="flex items-center gap-1">
        {/* PhotoLab Brand Mark */}
        <div 
          onClick={onNewDocument}
          className="w-6 h-6 rounded bg-[#002447] border border-[#00a8ff]/50 flex items-center justify-center font-bold text-[#00a8ff] text-[11px] tracking-tight cursor-pointer mr-1 hover:brightness-125 transition-all shadow-sm"
          title="PhotoLab"
        >
          PL
        </div>

        {/* File Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('file')}
            className={`px-2.5 py-1 rounded transition-colors ${openMenu === 'file' ? 'bg-[#3b3b3b] text-white' : 'hover:bg-[#323232] text-[#cccccc]'}`}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="absolute top-full left-0 mt-0.5 w-60 bg-[#282828] border border-[#3e3e3e] shadow-2xl py-1 rounded-sm z-50">
              <button 
                onClick={() => handleAction(onNewDocument)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>New Document...</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+N</span>
              </button>
              <button 
                onClick={() => handleAction(onOpenImage)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Open Image File...</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+O</span>
              </button>
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <div className="px-3 py-1 text-[10px] text-[#777777] uppercase font-semibold">Sample Templates</div>
              <button 
                onClick={() => handleAction(() => onLoadSample('nebula'))} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Stellar Odyssey (Layers)</span>
                <span className="text-[10px] text-[#00a8ff]">Sample</span>
              </button>
              <button 
                onClick={() => handleAction(() => onLoadSample('cyberpunk'))} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Neo Tokyo Poster (Vector)</span>
                <span className="text-[10px] text-[#00a8ff]">Sample</span>
              </button>
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <button 
                onClick={() => handleAction(onSaveProject)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Save Project (.json / .psd)</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+S</span>
              </button>
              <button 
                onClick={() => handleAction(onExport)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Export As... (PNG/JPG/SVG)</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+Shift+E</span>
              </button>
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <button 
                onClick={() => handleAction(onOpenPCExport || onExport)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors text-[#38bdf8]"
              >
                <span className="flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-[#38bdf8]" />
                  Install / Export for PC (.exe)...
                </span>
                <span className="text-[9px] bg-[#005fb8] text-white px-1 py-0.2 rounded font-semibold font-mono">PC</span>
              </button>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('edit')}
            className={`px-2.5 py-1 rounded transition-colors ${openMenu === 'edit' ? 'bg-[#3b3b3b] text-white' : 'hover:bg-[#323232] text-[#cccccc]'}`}
          >
            Edit
          </button>
          {openMenu === 'edit' && (
            <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#282828] border border-[#3e3e3e] shadow-2xl py-1 rounded-sm z-50">
              <button 
                disabled={!canUndo} 
                onClick={() => handleAction(onUndo)} 
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${canUndo ? 'hover:bg-[#005fb8] hover:text-white' : 'opacity-40 cursor-not-allowed'}`}
              >
                <span>Undo</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+Z</span>
              </button>
              <button 
                disabled={!canRedo} 
                onClick={() => handleAction(onRedo)} 
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${canRedo ? 'hover:bg-[#005fb8] hover:text-white' : 'opacity-40 cursor-not-allowed'}`}
              >
                <span>Redo</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+Y</span>
              </button>
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <button 
                onClick={() => handleAction(onOpenGenerativeFill)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors text-[#38bdf8]"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                  Generative Fill...
                </span>
                <span className="text-[10px] text-[#38bdf8]">AI</span>
              </button>
              <button 
                onClick={() => handleAction(onDeselect)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Deselect</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+D</span>
              </button>
            </div>
          )}
        </div>

        {/* Image Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('image')}
            className={`px-2.5 py-1 rounded transition-colors ${openMenu === 'image' ? 'bg-[#3b3b3b] text-white' : 'hover:bg-[#323232] text-[#cccccc]'}`}
          >
            Image
          </button>
          {openMenu === 'image' && (
            <div className="absolute top-full left-0 mt-0.5 w-60 bg-[#282828] border border-[#3e3e3e] shadow-2xl py-1 rounded-sm z-50">
              <div className="px-3 py-1 text-[10px] text-[#777777] uppercase font-semibold">Adjustments</div>
              <button 
                onClick={() => handleAction(() => onOpenAdjustments('brightness'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Brightness / Contrast...
              </button>
              <button 
                onClick={() => handleAction(() => onOpenAdjustments('saturation'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Hue / Saturation...
              </button>
              <button 
                onClick={() => handleAction(() => onOpenAdjustments('vibrance'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Vibrance & Warmth...
              </button>
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <button 
                onClick={() => handleAction(() => onOpenAdjustments('invert'))} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Invert Colors</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+I</span>
              </button>
              <button 
                onClick={() => handleAction(() => onOpenAdjustments('grayscale'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Desaturate / Black & White
              </button>
              <button 
                onClick={() => handleAction(() => onOpenAdjustments('sepia'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Sepia Tone
              </button>
            </div>
          )}
        </div>

        {/* Layer Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('layer')}
            className={`px-2.5 py-1 rounded transition-colors ${openMenu === 'layer' ? 'bg-[#3b3b3b] text-white' : 'hover:bg-[#323232] text-[#cccccc]'}`}
          >
            Layer
          </button>
          {openMenu === 'layer' && (
            <div className="absolute top-full left-0 mt-0.5 w-60 bg-[#282828] border border-[#3e3e3e] shadow-2xl py-1 rounded-sm z-50">
              <button 
                onClick={() => handleAction(onNewLayer)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>New Layer</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+Shift+N</span>
              </button>
              <button 
                onClick={() => handleAction(onDuplicateLayer)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Duplicate Layer</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+J</span>
              </button>
              <button 
                onClick={() => handleAction(onDeleteLayer)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors text-red-300"
              >
                <span>Delete Layer</span>
                <span className="text-[10px] text-[#888888] font-mono">Del</span>
              </button>
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <button 
                onClick={() => handleAction(onMergeDown)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Merge Down</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+E</span>
              </button>
              <button 
                onClick={() => handleAction(onFlattenImage)} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Flatten Image
              </button>
            </div>
          )}
        </div>

        {/* Filter Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('filter')}
            className={`px-2.5 py-1 rounded transition-colors ${openMenu === 'filter' ? 'bg-[#3b3b3b] text-white' : 'hover:bg-[#323232] text-[#cccccc]'}`}
          >
            Filter
          </button>
          {openMenu === 'filter' && (
            <div className="absolute top-full left-0 mt-0.5 w-60 bg-[#282828] border border-[#3e3e3e] shadow-2xl py-1 rounded-sm z-50">
              <button 
                onClick={() => handleAction(onOpenGenerativeFill)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors text-[#38bdf8] font-medium"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                  Neural Filters / Firefly AI
                </span>
              </button>
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <button 
                onClick={() => handleAction(() => onOpenFilterDialog('gaussian-blur'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Gaussian Blur...
              </button>
              <button 
                onClick={() => handleAction(() => onOpenFilterDialog('sharpen'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Unsharp Mask (Sharpen)...
              </button>
              <button 
                onClick={() => handleAction(() => onOpenFilterDialog('pixelate'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Pixelate / Mosaic...
              </button>
              <button 
                onClick={() => handleAction(() => onOpenFilterDialog('noise'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Add Grain & Noise...
              </button>
              <button 
                onClick={() => handleAction(() => onOpenFilterDialog('vignette'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Lens Vignette...
              </button>
              <button 
                onClick={() => handleAction(() => onOpenFilterDialog('edge-detect'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Find Edges (Stylize)...
              </button>
              <button 
                onClick={() => handleAction(() => onOpenFilterDialog('emboss'))} 
                className="w-full px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                Emboss Relief...
              </button>
            </div>
          )}
        </div>

        {/* Select Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('select')}
            className={`px-2.5 py-1 rounded transition-colors ${openMenu === 'select' ? 'bg-[#3b3b3b] text-white' : 'hover:bg-[#323232] text-[#cccccc]'}`}
          >
            Select
          </button>
          {openMenu === 'select' && (
            <div className="absolute top-full left-0 mt-0.5 w-52 bg-[#282828] border border-[#3e3e3e] shadow-2xl py-1 rounded-sm z-50">
              <button 
                onClick={() => handleAction(onSelectAll)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Select All</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+A</span>
              </button>
              <button 
                onClick={() => handleAction(onDeselect)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Deselect</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+D</span>
              </button>
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('view')}
            className={`px-2.5 py-1 rounded transition-colors ${openMenu === 'view' ? 'bg-[#3b3b3b] text-white' : 'hover:bg-[#323232] text-[#cccccc]'}`}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#282828] border border-[#3e3e3e] shadow-2xl py-1 rounded-sm z-50">
              <button 
                onClick={() => handleAction(onZoomIn)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Zoom In</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl++</span>
              </button>
              <button 
                onClick={() => handleAction(onZoomOut)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Zoom Out</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+-</span>
              </button>
              <button 
                onClick={() => handleAction(onFitScreen)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>Fit on Screen</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+0</span>
              </button>
              <button 
                onClick={() => handleAction(onActualPixels)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span>100% Actual Pixels</span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+1</span>
              </button>
              <div className="h-[1px] bg-[#3a3a3a] my-1" />
              <button 
                onClick={() => handleAction(onToggleRulers)} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span className="flex items-center gap-2">
                  {showRulers ? <Check className="w-3.5 h-3.5 text-[#00a8ff]" /> : <span className="w-3.5" />}
                  Rulers
                </span>
                <span className="text-[10px] text-[#888888] font-mono">Ctrl+R</span>
              </button>
            </div>
          )}
        </div>

        {/* Window Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('window')}
            className={`px-2.5 py-1 rounded transition-colors ${openMenu === 'window' ? 'bg-[#3b3b3b] text-white' : 'hover:bg-[#323232] text-[#cccccc]'}`}
          >
            Window
          </button>
          {openMenu === 'window' && (
            <div className="absolute top-full left-0 mt-0.5 w-52 bg-[#282828] border border-[#3e3e3e] shadow-2xl py-1 rounded-sm z-50">
              <button 
                onClick={() => handleAction(() => setActivePanelTab('layers'))} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span className="flex items-center gap-2">
                  {activePanelTab === 'layers' ? <Check className="w-3.5 h-3.5 text-[#00a8ff]" /> : <span className="w-3.5" />}
                  Layers
                </span>
                <span className="text-[10px] text-[#888888] font-mono">F7</span>
              </button>
              <button 
                onClick={() => handleAction(() => setActivePanelTab('adjustments'))} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span className="flex items-center gap-2">
                  {activePanelTab === 'adjustments' ? <Check className="w-3.5 h-3.5 text-[#00a8ff]" /> : <span className="w-3.5" />}
                  Adjustments
                </span>
              </button>
              <button 
                onClick={() => handleAction(() => setActivePanelTab('swatches'))} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span className="flex items-center gap-2">
                  {activePanelTab === 'swatches' ? <Check className="w-3.5 h-3.5 text-[#00a8ff]" /> : <span className="w-3.5" />}
                  Swatches Panel
                </span>
                <span className="text-[10px] text-[#888888] font-mono">F6</span>
              </button>
              <button 
                onClick={() => handleAction(() => setActivePanelTab('color'))} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span className="flex items-center gap-2">
                  {activePanelTab === 'color' ? <Check className="w-3.5 h-3.5 text-[#00a8ff]" /> : <span className="w-3.5" />}
                  Color Mixer
                </span>
              </button>
              <button 
                onClick={() => handleAction(() => setActivePanelTab('history'))} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span className="flex items-center gap-2">
                  {activePanelTab === 'history' ? <Check className="w-3.5 h-3.5 text-[#00a8ff]" /> : <span className="w-3.5" />}
                  History
                </span>
              </button>
              <button 
                onClick={() => handleAction(() => setActivePanelTab('generative'))} 
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#005fb8] hover:text-white text-left transition-colors"
              >
                <span className="flex items-center gap-2">
                  {activePanelTab === 'generative' ? <Check className="w-3.5 h-3.5 text-[#00a8ff]" /> : <span className="w-3.5" />}
                  Firefly Generative AI
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Active Document Tab Indicator */}
      <div className="flex items-center gap-2 bg-[#1c1c1c] px-3 py-1 rounded border border-[#333333] text-[11px] text-[#b0b0b0]">
        <FileImage className="w-3.5 h-3.5 text-[#00a8ff]" />
        <span className="font-medium text-[#e2e2e2]">{documentName}</span>
        <span className="text-[#666666]">@</span>
        <span className="font-mono text-[#00a8ff] tabular-nums">{Math.round(zoom * 100)}%</span>
        <span className="text-[#666666]">(RGB/8)</span>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1.5 rounded transition-colors ${canUndo ? 'hover:bg-[#363636] text-[#cccccc]' : 'opacity-30 cursor-not-allowed'}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-1.5 rounded transition-colors ${canRedo ? 'hover:bg-[#363636] text-[#cccccc]' : 'opacity-30 cursor-not-allowed'}`}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-[#3a3a3a] mx-1" />

        <button
          onClick={onOpenGenerativeFill}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gradient-to-r from-[#0369a1] to-[#0284c7] hover:from-[#0284c7] hover:to-[#38bdf8] text-white font-medium shadow-sm transition-all text-[11px]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#e0f2fe]" />
          <span>Generative AI</span>
        </button>

        <button
          onClick={onOpenPCExport || onExport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#222b35] hover:bg-[#2c3744] border border-[#234975] text-[#93c5fd] hover:text-white font-medium transition-colors text-[11px]"
          title="Install app on Windows PC or export executable package (.exe / .bat)"
        >
          <Monitor className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>PC (.exe)</span>
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#005fb8] hover:bg-[#0070d6] text-white font-medium transition-colors text-[11px]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};
