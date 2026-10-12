import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Sliders } from 'lucide-react';
import { 
  cloneCanvas, 
  applyConvolution, 
  applyPixelate, 
  applyNoise, 
  applyVignette 
} from '../utils/canvasUtils';

interface FilterDialogModalProps {
  isOpen: boolean;
  filterType: string;
  sourceCanvas: HTMLCanvasElement | null;
  onClose: () => void;
  onApply: (filteredCanvas: HTMLCanvasElement, name: string) => void;
}

export const FilterDialogModal: React.FC<FilterDialogModalProps> = ({
  isOpen,
  filterType,
  sourceCanvas,
  onClose,
  onApply,
}) => {
  const [amount, setAmount] = useState(10);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setAmount(10);
    }
  }, [isOpen, filterType]);

  // Render live filter preview
  useEffect(() => {
    if (!isOpen || !sourceCanvas || !previewCanvasRef.current) return;

    const preview = previewCanvasRef.current;
    const ctx = preview.getContext('2d');
    if (!ctx) return;

    // Scale down for fast real-time preview
    const maxDim = 320;
    const scale = Math.min(1, maxDim / Math.max(sourceCanvas.width, sourceCanvas.height));
    const pw = Math.round(sourceCanvas.width * scale);
    const ph = Math.round(sourceCanvas.height * scale);

    preview.width = pw;
    preview.height = ph;
    ctx.drawImage(sourceCanvas, 0, 0, pw, ph);

    if (filterType === 'gaussian-blur') {
      // In preview, apply CSS blur or fast convolution
      const temp = cloneCanvas(preview);
      ctx.clearRect(0, 0, pw, ph);
      ctx.filter = `blur(${amount}px)`;
      ctx.drawImage(temp, 0, 0);
      ctx.filter = 'none';
    } else if (filterType === 'sharpen') {
      const k = [
        0, -1, 0,
        -1, 4 + amount / 5, -1,
        0, -1, 0
      ];
      applyConvolution(preview, k, amount / 5);
    } else if (filterType === 'pixelate') {
      applyPixelate(preview, Math.max(2, Math.round(amount)));
    } else if (filterType === 'noise') {
      applyNoise(preview, amount * 2);
    } else if (filterType === 'vignette') {
      applyVignette(preview, amount / 100);
    } else if (filterType === 'edge-detect') {
      const k = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
      applyConvolution(preview, k, 1);
    } else if (filterType === 'emboss') {
      const k = [-2, -1, 0, -1, 1, 1, 0, 1, 2];
      applyConvolution(preview, k, 1, 128);
    }
  }, [isOpen, sourceCanvas, filterType, amount]);

  if (!isOpen || !sourceCanvas) return null;

  const handleApply = () => {
    const fullFiltered = cloneCanvas(sourceCanvas);
    const ctx = fullFiltered.getContext('2d');

    if (filterType === 'gaussian-blur') {
      if (ctx) {
        const copy = cloneCanvas(fullFiltered);
        ctx.clearRect(0, 0, fullFiltered.width, fullFiltered.height);
        ctx.filter = `blur(${amount}px)`;
        ctx.drawImage(copy, 0, 0);
        ctx.filter = 'none';
      }
    } else if (filterType === 'sharpen') {
      const k = [
        0, -1, 0,
        -1, 4 + amount / 5, -1,
        0, -1, 0
      ];
      applyConvolution(fullFiltered, k, amount / 5);
    } else if (filterType === 'pixelate') {
      applyPixelate(fullFiltered, Math.max(2, Math.round(amount)));
    } else if (filterType === 'noise') {
      applyNoise(fullFiltered, amount * 2);
    } else if (filterType === 'vignette') {
      applyVignette(fullFiltered, amount / 100);
    } else if (filterType === 'edge-detect') {
      const k = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
      applyConvolution(fullFiltered, k, 1);
    } else if (filterType === 'emboss') {
      const k = [-2, -1, 0, -1, 1, 1, 0, 1, 2];
      applyConvolution(fullFiltered, k, 1, 128);
    }

    onApply(fullFiltered, `Filter: ${filterType.replace('-', ' ')}`);
    onClose();
  };

  const getFilterTitle = () => {
    switch (filterType) {
      case 'gaussian-blur': return 'Gaussian Blur';
      case 'sharpen': return 'Unsharp Mask (Sharpen)';
      case 'pixelate': return 'Pixelate / Mosaic';
      case 'noise': return 'Add Noise / Film Grain';
      case 'vignette': return 'Lens Vignette';
      case 'edge-detect': return 'Find Edges';
      case 'emboss': return 'Emboss Filter';
      default: return 'Filter Gallery';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#282828] border border-[#3e3e3e] rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-[#cccccc] text-[12px]">
        {/* Header */}
        <div className="h-10 bg-[#222222] border-b border-[#383838] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 font-medium text-white">
            <Sliders className="w-4 h-4 text-[#00a8ff]" />
            <span>{getFilterTitle()}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#333333] rounded text-[#888888] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-4">
          {/* Live Preview Window */}
          <div className="w-full h-48 bg-[#181818] border border-[#383838] rounded ps-checkerboard flex items-center justify-center overflow-hidden">
            <canvas ref={previewCanvasRef} className="max-w-full max-h-full object-contain shadow-md" />
          </div>

          {/* Filter Parameter Slider */}
          <div className="flex flex-col gap-1.5 bg-[#202020] p-3 rounded border border-[#333333]">
            <div className="flex items-center justify-between text-[#888888]">
              <span>Parameter Strength:</span>
              <span className="font-mono text-white tabular-nums">{amount}</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#383838]">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-[#333333] hover:bg-[#3d3d3d] text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-1.5 rounded bg-[#005fb8] hover:bg-[#0070d6] text-white font-medium shadow-md transition-colors"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
