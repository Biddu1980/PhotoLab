import React, { useState, useRef, useEffect } from 'react';
import { ToolType } from '../types/photoshop';
import { 
  Move, 
  Square, 
  Circle, 
  Lasso, 
  Wand2, 
  Crop, 
  Pipette, 
  Stamp, 
  Paintbrush, 
  Pencil, 
  Eraser, 
  PaintBucket, 
  Sparkles, 
  Droplet, 
  Sun, 
  Moon,
  Type, 
  Star, 
  Hand, 
  ZoomIn, 
  ArrowLeftRight, 
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Minimize2,
  PenTool,
  MousePointer,
  Compass,
  Layers,
  Scissors,
  Bookmark,
  Activity,
  Spline,
  Folder,
  Minus,
  Target
} from 'lucide-react';

interface ToolBarProps {
  currentTool: ToolType;
  setTool: (tool: ToolType) => void;
  foregroundColor: string;
  backgroundColor: string;
  onSwapColors: () => void;
  onResetColors: () => void;
  onChangeForegroundColor: (color: string) => void;
  onChangeBackgroundColor: (color: string) => void;
  isQuickMaskActive?: boolean;
  onToggleQuickMask?: () => void;
}

interface ToolGroup {
  id: string;
  defaultTool: ToolType;
  tools: {
    id: ToolType;
    name: string;
    shortcut: string;
    icon: React.ReactNode;
  }[];
}

