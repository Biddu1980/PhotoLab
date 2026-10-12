import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  FolderPlus, 
  Download, 
  Upload, 
  Search, 
  Check, 
  Copy, 
  Edit3, 
  Grid, 
  List, 
  Palette, 
  MoreHorizontal,
  ArrowRightLeft,
  ChevronDown
} from 'lucide-react';

export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
}

export interface SwatchPalette {
  id: string;
  name: string;
  isDefault?: boolean;
  swatches: ColorSwatch[];
}

const DEFAULT_PALETTES: SwatchPalette[] = [
  {
    id: 'essentials',
    name: 'PhotoLab Essentials',
    isDefault: true,
    swatches: [
      { id: 'e-1', name: 'Pure White', hex: '#ffffff' },
      { id: 'e-2', name: 'Studio Black', hex: '#000000' },
      { id: 'e-3', name: 'Charcoal Slate', hex: '#1e293b' },
      { id: 'e-4', name: 'PhotoLab Cyan', hex: '#00a8ff' },
      { id: 'e-5', name: 'Sky Cerulean', hex: '#38bdf8' },
      { id: 'e-6', name: 'Royal Indigo', hex: '#4f46e5' },
      { id: 'e-7', name: 'Crimson Ruby', hex: '#ef4444' },
      { id: 'e-8', name: 'Vibrant Amber', hex: '#f59e0b' },
      { id: 'e-9', name: 'Emerald Mint', hex: '#10b981' },
      { id: 'e-10', name: 'Bright Magenta', hex: '#ec4899' },
      { id: 'e-11', name: 'Electric Violet', hex: '#8b5cf6' },
      { id: 'e-12', name: 'Neutral Gray', hex: '#64748b' },
    ],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk & Neon',
    isDefault: true,
    swatches: [
      { id: 'cp-1', name: 'Neon Cyan', hex: '#00f0ff' },
      { id: 'cp-2', name: 'Laser Magenta', hex: '#ff0055' },
      { id: 'cp-3', name: 'Acid Lime', hex: '#00ff66' },
      { id: 'cp-4', name: 'Cyber Gold', hex: '#ffe600' },
      { id: 'cp-5', name: 'Deep Abyss', hex: '#090514' },
      { id: 'cp-6', name: 'Night Grid Violet', hex: '#1e1b4b' },
      { id: 'cp-7', name: 'Holo Pink', hex: '#f43f5e' },
      { id: 'cp-8', name: 'Tokyo Sunrise', hex: '#fb923c' },
      { id: 'cp-9', name: 'Plasma Blue', hex: '#0284c7' },
      { id: 'cp-10', name: 'Matrix Green', hex: '#22c55e' },
    ],
  },
  {
    id: 'cinematic',
    name: 'Cinematic Teal & Orange',
    isDefault: true,
    swatches: [
      { id: 'cn-1', name: 'Deep Teal Shadow', hex: '#0f3844' },
      { id: 'cn-2', name: 'Moody Cyan', hex: '#0e7490' },
      { id: 'cn-3', name: 'Golden Hour Flare', hex: '#f59e0b' },
      { id: 'cn-4', name: 'Sunset Tangerine', hex: '#ea580c' },
      { id: 'cn-5', name: 'Film Dusk Blue', hex: '#1e293b' },
      { id: 'cn-6', name: 'Warm Highlight', hex: '#fef3c7' },
      { id: 'cn-7', name: 'Burnt Sienna', hex: '#9a3412' },
      { id: 'cn-8', name: 'Shadow Charcoal', hex: '#111827' },
    ],
  },
  {
    id: 'portrait',
    name: 'Portrait & Skin Tones',
    isDefault: true,
    swatches: [
      { id: 'p-1', name: 'Porcelain Fair', hex: '#ffede0' },
      { id: 'p-2', name: 'Warm Ivory', hex: '#fed7aa' },
      { id: 'p-3', name: 'Soft Sand', hex: '#fcd34d' },
      { id: 'p-4', name: 'Honey Amber', hex: '#d97706' },
      { id: 'p-5', name: 'Rich Caramel', hex: '#b45309' },
      { id: 'p-6', name: 'Deep Espresso', hex: '#451a03' },
      { id: 'p-7', name: 'Rose Blush', hex: '#f472b6' },
      { id: 'p-8', name: 'Studio Highlight', hex: '#fff7ed' },
    ],
  },
  {
    id: 'pastel',
    name: 'Pastel Dreamscape',
    isDefault: true,
    swatches: [
      { id: 'ps-1', name: 'Powder Lavender', hex: '#e9d5ff' },
      { id: 'ps-2', name: 'Baby Cloud Blue', hex: '#bae6fd' },
      { id: 'ps-3', name: 'Mint Sorbet', hex: '#bbf7d0' },
      { id: 'ps-4', name: 'Peach Cream', hex: '#fed7aa' },
      { id: 'ps-5', name: 'Soft Rose Petal', hex: '#fecdd3' },
      { id: 'ps-6', name: 'Buttercup', hex: '#fef08a' },
      { id: 'ps-7', name: 'Frosted Lilac', hex: '#fae8ff' },
      { id: 'ps-8', name: 'Seafoam Mist', hex: '#ccfbf1' },
    ],
  },
];

