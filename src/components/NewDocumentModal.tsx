import React, { useState } from 'react';
import { X, FileImage, Layout, Sparkles } from 'lucide-react';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, width: number, height: number, background: 'transparent' | 'white' | 'black') => void;
}

const PRESETS = [
  { name: 'Instagram Square', width: 1080, height: 1080, desc: '1080 × 1080 px · 1:1' },
  { name: 'Full HD 1080p', width: 1920, height: 1080, desc: '1920 × 1080 px · 16:9' },
  { name: '4K Cinematic', width: 3840, height: 2160, desc: '3840 × 2160 px · 16:9' },
  { name: 'Story / Reel (Mobile)', width: 1080, height: 1920, desc: '1080 × 1920 px · 9:16' },
  { name: 'YouTube Thumbnail', width: 1280, height: 720, desc: '1280 × 720 px · 16:9' },
  { name: 'Retro Pixel Canvas', width: 256, height: 256, desc: '256 × 256 px · Pixel Art' },
];

export const NewDocumentModal: React.FC<NewDocumentModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [docName, setDocName] = useState('Untitled-1');
  const [width, setWidth] = useState(1200);
  const [height, setHeight] = useState(800);
  const [background, setBackground] = useState<'transparent' | 'white' | 'black'>('transparent');

  if (!isOpen) return null;

  const handleSelectPreset = (p: typeof PRESETS[0]) => {
    setWidth(p.width);
    setHeight(p.height);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (width > 0 && height > 0) {
      onCreate(docName || 'Untitled', width, height, background);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#282828] border border-[#3e3e3e] rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-[#cccccc] text-[12px]">
        {/* Header */}
        <div className="h-10 bg-[#222222] border-b border-[#383838] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 font-medium text-white">
            <FileImage className="w-4 h-4 text-[#00a8ff]" />
            <span>New Document</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#333333] rounded text-[#888888] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          {/* Document Presets Grid */}
          <div>
            <label className="block text-[11px] font-semibold text-[#888888] uppercase mb-2">
              Standard Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.name}
                  onClick={() => handleSelectPreset(p)}
                  className={`p-2.5 rounded border text-left transition-all ${
                    width === p.width && height === p.height
                      ? 'bg-[#005fb8]/20 border-[#00a8ff] text-white'
                      : 'bg-[#222222] border-[#383838] hover:bg-[#2d2d2d] text-[#b8b8b8]'
                  }`}
                >
                  <div className="font-semibold text-[11px] text-white truncate">{p.name}</div>
                  <div className="text-[10px] text-[#777777] font-mono mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Document Dimensions & Details */}
          <div className="grid grid-cols-2 gap-4 bg-[#202020] p-4 rounded border border-[#333333]">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] text-[#888888] mb-1">Preset Name</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full bg-[#181818] border border-[#444444] rounded px-3 py-1.5 text-white font-medium outline-none focus:border-[#00a8ff]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#888888] mb-1">Background Contents</label>
                <div className="flex gap-2">
                  {(['transparent', 'white', 'black'] as const).map((bg) => (
                    <button
                      type="button"
                      key={bg}
                      onClick={() => setBackground(bg)}
                      className={`flex-1 py-1.5 rounded text-[11px] capitalize border transition-all ${
                        background === bg
                          ? 'bg-[#005fb8] border-[#00a8ff] text-white font-medium'
                          : 'bg-[#181818] border-[#383838] text-[#888888] hover:text-white'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-[#888888] mb-1">Width (px)</label>
                  <input
                    type="number"
                    min="16"
                    max="8000"
                    value={width}
                    onChange={(e) => setWidth(Math.max(16, Number(e.target.value)))}
                    className="w-full bg-[#181818] border border-[#444444] rounded px-3 py-1.5 text-white font-mono outline-none focus:border-[#00a8ff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#888888] mb-1">Height (px)</label>
                  <input
                    type="number"
                    min="16"
                    max="8000"
                    value={height}
                    onChange={(e) => setHeight(Math.max(16, Number(e.target.value)))}
                    className="w-full bg-[#181818] border border-[#444444] rounded px-3 py-1.5 text-white font-mono outline-none focus:border-[#00a8ff]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#888888] mb-1">Color Mode</label>
                <div className="text-[11px] text-[#aaaaaa] bg-[#181818] border border-[#383838] rounded px-3 py-1.5">
                  RGB Color · 8-bit
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#383838]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-[#333333] hover:bg-[#3d3d3d] text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 rounded bg-[#005fb8] hover:bg-[#0070d6] text-white font-medium shadow-md transition-colors"
            >
              Create Canvas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