export const ToolBar: React.FC<ToolBarProps> = ({
  currentTool,
  setTool,
  foregroundColor,
  backgroundColor,
  onSwapColors,
  onResetColors,
  onChangeForegroundColor,
  onChangeBackgroundColor,
  isQuickMaskActive = false,
  onToggleQuickMask,
}) => {
  // 1-column vs 2-column layout toggle
  const [isTwoColumn, setIsTwoColumn] = useState<boolean>(false);
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);
  
  // Track active sub-tool per slot
  const [slotActiveTool, setSlotActiveTool] = useState<Record<string, ToolType>>({});

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Exact Photoshop Tools Hierarchy
  const toolGroups: ToolGroup[] = [
    // 1. Move & Artboard (V)
    {
      id: 'group-move',
      defaultTool: 'move',
      tools: [
        { id: 'move', name: 'Move Tool', shortcut: 'V', icon: <Move className="w-3.5 h-3.5" /> },
        { id: 'artboard', name: 'Artboard Tool', shortcut: 'V', icon: <Maximize2 className="w-3.5 h-3.5" /> },
      ],
    },
    // 2. Marquee Tools (M)
    {
      id: 'group-marquee',
      defaultTool: 'marquee-rect',
      tools: [
        { id: 'marquee-rect', name: 'Rectangular Marquee Tool', shortcut: 'M', icon: <Square className="w-3.5 h-3.5" /> },
        { id: 'marquee-ellipse', name: 'Elliptical Marquee Tool', shortcut: 'M', icon: <Circle className="w-3.5 h-3.5" /> },
        { id: 'marquee-single-row', name: 'Single Row Marquee Tool', shortcut: 'M', icon: <Minus className="w-3.5 h-3.5" /> },
        { id: 'marquee-single-col', name: 'Single Column Marquee Tool', shortcut: 'M', icon: <Minus className="w-3.5 h-3.5 rotate-90" /> },
      ],
    },
    // 3. Lasso Tools (L)
    {
      id: 'group-lasso',
      defaultTool: 'lasso',
      tools: [
        { id: 'lasso', name: 'Lasso Tool', shortcut: 'L', icon: <Lasso className="w-3.5 h-3.5" /> },
        { id: 'lasso-polygon', name: 'Polygonal Lasso Tool', shortcut: 'L', icon: <Spline className="w-3.5 h-3.5" /> },
        { id: 'lasso-magnetic', name: 'Magnetic Lasso Tool', shortcut: 'L', icon: <Compass className="w-3.5 h-3.5" /> },
      ],
    },
    // 4. Object & Wand Tools (W)
    {
      id: 'group-wand',
      defaultTool: 'magic-wand',
      tools: [
        { id: 'magic-wand', name: 'Magic Wand Tool', shortcut: 'W', icon: <Wand2 className="w-3.5 h-3.5" /> },
        { id: 'quick-select', name: 'Quick Selection Tool', shortcut: 'W', icon: <Paintbrush className="w-3.5 h-3.5" /> },
        { id: 'object-select', name: 'Object Selection Tool', shortcut: 'W', icon: <Square className="w-3.5 h-3.5 border-dashed" /> },
      ],
    },
    // 5. Crop & Slice (C)
    {
      id: 'group-crop',
      defaultTool: 'crop',
      tools: [
        { id: 'crop', name: 'Crop Tool', shortcut: 'C', icon: <Crop className="w-3.5 h-3.5" /> },
        { id: 'perspective-crop', name: 'Perspective Crop Tool', shortcut: 'C', icon: <Maximize2 className="w-3.5 h-3.5" /> },
        { id: 'slice', name: 'Slice Tool', shortcut: 'C', icon: <Scissors className="w-3.5 h-3.5" /> },
      ],
    },
    // 6. Eyedropper & Measure (I)
    {
      id: 'group-eyedropper',
      defaultTool: 'eyedropper',
      tools: [
        { id: 'eyedropper', name: 'Eyedropper Tool', shortcut: 'I', icon: <Pipette className="w-3.5 h-3.5" /> },
        { id: 'color-sampler', name: 'Color Sampler Tool', shortcut: 'I', icon: <Target className="w-3.5 h-3.5" /> },
        { id: 'ruler-tool', name: 'Ruler Tool', shortcut: 'I', icon: <Minus className="w-3.5 h-3.5 rotate-45" /> },
        { id: 'note-tool', name: 'Note Tool', shortcut: 'I', icon: <Bookmark className="w-3.5 h-3.5" /> },
      ],
    },
    // 7. Remove Tool, Spot Healing & Patch (J)
    {
      id: 'group-healing',
      defaultTool: 'remove-tool',
      tools: [
        { id: 'remove-tool', name: 'Remove Tool (AI Object Eraser)', shortcut: 'J', icon: <Sparkles className="w-3.5 h-3.5 text-[#ec4899]" /> },
        { id: 'spot-healing', name: 'Spot Healing Brush Tool', shortcut: 'J', icon: <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" /> },
        { id: 'healing-brush', name: 'Healing Brush Tool', shortcut: 'J', icon: <Paintbrush className="w-3.5 h-3.5" /> },
        { id: 'patch', name: 'Patch Tool', shortcut: 'J', icon: <Spline className="w-3.5 h-3.5" /> },
        { id: 'content-aware-move', name: 'Content-Aware Move Tool', shortcut: 'J', icon: <Move className="w-3.5 h-3.5" /> },
        { id: 'red-eye', name: 'Red Eye Tool', shortcut: 'J', icon: <Activity className="w-3.5 h-3.5" /> },
      ],
    },
    // 8. Brush Tools (B)
    {
      id: 'group-brush',
      defaultTool: 'brush',
      tools: [
        { id: 'brush', name: 'Brush Tool', shortcut: 'B', icon: <Paintbrush className="w-3.5 h-3.5" /> },
        { id: 'pencil', name: 'Pencil Tool', shortcut: 'B', icon: <Pencil className="w-3.5 h-3.5" /> },
        { id: 'color-replacement', name: 'Color Replacement Tool', shortcut: 'B', icon: <Pipette className="w-3.5 h-3.5" /> },
        { id: 'mixer-brush', name: 'Mixer Brush Tool', shortcut: 'B', icon: <Droplet className="w-3.5 h-3.5" /> },
      ],
    },
    // 9. Clone Stamp (S)
    {
      id: 'group-stamp',
      defaultTool: 'clone-stamp',
      tools: [
        { id: 'clone-stamp', name: 'Clone Stamp Tool', shortcut: 'S', icon: <Stamp className="w-3.5 h-3.5" /> },
        { id: 'pattern-stamp', name: 'Pattern Stamp Tool', shortcut: 'S', icon: <Square className="w-3.5 h-3.5" /> },
      ],
    },
    // 10. History Brush (Y)
    {
      id: 'group-history',
      defaultTool: 'history-brush',
      tools: [
        { id: 'history-brush', name: 'History Brush Tool', shortcut: 'Y', icon: <Paintbrush className="w-3.5 h-3.5 text-[#38bdf8]" /> },
        { id: 'art-history-brush', name: 'Art History Brush Tool', shortcut: 'Y', icon: <Sparkles className="w-3.5 h-3.5" /> },
      ],
    },
    // 11. Eraser Tools (E)
    {
      id: 'group-eraser',
      defaultTool: 'eraser',
      tools: [
        { id: 'eraser', name: 'Eraser Tool', shortcut: 'E', icon: <Eraser className="w-3.5 h-3.5" /> },
        { id: 'background-eraser', name: 'Background Eraser Tool', shortcut: 'E', icon: <Scissors className="w-3.5 h-3.5" /> },
        { id: 'magic-eraser', name: 'Magic Eraser Tool', shortcut: 'E', icon: <Wand2 className="w-3.5 h-3.5" /> },
      ],
    },
    // 12. Gradient & Paint Bucket (G)
    {
      id: 'group-bucket',
      defaultTool: 'paint-bucket',
      tools: [
        { id: 'paint-bucket', name: 'Paint Bucket Tool', shortcut: 'G', icon: <PaintBucket className="w-3.5 h-3.5" /> },
        { id: 'gradient', name: 'Gradient Tool', shortcut: 'G', icon: <Sparkles className="w-3.5 h-3.5" /> },
      ],
    },
    // 13. Blur, Sharpen, Smudge
    {
      id: 'group-blur',
      defaultTool: 'blur-tool',
      tools: [
        { id: 'blur-tool', name: 'Blur Tool', shortcut: 'R', icon: <Droplet className="w-3.5 h-3.5" /> },
        { id: 'sharpen-tool', name: 'Sharpen Tool', shortcut: 'R', icon: <Sparkles className="w-3.5 h-3.5" /> },
        { id: 'smudge-tool', name: 'Smudge Tool', shortcut: 'R', icon: <Hand className="w-3.5 h-3.5" /> },
      ],
    },
    // 14. Dodge, Burn, Sponge (O)
    {
      id: 'group-tone',
      defaultTool: 'dodge',
      tools: [
        { id: 'dodge', name: 'Dodge Tool', shortcut: 'O', icon: <Sun className="w-3.5 h-3.5" /> },
        { id: 'burn', name: 'Burn Tool', shortcut: 'O', icon: <Moon className="w-3.5 h-3.5" /> },
        { id: 'sponge', name: 'Sponge Tool', shortcut: 'O', icon: <Droplet className="w-3.5 h-3.5" /> },
      ],
    },
    // 15. Pen Tools (P)
    {
      id: 'group-pen',
      defaultTool: 'pen',
      tools: [
        { id: 'pen', name: 'Pen Tool', shortcut: 'P', icon: <PenTool className="w-3.5 h-3.5" /> },
        { id: 'freeform-pen', name: 'Freeform Pen Tool', shortcut: 'P', icon: <Spline className="w-3.5 h-3.5" /> },
        { id: 'curvature-pen', name: 'Curvature Pen Tool', shortcut: 'P', icon: <Spline className="w-3.5 h-3.5" /> },
      ],
    },
    // 16. Type Tools (T)
    {
      id: 'group-type',
      defaultTool: 'text',
      tools: [
        { id: 'text', name: 'Horizontal Type Tool', shortcut: 'T', icon: <Type className="w-3.5 h-3.5" /> },
        { id: 'text-vertical', name: 'Vertical Type Tool', shortcut: 'T', icon: <Type className="w-3.5 h-3.5 rotate-90" /> },
      ],
    },
    // 17. Path Selection (A)
    {
      id: 'group-path',
      defaultTool: 'path-select',
      tools: [
        { id: 'path-select', name: 'Path Selection Tool', shortcut: 'A', icon: <MousePointer className="w-3.5 h-3.5 text-white" /> },
        { id: 'direct-select', name: 'Direct Selection Tool', shortcut: 'A', icon: <MousePointer className="w-3.5 h-3.5 text-[#888888]" /> },
      ],
    },
    // 18. Shape Tools (U)
    {
      id: 'group-shape',
      defaultTool: 'shape-rect',
      tools: [
        { id: 'shape-rect', name: 'Rectangle Tool', shortcut: 'U', icon: <Square className="w-3.5 h-3.5" /> },
        { id: 'shape-rounded-rect', name: 'Rounded Rectangle Tool', shortcut: 'U', icon: <Square className="w-3.5 h-3.5 rounded-xs" /> },
        { id: 'shape-ellipse', name: 'Ellipse Tool', shortcut: 'U', icon: <Circle className="w-3.5 h-3.5" /> },
        { id: 'shape-polygon', name: 'Polygon / Star Tool', shortcut: 'U', icon: <Star className="w-3.5 h-3.5" /> },
        { id: 'shape-line', name: 'Line Tool', shortcut: 'U', icon: <Minus className="w-3.5 h-3.5" /> },
        { id: 'custom-shape', name: 'Custom Shape Tool', shortcut: 'U', icon: <Star className="w-3.5 h-3.5" /> },
      ],
    },
    // 19. Hand & Rotate (H)
    {
      id: 'group-hand',
      defaultTool: 'hand',
      tools: [
        { id: 'hand', name: 'Hand Tool', shortcut: 'H', icon: <Hand className="w-3.5 h-3.5" /> },
        { id: 'rotate-view', name: 'Rotate View Tool', shortcut: 'R', icon: <Compass className="w-3.5 h-3.5" /> },
      ],
    },
    // 20. Zoom Tool (Z)
    {
      id: 'group-zoom',
      defaultTool: 'zoom',
      tools: [
        { id: 'zoom', name: 'Zoom Tool', shortcut: 'Z', icon: <ZoomIn className="w-3.5 h-3.5" /> },
      ],
    },
  ];

  // Helper to get active tool for a group
  const getGroupActiveTool = (group: ToolGroup) => {
    // Check if currentTool is inside this group
    const matching = group.tools.find((t) => t.id === currentTool);
    if (matching) return matching;

    // Otherwise use recorded slot subtool or default
    const savedId = slotActiveTool[group.id] || group.defaultTool;
    return group.tools.find((t) => t.id === savedId) || group.tools[0];
  };

  const handleToolClick = (group: ToolGroup) => {
    const active = getGroupActiveTool(group);
    setTool(active.id);
  };

  const handleSubToolSelect = (groupId: string, toolId: ToolType) => {
    setSlotActiveTool((prev) => ({ ...prev, [groupId]: toolId }));
    setTool(toolId);
    setActiveFlyout(null);
  };

  const handleMouseDown = (groupId: string) => {
    pressTimerRef.current = setTimeout(() => {
      setActiveFlyout(groupId);
    }, 280);
  };

  const handleMouseUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
  };

  return (
    <div
      className={`${
        isTwoColumn ? 'w-18' : 'w-10'
      } bg-[#232323] border-r border-[#383838] flex flex-col items-center py-1.5 select-none shrink-0 z-40 transition-all duration-150`}
    >
      {/* Top Toggle for 1-column vs 2-column mode */}
      <button
        onClick={() => setIsTwoColumn(!isTwoColumn)}
        title={isTwoColumn ? 'Single Column Toolbar' : 'Double Column Toolbar'}
        className="w-full flex items-center justify-center py-1 text-[#777777] hover:text-white transition-colors mb-1"
      >
        {isTwoColumn ? (
          <ChevronsLeft className="w-3 h-3" />
        ) : (
          <ChevronsRight className="w-3 h-3" />
        )}
      </button>

      {/* Main Tool Grid */}
      <div
        className={`w-full px-1 ${
          isTwoColumn ? 'grid grid-cols-2 gap-1' : 'flex flex-col gap-0.5 items-center'
        }`}
      >
        {toolGroups.map((group) => {
          const activeItem = getGroupActiveTool(group);
          const isSelected = group.tools.some((t) => t.id === currentTool);
          const hasMultiple = group.tools.length > 1;

          return (
            <div key={group.id} className="relative group/slot">
              <button
                onClick={() => handleToolClick(group)}
                onMouseDown={() => handleMouseDown(group.id)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (hasMultiple) {
                    setActiveFlyout(activeFlyout === group.id ? null : group.id);
                  }
                }}
                title={`${activeItem.name} (${activeItem.shortcut}) - Right-click for options`}
                className={`w-7 h-7 rounded-xs flex items-center justify-center transition-all relative ${
                  isSelected
                    ? 'bg-[#3b3b3b] text-white shadow-inner border border-[#525252]'
                    : 'text-[#9e9e9e] hover:bg-[#2e2e2e] hover:text-[#e0e0e0]'
                }`}
              >
                {activeItem.icon}

                {/* Classic Photoshop bottom-right corner triangle indicator for sub-tools */}
                {hasMultiple && (
                  <span className="absolute bottom-0.5 right-0.5 w-1 h-1 border-b-[2.5px] border-r-[2.5px] border-[#888888] border-t-transparent border-l-transparent" />
                )}
              </button>

              {/* Photoshop Sub-Tool Flyout Menu */}
              {hasMultiple && activeFlyout === group.id && (
                <div
                  className="absolute left-full top-0 ml-1 bg-[#282828] border border-[#3e3e3e] rounded shadow-2xl py-1 z-50 flex flex-col min-w-[210px]"
                  onMouseLeave={() => setActiveFlyout(null)}
                >
                  <div className="px-2.5 py-1 text-[9px] text-[#777777] uppercase font-semibold border-b border-[#353535] mb-0.5">
                    {group.id.replace('group-', '')} Tools
                  </div>
                  {group.tools.map((t) => {
                    const isSubActive = currentTool === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleSubToolSelect(group.id, t.id)}
                        className={`flex items-center justify-between px-3 py-1.5 text-[11px] text-left hover:bg-[#005fb8] hover:text-white transition-colors ${
                          isSubActive ? 'bg-[#383838] text-white font-medium' : 'text-[#cccccc]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 flex items-center justify-center">{t.icon}</span>
                          <span>{t.name}</span>
                        </div>
                        <span className="text-[10px] text-[#888888] font-mono ml-3">{t.shortcut}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-6 h-[1px] bg-[#3a3a3a] my-2" />

      {/* Foreground & Background Color Chips */}
      <div className="flex flex-col items-center">
        <div className="relative w-7 h-7 mb-1">
          {/* Background color chip */}
          <label 
            title="Set Background Color"
            className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-xs border border-[#555555] shadow-sm cursor-pointer block overflow-hidden z-0"
            style={{ backgroundColor }}
          >
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => onChangeBackgroundColor(e.target.value)}
              className="opacity-0 absolute inset-0 cursor-pointer"
            />
          </label>

          {/* Foreground color chip */}
          <label 
            title="Set Foreground Color"
            className="absolute top-0 left-0 w-4.5 h-4.5 rounded-xs border border-[#777777] shadow-md cursor-pointer block overflow-hidden z-10 hover:border-white transition-colors"
            style={{ backgroundColor: foregroundColor }}
          >
            <input
              type="color"
              value={foregroundColor}
              onChange={(e) => onChangeForegroundColor(e.target.value)}
              className="opacity-0 absolute inset-0 cursor-pointer"
            />
          </label>
        </div>

        {/* Small Swap & Reset Color Buttons */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <button
            onClick={onResetColors}
            title="Default Colors (D) - Black / White"
            className="w-3 h-3 flex items-center justify-center text-[#777777] hover:text-white transition-colors"
          >
            <div className="w-2 h-2 border border-[#666666] bg-black relative">
              <div className="w-1 h-1 bg-white absolute top-0 left-0" />
            </div>
          </button>
          <button
            onClick={onSwapColors}
            title="Switch Foreground/Background Colors (X)"
            className="w-3 h-3 flex items-center justify-center text-[#777777] hover:text-white transition-colors"
          >
            <ArrowLeftRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Bottom Photoshop Modes: Quick Mask (Q) */}
      <div className="mt-2 pt-1 border-t border-[#353535] flex flex-col items-center gap-1">
        <button
          onClick={onToggleQuickMask}
          title={`Quick Mask Mode (Q) - ${isQuickMaskActive ? 'Enabled (Ruby Red Mask)' : 'Standard'}`}
          className={`w-6 h-6 rounded-xs flex items-center justify-center transition-all ${
            isQuickMaskActive
              ? 'bg-rose-900/60 border border-rose-500 text-rose-300 shadow-sm'
              : 'text-[#777777] hover:text-[#cccccc] hover:bg-[#2d2d2d]'
          }`}
        >
          <div className={`w-3.5 h-3.5 rounded-xs border ${isQuickMaskActive ? 'border-rose-400 bg-rose-500/50' : 'border-[#666666] bg-[#222222]'}`} />
        </button>
      </div>
    </div>
  );
};
