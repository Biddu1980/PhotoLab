import React, { useState } from 'react';
import { 
  Sparkles, 
  UserCheck, 
  Scissors, 
  FlipHorizontal2, 
  X, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Sliders, 
  Trash2,
  Maximize2,
  RefreshCw,
  GripHorizontal
} from 'lucide-react';
import { SelectionState, GenerativeVariation } from '../types/photoshop';

interface ContextualTaskbarProps {
  selection: SelectionState;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panOffset: { x: number; y: number };
  onApplyGenerativeFill: (prompt: string) => Promise<void>;
  onSelectSubject: () => Promise<void>;
  onRemoveBackground: () => Promise<void>;
  onInvertSelection: () => void;
  onDeselect: () => void;
  onClearSelection: () => void;
  variations: GenerativeVariation[];
  activeVariationIndex: number;
  onSelectVariation: (index: number) => void;
  onAcceptVariation: () => void;
  onDiscardVariation: () => void;
  isGenerating: boolean;
}

export const ContextualTaskbar: React.FC<ContextualTaskbarProps> = ({
  selection,
  canvasWidth,
  canvasHeight,
  zoom,
  panOffset,
  onApplyGenerativeFill,
  onSelectSubject,
  onRemoveBackground,
  onInvertSelection,
  onDeselect,
  onClearSelection,
  variations,
  activeVariationIndex,
  onSelectVariation,
  onAcceptVariation,
  onDiscardVariation,
  isGenerating,
}) => {
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [showFeather, setShowFeather] = useState(false);

  // Position the contextual taskbar just below selection, or bottom-center of canvas if no selection
  let topPos = 0;
  let leftPos = 0;

  if (selection.active) {
    topPos = (selection.y + selection.height) * zoom + panOffset.y + 16;
    leftPos = (selection.x + selection.width / 2) * zoom + panOffset.x;
  } else {
    topPos = canvasHeight * zoom + panOffset.y - 60;
    leftPos = (canvasWidth / 2) * zoom + panOffset.x;
  }

  // Constrain to visible viewport limits
  topPos = Math.max(70, Math.min(window.innerHeight - 120, topPos));
  leftPos = Math.max(160, Math.min(window.innerWidth - 300, leftPos));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || isGenerating) return;
    await onApplyGenerativeFill(promptText);
    setIsPromptOpen(false);
  };

  return (
    <div
      style={{
        top: `${topPos}px`,
        left: `${leftPos}px`,
        transform: 'translateX(-50%)',
      }}
      className="absolute z-50 flex items-center bg-[#232323]/95 backdrop-blur-md border border-[#3f3f3f] rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.6)] px-3 py-1.5 gap-2 text-[11px] text-[#e0e0e0] select-none transition-all duration-75 animate-in fade-in"
    >
      {/* Drag handle pill */}
      <div className="text-[#666666] cursor-grab hover:text-white px-0.5">
        <GripHorizontal className="w-3.5 h-3.5" />
      </div>

      {/* Variations Carousel (if variations are active) */}
      {variations.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#181818] px-2.5 py-1 rounded-full border border-[#38bdf8]/50 text-[#38bdf8] font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Variation {activeVariationIndex + 1} of {variations.length}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onSelectVariation((activeVariationIndex - 1 + variations.length) % variations.length)}
              title="Previous Variation"
              className="p-1 rounded-full hover:bg-[#333333] text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSelectVariation((activeVariationIndex + 1) % variations.length)}
              title="Next Variation"
              className="p-1 rounded-full hover:bg-[#333333] text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-[1px] h-4 bg-[#444444]" />

          <button
            onClick={onAcceptVariation}
            title="Keep Variation"
            className="flex items-center gap-1 px-3 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-full font-medium transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Keep</span>
          </button>

          <button
            onClick={onDiscardVariation}
            title="Discard"
            className="flex items-center gap-1 px-2.5 py-1 hover:bg-[#383838] text-[#aaaaaa] hover:text-white rounded-full transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>
        </div>
      ) : isPromptOpen ? (
        /* Generative Fill Prompt Input Form */
        <form onSubmit={handleGenerate} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 pl-2 text-[#38bdf8]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            autoFocus
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Describe what you want to add or generate..."
            className="w-72 bg-[#171717] border border-[#444444] rounded-full px-3 py-1 text-white text-[11px] outline-none focus:border-[#38bdf8]"
          />
          <button
            type="submit"
            disabled={isGenerating || !promptText.trim()}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#0284c7] to-[#38bdf8] text-white rounded-full font-medium hover:brightness-110 disabled:opacity-50 transition-all shadow-sm"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <span>Generate</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsPromptOpen(false)}
            className="p-1 rounded-full text-[#888888] hover:text-white hover:bg-[#333333]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        /* Standard Photoshop Selection Contextual Bar */
        <div className="flex items-center gap-2">
          {/* Generative Fill Button */}
          <button
            onClick={() => setIsPromptOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#005fb8] to-[#0284c7] hover:brightness-110 text-white font-medium shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Generative Fill</span>
          </button>

          <div className="w-[1px] h-4 bg-[#3a3a3a]" />

          {/* AI Select Subject */}
          <button
            onClick={onSelectSubject}
            title="AI Select Subject (Auto Detect)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-[#333333] text-[#cccccc] hover:text-white transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Select Subject</span>
          </button>

          {/* AI Remove Background */}
          <button
            onClick={onRemoveBackground}
            title="AI Remove Background (Cutout)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-[#333333] text-[#cccccc] hover:text-white transition-colors"
          >
            <Scissors className="w-3.5 h-3.5 text-[#f43f5e]" />
            <span>Remove BG</span>
          </button>

          <div className="w-[1px] h-4 bg-[#3a3a3a]" />

          {/* Invert Selection */}
          <button
            onClick={onInvertSelection}
            title="Invert Selection (Ctrl+Shift+I)"
            className="p-1.5 rounded-full hover:bg-[#333333] text-[#aaaaaa] hover:text-white transition-colors"
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
          </button>

          {/* Clear Pixels */}
          <button
            onClick={onClearSelection}
            title="Clear Pixels (Delete)"
            className="p-1.5 rounded-full hover:bg-[#333333] text-[#aaaaaa] hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Deselect */}
          <button
            onClick={onDeselect}
            title="Deselect (Ctrl+D)"
            className="p-1.5 rounded-full hover:bg-[#333333] text-[#aaaaaa] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
