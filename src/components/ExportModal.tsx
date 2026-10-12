import React, { useState } from 'react';
import { X, Download, FileImage, Check } from 'lucide-react';
import { Layer } from '../types/photoshop';
import { compositeLayers } from '../utils/canvasUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  canvasWidth: number;
  canvasHeight: number;
  layers: Layer[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  documentName,
  canvasWidth,
  canvasHeight,
  layers,
}) => {
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp' | 'svg' | 'psd-json'>('png');
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(1);

  if (!isOpen) return null;

  const handleDownload = () => {
    const finalW = Math.round(canvasWidth * scale);
    const finalH = Math.round(canvasHeight * scale);

    // Composited canvas
    const rendered = compositeLayers(layers, canvasWidth, canvasHeight);
    
    // Scale if requested
    let exportCanvas = rendered;
    if (scale !== 1) {
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = finalW;
      exportCanvas.height = finalH;
      const ctx = exportCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(rendered, 0, 0, finalW, finalH);
      }
    }

    const baseName = documentName.replace(/\.[^/.]+$/, '');

    if (format === 'psd-json') {
      // Export project file with all layers preserved
      const projectData = {
        name: baseName,
        width: canvasWidth,
        height: canvasHeight,
        version: '1.0',
        savedAt: new Date().toISOString(),
        layers: layers.map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type,
          visible: l.visible,
          locked: l.locked,
          opacity: l.opacity,
          blendMode: l.blendMode,
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height,
          adjustments: l.adjustments,
          textData: l.textData,
          shapeData: l.shapeData,
          dataUrl: l.canvas.toDataURL('image/png'),
        })),
      };

      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.psd.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'svg') {
      // SVG wrapper embedding png
      const dataUrl = exportCanvas.toDataURL('image/png');
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${finalW}" height="${finalH}" viewBox="0 0 ${finalW} ${finalH}">
          <image href="${dataUrl}" width="${finalW}" height="${finalH}" />
        </svg>
      `.trim();
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'jpeg') {
      // For JPEG, fill white background if transparency exists
      const jpegCanvas = document.createElement('canvas');
      jpegCanvas.width = finalW;
      jpegCanvas.height = finalH;
      const jCtx = jpegCanvas.getContext('2d')!;
      jCtx.fillStyle = '#ffffff';
      jCtx.fillRect(0, 0, finalW, finalH);
      jCtx.drawImage(exportCanvas, 0, 0);

      const url = jpegCanvas.toDataURL('image/jpeg', quality / 100);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.jpg`;
      a.click();
    } else {
      // PNG or WEBP
      const mime = format === 'webp' ? 'image/webp' : 'image/png';
      const url = exportCanvas.toDataURL(mime, quality / 100);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.${format}`;
      a.click();
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#282828] border border-[#3e3e3e] rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-[#cccccc] text-[12px]">
        {/* Header */}
        <div className="h-10 bg-[#222222] border-b border-[#383838] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 font-medium text-white">
            <Download className="w-4 h-4 text-[#00a8ff]" />
            <span>Export Document</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#333333] rounded text-[#888888] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Format selector */}
          <div>
            <label className="block text-[11px] text-[#888888] mb-1.5 uppercase font-semibold">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'png', label: 'PNG (Alpha)', desc: 'Lossless with transparency' },
                { id: 'jpeg', label: 'JPEG (Photo)', desc: 'Small file size' },
                { id: 'webp', label: 'WebP (Modern)', desc: 'Optimized web image' },
                { id: 'svg', label: 'SVG (Vector)', desc: 'Scalable graphic' },
                { id: 'psd-json', label: 'PhotoLab Project', desc: 'Preserves all layers' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id as any)}
                  className={`p-2 rounded border text-left transition-all ${
                    format === f.id
                      ? 'bg-[#005fb8]/20 border-[#00a8ff] text-white'
                      : 'bg-[#222222] border-[#383838] hover:bg-[#2c2c2c] text-[#aaaaaa]'
                  }`}
                >
                  <div className="font-semibold text-white">{f.label}</div>
                  <div className="text-[10px] text-[#777777] mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Scale & Quality options */}
          <div className="bg-[#202020] p-3.5 rounded border border-[#333333] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[#888888]">Resolution Scale:</span>
              <div className="flex gap-1.5">
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`px-3 py-1 rounded text-[11px] border ${
                      scale === s
                        ? 'bg-[#005fb8] border-[#00a8ff] text-white font-medium'
                        : 'bg-[#181818] border-[#383838] text-[#888888] hover:text-white'
                    }`}
                  >
                    {s}x ({Math.round(canvasWidth * s)} × {Math.round(canvasHeight * s)})
                  </button>
                ))}
              </div>
            </div>

            {format === 'jpeg' && (
              <div className="flex flex-col gap-1 pt-2 border-t border-[#333333]">
                <div className="flex justify-between text-[#888888]">
                  <span>Compression Quality:</span>
                  <span className="font-mono text-white tabular-nums">{quality}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="accent-[#00a8ff] h-1.5 bg-[#404040] rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#383838]">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-[#333333] hover:bg-[#3d3d3d] text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-1.5 rounded bg-[#005fb8] hover:bg-[#0070d6] text-white font-medium shadow-md transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
