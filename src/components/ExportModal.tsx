import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileImage, 
  Check, 
  Monitor, 
  Laptop, 
  Package, 
  Terminal, 
  Sparkles, 
  Layers as LayersIcon,
  HardDrive,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Layer } from '../types/photoshop';
import { compositeLayers } from '../utils/canvasUtils';
import { 
  downloadWindowsDesktopPackage, 
  downloadStandaloneExecutableViewer 
} from '../utils/desktopPackager';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  canvasWidth: number;
  canvasHeight: number;
  layers: Layer[];
  initialTab?: 'standard' | 'pc-exe';
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  documentName,
  canvasWidth,
  canvasHeight,
  layers,
  initialTab = 'standard',
}) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'pc-exe'>(initialTab);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp' | 'svg' | 'psd-json' | 'pc-package' | 'standalone-html'>('png');
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(1);
  const [isPackaging, setIsPackaging] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleDownload = async () => {
    const finalW = Math.round(canvasWidth * scale);
    const finalH = Math.round(canvasHeight * scale);
    const baseName = documentName.replace(/\.[^/.]+$/, '');

    if (format === 'pc-package') {
      setIsPackaging(true);
      try {
        await downloadWindowsDesktopPackage(documentName, layers, canvasWidth, canvasHeight);
      } finally {
        setIsPackaging(false);
        onClose();
      }
      return;
    }

    if (format === 'standalone-html') {
      downloadStandaloneExecutableViewer(documentName, layers, canvasWidth, canvasHeight);
      onClose();
      return;
    }

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

  const copyBuildScript = () => {
    navigator.clipboard.writeText('npm install -D electron electron-builder && npx electron-builder --win nsis portable');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
      <div className="bg-[#282828] border border-[#3e3e3e] rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col text-[#cccccc] text-[12px] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-11 bg-[#222222] border-b border-[#383838] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 font-medium text-white">
            <Download className="w-4 h-4 text-[#00a8ff]" />
            <span>Export & PC Desktop Installation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#333333] rounded text-[#888888] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#383838] bg-[#1e1e1e] px-4 pt-1 gap-2">
          <button
            onClick={() => setActiveTab('standard')}
            className={`px-4 py-2 border-b-2 font-medium text-[12px] transition-all flex items-center gap-2 ${
              activeTab === 'standard'
                ? 'border-[#00a8ff] text-white bg-[#252525]'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <FileImage className="w-3.5 h-3.5 text-[#00a8ff]" />
            <span>Standard File Export</span>
          </button>
          <button
            onClick={() => setActiveTab('pc-exe')}
            className={`px-4 py-2 border-b-2 font-medium text-[12px] transition-all flex items-center gap-2 ${
              activeTab === 'pc-exe'
                ? 'border-[#00a8ff] text-white bg-[#252525]'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Install / Export for PC (.exe)</span>
            <span className="text-[10px] bg-[#005fb8] text-white px-1.5 py-0.2 rounded font-semibold">PC</span>
          </button>
        </div>

        {/* Tab 1: Standard File Export */}
        {activeTab === 'standard' && (
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
                  { id: 'standalone-html', label: 'Standalone PC File', desc: 'Runs directly on any PC' },
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
            {format !== 'standalone-html' && format !== 'psd-json' && (
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
            )}

            {/* Quick banner for PC users */}
            <div className="bg-[#1b2636] border border-[#1e4976] p-3 rounded flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#38bdf8]" />
                <span className="text-[#e0f2fe]">Want to install this app on your PC or export executable files?</span>
              </div>
              <button
                onClick={() => setActiveTab('pc-exe')}
                className="text-[#38bdf8] hover:text-white underline font-medium cursor-pointer"
              >
                View PC Options &rarr;
              </button>
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
                disabled={isPackaging}
                className="px-5 py-1.5 rounded bg-[#005fb8] hover:bg-[#0070d6] text-white font-medium shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isPackaging ? 'Packaging...' : 'Download File'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Install / Export for PC (.exe) */}
        {activeTab === 'pc-exe' && (
          <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
            {/* Option 1: Native Windows PC 1-Click Install */}
            <div className="bg-[#1c2430] border border-[#234975] rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-[#005fb8]/30 border border-[#00a8ff] flex items-center justify-center text-[#38bdf8]">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-[13px] flex items-center gap-2">
                      <span>Method 1: Direct 1-Click PC Install (Recommended)</span>
                      <span className="text-[10px] bg-[#10b981]/20 border border-[#10b981]/50 text-[#34d399] px-1.5 py-0.2 rounded font-semibold">
                        Native App
                      </span>
                    </div>
                    <div className="text-[11px] text-[#93c5fd]">
                      Installs directly to Windows Desktop & Start Menu. Runs in standalone high-speed window with zero browser bars and complete offline capability.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#234975]/60">
                <div className="text-[11px] text-[#8cb4db]">
                  {isInstalled ? (
                    <span className="flex items-center gap-1.5 text-[#34d399]">
                      <Check className="w-3.5 h-3.5" /> Installed and running in Desktop mode!
                    </span>
                  ) : (
                    <span>Supported on Windows 10/11 (Chrome, Edge, Brave)</span>
                  )}
                </div>

                {!isInstalled && (
                  <button
                    onClick={async () => {
                      if (isInstallable) {
                        await install();
                      } else {
                        // Show instructions for Edge / Chrome desktop menu install
                        alert('To install on your PC:\n1. Click the Install Icon (computer or +) in your browser address bar\nOR\n2. Open browser menu (...) > Apps > "Install Adobe Photoshop Web"');
                      }
                    }}
                    className="px-4 py-1.5 rounded bg-[#0078d4] hover:bg-[#1084d8] text-white font-medium flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install App on PC</span>
                  </button>
                )}
              </div>
            </div>

            {/* Option 2: Portable Windows PC Desktop Package (.zip) */}
            <div className="bg-[#202020] border border-[#383838] rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#2a2a2a] border border-[#444444] flex items-center justify-center text-[#00a8ff]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white text-[13px] flex items-center gap-2">
                    <span>Method 2: Download Windows PC Portable Package (.zip)</span>
                    <span className="text-[10px] bg-[#333333] text-[#cccccc] px-1.5 py-0.2 rounded font-semibold">
                      Includes .bat & .vbs
                    </span>
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    Self-contained Windows bundle containing one-click launcher (<code>Photoshop-PC-Launcher.bat</code>), automated Desktop shortcut generator (<code>Create-Desktop-Shortcut.vbs</code>), and offline viewer.
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#333333]">
                <div className="text-[11px] text-[#888888]">
                  Zero setup required &bull; Double-click launcher to run on any PC
                </div>
                <button
                  onClick={async () => {
                    setIsPackaging(true);
                    try {
                      await downloadWindowsDesktopPackage(documentName, layers, canvasWidth, canvasHeight);
                    } finally {
                      setIsPackaging(false);
                    }
                  }}
                  disabled={isPackaging}
                  className="px-4 py-1.5 rounded bg-[#333333] hover:bg-[#3d3d3d] border border-[#444444] text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isPackaging ? 'Generating Package...' : 'Download PC Package (.zip)'}</span>
                </button>
              </div>
            </div>

            {/* Option 3: Compile Official Native Windows .EXE Installer (Electron) */}
            <div className="bg-[#202020] border border-[#383838] rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#2a2a2a] border border-[#444444] flex items-center justify-center text-[#a855f7]">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white text-[13px]">
                    Method 3: Build Native Windows .EXE Installer (Electron)
                  </div>
                  <div className="text-[11px] text-[#888888]">
                    To build official Windows installer (<code>Adobe-Photoshop-Setup.exe</code>) or portable (<code>Adobe-Photoshop-Portable.exe</code>):
                  </div>
                </div>
              </div>

              {/* Command Code snippet */}
              <div className="bg-[#151515] p-2.5 rounded border border-[#2f2f2f] flex items-center justify-between font-mono text-[11px] text-[#38bdf8]">
                <code>npx electron-builder --win nsis portable</code>
                <button
                  onClick={copyBuildScript}
                  className="p-1 rounded hover:bg-[#282828] text-[#888888] hover:text-white transition-colors"
                  title="Copy command"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="text-[10px] text-[#777777]">
                Included inside the PC Package download above: <code>Build-Windows-EXE.bat</code> allows 1-click compilation on any PC with Node.js installed.
              </div>
            </div>

            {/* Option 4: Export Current Artwork as Standalone PC Viewer */}
            <div className="bg-[#202020] border border-[#383838] rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-[#2a2a2a] border border-[#444444] flex items-center justify-center text-[#38bdf8]">
                    <LayersIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-[13px]">
                      Export Current Artwork as Standalone PC Viewer
                    </div>
                    <div className="text-[11px] text-[#888888]">
                      Exports this PSD document as a self-executing interactive PC viewer with zoom, layers list, opacity sliders, and high-DPI rendering.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    downloadStandaloneExecutableViewer(documentName, layers, canvasWidth, canvasHeight);
                  }}
                  className="px-3.5 py-1.5 rounded bg-[#005fb8] hover:bg-[#0070d6] text-white font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Standalone File</span>
                </button>
              </div>
            </div>

            {/* Footer Close */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#383838]">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded bg-[#333333] hover:bg-[#3d3d3d] text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