const LOCAL_STORAGE_KEY = 'photolab_swatch_palettes_v1';

interface SwatchesPanelProps {
  foregroundColor: string;
  backgroundColor: string;
  onChangeForegroundColor: (color: string) => void;
  onChangeBackgroundColor?: (color: string) => void;
}

export const SwatchesPanel: React.FC<SwatchesPanelProps> = ({
  foregroundColor,
  backgroundColor,
  onChangeForegroundColor,
  onChangeBackgroundColor,
}) => {
  // Palettes state initialized from localStorage if available
  const [palettes, setPalettes] = useState<SwatchPalette[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_PALETTES;
  });

  const [activePaletteId, setActivePaletteId] = useState<string>(DEFAULT_PALETTES[0].id);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // New Swatch Input state
  const [isAddingSwatch, setIsAddingSwatch] = useState(false);
  const [newSwatchName, setNewSwatchName] = useState('');
  const [newSwatchHex, setNewSwatchHex] = useState(foregroundColor);

  // New Palette Input state
  const [isCreatingPalette, setIsCreatingPalette] = useState(false);
  const [newPaletteName, setNewPaletteName] = useState('');

  // Editing Swatch state
  const [editingSwatch, setEditingSwatch] = useState<{ id: string; name: string } | null>(null);

  // Persist palettes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(palettes));
    } catch {
      // ignore storage errors
    }
  }, [palettes]);

  // Keep new swatch hex in sync with current foreground color when opened
  useEffect(() => {
    if (isAddingSwatch) {
      setNewSwatchHex(foregroundColor);
      if (!newSwatchName) {
        setNewSwatchName(`Color ${foregroundColor.toUpperCase()}`);
      }
    }
  }, [foregroundColor, isAddingSwatch]);

  const activePalette = palettes.find((p) => p.id === activePaletteId) || palettes[0];

  // Filtered swatches by search
  const filteredSwatches = activePalette.swatches.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.hex.toLowerCase().includes(q);
  });

  // Create New Palette
  const handleCreatePalette = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaletteName.trim()) return;

    const newPal: SwatchPalette = {
      id: `pal-${Date.now()}`,
      name: newPaletteName.trim(),
      isDefault: false,
      swatches: [
        { id: `sw-${Date.now()}-1`, name: 'Current Color', hex: foregroundColor },
      ],
    };

    setPalettes((prev) => [...prev, newPal]);
    setActivePaletteId(newPal.id);
    setNewPaletteName('');
    setIsCreatingPalette(false);
  };

  // Delete Custom Palette
  const handleDeletePalette = (id: string) => {
    if (palettes.length <= 1) return;
    const target = palettes.find((p) => p.id === id);
    if (target?.isDefault) {
      // Confirmation for default
      if (!window.confirm(`Delete palette "${target.name}"?`)) return;
    }
    const remaining = palettes.filter((p) => p.id !== id);
    setPalettes(remaining);
    setActivePaletteId(remaining[0].id);
  };

  // Add Swatch to Active Palette
  const handleAddSwatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSwatchHex) return;

    const swatch: ColorSwatch = {
      id: `sw-${Date.now()}`,
      name: newSwatchName.trim() || `Color ${newSwatchHex.toUpperCase()}`,
      hex: newSwatchHex,
    };

    setPalettes((prev) =>
      prev.map((p) =>
        p.id === activePaletteId
          ? { ...p, swatches: [swatch, ...p.swatches] }
          : p
      )
    );

    setIsAddingSwatch(false);
    setNewSwatchName('');
  };

  // Delete Swatch
  const handleDeleteSwatch = (swatchId: string) => {
    setPalettes((prev) =>
      prev.map((p) =>
        p.id === activePaletteId
          ? { ...p, swatches: p.swatches.filter((s) => s.id !== swatchId) }
          : p
      )
    );
  };

  // Rename Swatch
  const handleSaveRenameSwatch = (swatchId: string) => {
    if (!editingSwatch) return;
    setPalettes((prev) =>
      prev.map((p) =>
        p.id === activePaletteId
          ? {
              ...p,
              swatches: p.swatches.map((s) =>
                s.id === swatchId ? { ...s, name: editingSwatch.name } : s
              ),
            }
          : p
      )
    );
    setEditingSwatch(null);
  };

  // Copy HEX Code
  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1400);
  };

  // Export Active Palette as JSON
  const handleExportPalette = () => {
    const data = JSON.stringify(activePalette, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePalette.name.replace(/\s+/g, '_')}_Palette.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Palette from JSON
  const handleImportPalette = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.name && Array.isArray(parsed.swatches)) {
          const imported: SwatchPalette = {
            id: `pal-import-${Date.now()}`,
            name: parsed.name,
            isDefault: false,
            swatches: parsed.swatches.map((s: any, idx: number) => ({
              id: `sw-${Date.now()}-${idx}`,
              name: s.name || `Color ${idx + 1}`,
              hex: s.hex || '#000000',
            })),
          };
          setPalettes((prev) => [...prev, imported]);
          setActivePaletteId(imported.id);
        }
      } catch {
        alert('Invalid palette file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#252525] text-[11px] text-[#cccccc] select-none">
      {/* Top Header: Active Palette Selector & Actions */}
      <div className="p-2.5 bg-[#2a2a2a] border-b border-[#383838] flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] text-[#888888] uppercase font-semibold">Palette:</span>
          
          <div className="flex-1 relative">
            <select
              value={activePaletteId}
              onChange={(e) => setActivePaletteId(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-[#404040] rounded px-2 py-1 text-white text-[11px] appearance-none pr-6 outline-none focus:border-[#00a8ff]"
            >
              {palettes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.swatches.length})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#888888] absolute right-2 top-2 pointer-events-none" />
          </div>

          {/* New Palette Button */}
          <button
            onClick={() => setIsCreatingPalette(true)}
            title="Create New Palette"
            className="p-1 rounded bg-[#383838] hover:bg-[#484848] text-[#00a8ff] transition-colors shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          {/* Delete Palette Button (only non-single) */}
          {palettes.length > 1 && (
            <button
              onClick={() => handleDeletePalette(activePaletteId)}
              title="Delete Active Palette"
              className="p-1 rounded bg-[#383838] hover:bg-red-900/50 text-[#888888] hover:text-red-300 transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Create Palette Inline Dialog */}
        {isCreatingPalette && (
          <form onSubmit={handleCreatePalette} className="flex items-center gap-1.5 bg-[#1e1e1e] p-1.5 rounded border border-[#00a8ff]/50">
            <input
              type="text"
              autoFocus
              placeholder="Palette Name..."
              value={newPaletteName}
              onChange={(e) => setNewPaletteName(e.target.value)}
              className="flex-1 bg-[#111111] border border-[#444444] rounded px-2 py-0.5 text-white text-[11px] outline-none"
            />
            <button
              type="submit"
              className="px-2 py-0.5 bg-[#00a8ff] hover:bg-[#0092dd] text-white rounded font-medium text-[10px]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingPalette(false)}
              className="px-1.5 py-0.5 bg-[#333333] text-[#aaaaaa] rounded text-[10px]"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Toolbar: Search, Add Swatch, View Toggle, Export/Import */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          {/* Search box */}
          <div className="flex-1 relative flex items-center">
            <Search className="w-3 h-3 text-[#666666] absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search colors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-[#3e3e3e] rounded pl-6 pr-2 py-0.5 text-white text-[10px] outline-none placeholder-[#555555]"
            />
          </div>

          {/* Add Current Color Swatch */}
          <button
            onClick={() => {
              setIsAddingSwatch(true);
              setNewSwatchName('');
              setNewSwatchHex(foregroundColor);
            }}
            title="Save Current Foreground Color to Palette"
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#005fb8] hover:bg-[#0070d6] text-white font-medium text-[10px] shrink-0 transition-colors shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Add Color</span>
          </button>

          {/* View mode toggle: Grid vs List */}
          <div className="flex items-center bg-[#1e1e1e] border border-[#3e3e3e] rounded p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${viewMode === 'grid' ? 'bg-[#3b3b3b] text-white' : 'text-[#777777]'}`}
              title="Grid View"
            >
              <Grid className="w-3 h-3" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-[#3b3b3b] text-white' : 'text-[#777777]'}`}
              title="List View"
            >
              <List className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Add New Swatch Form Dialog */}
      {isAddingSwatch && (
        <form onSubmit={handleAddSwatch} className="p-2.5 bg-[#202020] border-b border-[#383838] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white text-[10px]">Save Swatch to Palette</span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-xs border border-[#555555]"
                style={{ backgroundColor: newSwatchHex }}
              />
              <span className="font-mono text-[10px] text-[#aaaaaa]">{newSwatchHex.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Swatch Name (e.g. Electric Cyan)"
              value={newSwatchName}
              onChange={(e) => setNewSwatchName(e.target.value)}
              className="flex-1 bg-[#151515] border border-[#444444] rounded px-2 py-1 text-white text-[11px] outline-none focus:border-[#00a8ff]"
            />
            <input
              type="color"
              value={newSwatchHex}
              onChange={(e) => setNewSwatchHex(e.target.value)}
              className="w-7 h-7 rounded border border-[#555555] bg-transparent cursor-pointer"
              title="Pick Color"
            />
          </div>

          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsAddingSwatch(false)}
              className="px-2.5 py-1 bg-[#333333] hover:bg-[#3d3d3d] text-[#cccccc] rounded text-[10px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-[#00a8ff] hover:bg-[#0092dd] text-white font-medium rounded text-[10px]"
            >
              Add to Palette
            </button>
          </div>
        </form>
      )}

      {/* Swatches Main Display Area */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredSwatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 text-center text-[#777777]">
            <Palette className="w-6 h-6 mb-2 opacity-40" />
            <p className="text-[11px]">No swatches found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-[#00a8ff] mt-1 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-6 gap-1.5 p-1 bg-[#1e1e1e] rounded border border-[#333333]">
            {filteredSwatches.map((swatch) => (
              <div key={swatch.id} className="relative group">
                <button
                  onClick={() => onChangeForegroundColor(swatch.hex)}
                  title={`${swatch.name}\n${swatch.hex.toUpperCase()}\nClick: Set Foreground\nRight-click: Context Menu`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (onChangeBackgroundColor) {
                      onChangeBackgroundColor(swatch.hex);
                    }
                  }}
                  className="w-full aspect-square rounded-xs border border-[#444444] hover:scale-110 hover:border-white transition-all shadow-sm block relative overflow-hidden"
                  style={{ backgroundColor: swatch.hex }}
                >
                  {/* Subtle active border indicator if matches foreground */}
                  {foregroundColor.toLowerCase() === swatch.hex.toLowerCase() && (
                    <div className="absolute inset-0 border-2 border-white pointer-events-none" />
                  )}
                </button>

                {/* Floating Quick Action Overlay on Hover */}
                <div className="absolute bottom-0 right-0 hidden group-hover:flex bg-[#111111]/90 rounded-tl p-0.5 z-20 gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyHex(swatch.hex);
                    }}
                    title="Copy HEX"
                    className="p-0.5 hover:text-[#00a8ff] text-[#aaaaaa]"
                  >
                    {copiedHex === swatch.hex ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSwatch(swatch.id);
                    }}
                    title="Delete Swatch"
                    className="p-0.5 hover:text-red-400 text-[#aaaaaa]"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="flex flex-col gap-1">
            {filteredSwatches.map((swatch) => {
              const isEditing = editingSwatch?.id === swatch.id;

              return (
                <div
                  key={swatch.id}
                  onClick={() => onChangeForegroundColor(swatch.hex)}
                  className="flex items-center justify-between p-1.5 rounded bg-[#1e1e1e] border border-[#333333] hover:bg-[#282828] cursor-pointer group transition-colors"
                >
                  {/* Left: Swatch Color Chip & Name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                    <div
                      className="w-5 h-5 rounded-xs border border-[#555555] shrink-0 shadow-sm relative"
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {foregroundColor.toLowerCase() === swatch.hex.toLowerCase() && (
                        <div className="absolute inset-0 border border-white pointer-events-none" />
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingSwatch.name}
                          onChange={(e) => setEditingSwatch({ ...editingSwatch, name: e.target.value })}
                          className="bg-[#111111] border border-[#00a8ff] rounded px-1.5 py-0.5 text-white text-[10px] flex-1 outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRenameSwatch(swatch.id);
                            if (e.key === 'Escape') setEditingSwatch(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveRenameSwatch(swatch.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col truncate">
                        <span className="text-[11px] font-medium text-white truncate">{swatch.name}</span>
                        <span className="text-[9px] font-mono text-[#888888]">{swatch.hex.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    {onChangeBackgroundColor && (
                      <button
                        onClick={() => onChangeBackgroundColor(swatch.hex)}
                        title="Set as Background Color"
                        className="p-1 text-[#888888] hover:text-white hover:bg-[#333333] rounded"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyHex(swatch.hex)}
                      title="Copy HEX Code"
                      className="p-1 text-[#888888] hover:text-[#00a8ff] hover:bg-[#333333] rounded"
                    >
                      {copiedHex === swatch.hex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => setEditingSwatch({ id: swatch.id, name: swatch.name })}
                      title="Rename Swatch"
                      className="p-1 text-[#888888] hover:text-white hover:bg-[#333333] rounded"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteSwatch(swatch.id)}
                      title="Delete Swatch"
                      className="p-1 text-[#888888] hover:text-red-400 hover:bg-[#333333] rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Footer: Swatch Count, Export & Import */}
      <div className="h-8 bg-[#232323] border-t border-[#383838] px-2.5 flex items-center justify-between text-[10px] text-[#777777] shrink-0 font-mono">
        <span>{filteredSwatches.length} Swatches</span>

        <div className="flex items-center gap-1.5">
          {/* Hidden Import file input */}
          <label className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
            <Upload className="w-3 h-3" />
            <span>Import</span>
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportPalette}
            />
          </label>

          <span className="text-[#444444]">|</span>

          {/* Export palette */}
          <button
            onClick={handleExportPalette}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="Export Current Palette as JSON"
          >
            <Download className="w-3 h-3" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};
