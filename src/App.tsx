/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ToolType, 
  ToolSettings, 
  SelectionState, 
  Layer, 
  HistoryItem, 
  BlendMode,
  GenerativeVariation
} from './types/photoshop';
import { 
  generateNebulaProject, 
  generateCyberpunkProject, 
  cloneCanvas, 
  createOffscreenCanvas, 
  compositeLayers 
} from './utils/canvasUtils';
import { 
  executeGenerativeFill, 
  applyVariationToCanvas,
  aiSelectSubject, 
  aiRemoveBackground, 
  applyNeuralStyleFilter, 
  executeGenerativeExpand 
} from './utils/aiGenerative';
import { TopMenuBar } from './components/TopMenuBar';
import { ToolOptionsBar } from './components/ToolOptionsBar';
import { ToolBar } from './components/ToolBar';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { RightPanelDock } from './components/RightPanelDock';
import { NewDocumentModal } from './components/NewDocumentModal';
import { FilterDialogModal } from './components/FilterDialogModal';
import { ExportModal } from './components/ExportModal';

export default function App() {
  // Document State
  const [documentName, setDocumentName] = useState('Stellar_Odyssey.psd');
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [layers, setLayers] = useState<Layer[]>(() => generateNebulaProject(1200, 800));
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-5');

  // Tool & Settings State
  const [currentTool, setCurrentTool] = useState<ToolType>('brush');
  const [settings, setSettings] = useState<ToolSettings>({
    brushSize: 25,
    brushHardness: 80,
    brushOpacity: 100,
    brushFlow: 100,
    foregroundColor: '#38bdf8',
    backgroundColor: '#0f172a',
    tolerance: 32,
    feather: 0,
    shapeFill: '#38bdf8',
    shapeStroke: '#ffffff',
    shapeStrokeWidth: 2,
    shapeRadius: 8,
    fontFamily: 'Plus Jakarta Sans',
    fontSize: 48,
    fontWeight: 'bold',
    textColor: '#ffffff',
    textAlign: 'center',
    cropAspect: 'free',
  });

  // Canvas View & Interaction State
  const [zoom, setZoom] = useState<number>(0.75);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 80, y: 50 });
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [selection, setSelection] = useState<SelectionState>({
    active: false,
    type: 'rect',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isQuickMaskActive, setIsQuickMaskActive] = useState<boolean>(false);

  // AI & Generative State
  const [variations, setVariations] = useState<GenerativeVariation[]>([]);
  const [activeVariationIndex, setActiveVariationIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const preVariationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentVariationPromptRef = useRef<string>('');

  // Panels & Modals State
  const [activePanelTab, setActivePanelTab] = useState<string>('layers');
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportTab, setExportTab] = useState<'standard' | 'pc-exe'>('standard');
  const [filterModal, setFilterModal] = useState<{ isOpen: boolean; type: string }>({
    isOpen: false,
    type: 'gaussian-blur',
  });

  // File Upload Reference for opening images
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History State Stack
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Initialize first history state
  useEffect(() => {
    if (history.length === 0 && layers.length > 0) {
      const initialSnapshot = createHistorySnapshot('Open Document', layers, activeLayerId, canvasWidth, canvasHeight);
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
    }
  }, []);

  function createHistorySnapshot(
    name: string,
    currentLayers: Layer[],
    curActiveId: string,
    w: number,
    h: number
  ): HistoryItem {
    return {
      id: Math.random().toString(36).substring(2, 9),
      name,
      timestamp: Date.now(),
      layers: currentLayers.map((l) => ({
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
        adjustments: { ...l.adjustments },
        textData: l.textData ? { ...l.textData } : undefined,
        shapeData: l.shapeData ? { ...l.shapeData } : undefined,
        dataUrl: l.canvas.toDataURL('image/png'),
      })),
      activeLayerId: curActiveId,
      canvasWidth: w,
      canvasHeight: h,
    };
  }

  const pushHistory = useCallback(
    (name: string, newLayers: Layer[], curActiveId = activeLayerId, w = canvasWidth, h = canvasHeight) => {
      const snapshot = createHistorySnapshot(name, newLayers, curActiveId, w, h);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, snapshot].slice(-25); // Limit to last 25 states
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex, activeLayerId, canvasWidth, canvasHeight]
  );

  const handleGoToHistory = (index: number) => {
    if (index < 0 || index >= history.length) return;
    const state = history[index];

    // Reconstruct layers from snapshot
    const restoredLayers: Layer[] = state.layers.map((l) => {
      const c = createOffscreenCanvas(l.width, l.height);
      const ctx = c.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.src = l.dataUrl;
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          setLayers((current) => [...current]);
        };
      }
      return {
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
        adjustments: { ...l.adjustments },
        textData: l.textData,
        shapeData: l.shapeData,
        canvas: c,
      };
    });

    setLayers(restoredLayers);
    setActiveLayerId(state.activeLayerId);
    setCanvasWidth(state.canvasWidth);
    setCanvasHeight(state.canvasHeight);
    setHistoryIndex(index);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      handleGoToHistory(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      handleGoToHistory(historyIndex + 1);
    }
  };

  // Layer Management Handlers
  const handleUpdateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const handleCommitLayerEdit = (layerId: string, updatedCanvas: HTMLCanvasElement, actionName: string) => {
    setLayers((prev) => {
      const next = prev.map((l) => (l.id === layerId ? { ...l, canvas: updatedCanvas } : l));
      pushHistory(actionName, next);
      return next;
    });
  };

  const handleUpdateLayerPosition = (layerId: string, x: number, y: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, x, y } : l))
    );
  };

  const handleNewLayer = () => {
    const newCanvas = createOffscreenCanvas(canvasWidth, canvasHeight);
    const newId = `layer-${Date.now()}`;
    const newLayer: Layer = {
      id: newId,
      name: `Layer ${layers.length + 1}`,
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'source-over',
      canvas: newCanvas,
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
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
    };

    const nextLayers = [...layers, newLayer];
    setLayers(nextLayers);
    setActiveLayerId(newId);
    pushHistory('New Layer', nextLayers, newId);
  };

  const handleDuplicateLayer = () => {
    const cur = layers.find((l) => l.id === activeLayerId);
    if (!cur) return;

    const dupCanvas = cloneCanvas(cur.canvas);
    const newId = `layer-${Date.now()}`;
    const dupLayer: Layer = {
      ...cur,
      id: newId,
      name: `${cur.name} Copy`,
      canvas: dupCanvas,
      adjustments: { ...cur.adjustments },
    };

    const nextLayers = [...layers, dupLayer];
    setLayers(nextLayers);
    setActiveLayerId(newId);
    pushHistory(`Duplicate ${cur.name}`, nextLayers, newId);
  };

  const handleDeleteLayer = () => {
    if (layers.length <= 1) return;
    const nextLayers = layers.filter((l) => l.id !== activeLayerId);
    setLayers(nextLayers);
    const newActiveId = nextLayers[nextLayers.length - 1].id;
    setActiveLayerId(newActiveId);
    pushHistory('Delete Layer', nextLayers, newActiveId);
  };

  const handleMergeDown = () => {
    const idx = layers.findIndex((l) => l.id === activeLayerId);
    if (idx <= 0) return; // Cannot merge bottom layer down

    const top = layers[idx];
    const bottom = layers[idx - 1];

    const mergedCanvas = cloneCanvas(bottom.canvas);
    const mCtx = mergedCanvas.getContext('2d');
    if (mCtx) {
      mCtx.save();
      mCtx.globalAlpha = top.opacity / 100;
      mCtx.globalCompositeOperation = (top.blendMode as GlobalCompositeOperation) || 'source-over';
      mCtx.drawImage(top.canvas, top.x, top.y);
      mCtx.restore();
    }

    const mergedLayer: Layer = {
      ...bottom,
      canvas: mergedCanvas,
    };

    const nextLayers = [...layers];
    nextLayers.splice(idx - 1, 2, mergedLayer);
    setLayers(nextLayers);
    setActiveLayerId(mergedLayer.id);
    pushHistory('Merge Down', nextLayers, mergedLayer.id);
  };

  const handleFlattenImage = () => {
    const flattened = compositeLayers(layers, canvasWidth, canvasHeight);
    const flatLayer: Layer = {
      id: 'background',
      name: 'Background',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'source-over',
      canvas: flattened,
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
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
    };

    const nextLayers = [flatLayer];
    setLayers(nextLayers);
    setActiveLayerId('background');
    pushHistory('Flatten Image', nextLayers, 'background');
  };

  const handleMoveLayerUp = (id: string) => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx < layers.length - 1) {
      const next = [...layers];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      setLayers(next);
      pushHistory('Reorder Layers', next);
    }
  };

  const handleMoveLayerDown = (id: string) => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx > 0) {
      const next = [...layers];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      setLayers(next);
      pushHistory('Reorder Layers', next);
    }
  };

  // Selection Commands
  const handleDeselect = () => {
    setSelection({ active: false, type: 'rect', x: 0, y: 0, width: 0, height: 0 });
  };

  const handleSelectAll = () => {
    setSelection({
      active: true,
      type: 'rect',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
    });
  };

  const handleInvertSelection = () => {
    if (!selection.active) return;
    setSelection((prev) => ({
      ...prev,
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
    }));
  };

  const handleClearSelection = () => {
    const act = layers.find((l) => l.id === activeLayerId);
    if (act && selection.active) {
      const c = cloneCanvas(act.canvas);
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.clearRect(selection.x - act.x, selection.y - act.y, selection.width, selection.height);
        handleCommitLayerEdit(act.id, c, 'Clear Selection');
      }
    }
  };

  // Crop Handlers
  const handleCommitCrop = () => {
    if (!cropBox || cropBox.width <= 10 || cropBox.height <= 10) return;

    const newW = Math.round(cropBox.width);
    const newH = Math.round(cropBox.height);
    const offX = Math.round(cropBox.x);
    const offY = Math.round(cropBox.y);

    const croppedLayers = layers.map((l) => {
      const c = createOffscreenCanvas(newW, newH);
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.drawImage(l.canvas, l.x - offX, l.y - offY);
      }
      return {
        ...l,
        x: 0,
        y: 0,
        width: newW,
        height: newH,
        canvas: c,
      };
    });

    setCanvasWidth(newW);
    setCanvasHeight(newH);
    setLayers(croppedLayers);
    setCropBox(null);
    setCurrentTool('move');
    pushHistory('Crop Document', croppedLayers, activeLayerId, newW, newH);
  };

  const handleCancelCrop = () => {
    setCropBox(null);
    setCurrentTool('move');
  };

  // Zoom Helpers
  const handleZoomIn = () => setZoom((z) => Math.min(32, z * 1.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.1, z * 0.8));
  const handleFitScreen = () => {
    setZoom(0.75);
    setPanOffset({ x: 80, y: 50 });
  };
  const handleActualPixels = () => {
    setZoom(1.0);
    setPanOffset({ x: 80, y: 50 });
  };

  // Generative AI Handlers
  const handleSelectSubject = async () => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;
    setIsGenerating(true);
    try {
      const res = await aiSelectSubject(activeLayer.canvas);
      setSelection({
        active: true,
        type: 'rect',
        x: res.x,
        y: res.y,
        width: res.width,
        height: res.height,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveBackground = async () => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;
    setIsGenerating(true);
    try {
      const cutoutCanvas = await aiRemoveBackground(activeLayer.canvas);
      const newLayer: Layer = {
        id: `layer-cutout-${Date.now()}`,
        name: `${activeLayer.name} (Cutout)`,
        type: 'raster',
        visible: true,
        locked: false,
        opacity: 100,
        blendMode: 'source-over',
        canvas: cutoutCanvas,
        x: activeLayer.x,
        y: activeLayer.y,
        width: activeLayer.width,
        height: activeLayer.height,
        adjustments: { ...activeLayer.adjustments },
      };
      const nextLayers = [newLayer, ...layers];
      setLayers(nextLayers);
      setActiveLayerId(newLayer.id);
      pushHistory('AI Remove Background', nextLayers, newLayer.id);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyGenerativeFill = async (prompt: string) => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;

    const bounds = selection.active
      ? { x: selection.x, y: selection.y, width: selection.width, height: selection.height }
      : { x: 0, y: 0, width: canvasWidth, height: canvasHeight };

    setIsGenerating(true);
    preVariationCanvasRef.current = cloneCanvas(activeLayer.canvas);
    currentVariationPromptRef.current = prompt;

    try {
      const newCanvas = cloneCanvas(activeLayer.canvas);
      const result = await executeGenerativeFill(newCanvas, bounds, prompt);
      setVariations(result.variations);
      setActiveVariationIndex(0);
      handleCommitLayerEdit(activeLayer.id, newCanvas, `AI Fill: ${prompt}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectVariation = (index: number) => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || !preVariationCanvasRef.current || !variations[index]) return;

    const bounds = selection.active
      ? { x: selection.x, y: selection.y, width: selection.width, height: selection.height }
      : { x: 0, y: 0, width: canvasWidth, height: canvasHeight };

    const target = cloneCanvas(preVariationCanvasRef.current);
    const ctx = target.getContext('2d');
    if (ctx) {
      applyVariationToCanvas(
        ctx,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        variations[index],
        currentVariationPromptRef.current
      );
      setActiveVariationIndex(index);
      handleCommitLayerEdit(activeLayer.id, target, `Variation ${index + 1}`);
    }
  };

  const handleAcceptVariation = () => {
    setVariations([]);
    preVariationCanvasRef.current = null;
    handleDeselect();
  };

  const handleDiscardVariation = () => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (activeLayer && preVariationCanvasRef.current) {
      handleCommitLayerEdit(activeLayer.id, preVariationCanvasRef.current, 'Discard Variation');
    }
    setVariations([]);
    preVariationCanvasRef.current = null;
  };

  const handleGenerativeExpand = async () => {
    if (!cropBox) return;
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;

    setIsGenerating(true);
    try {
      const newW = Math.round(cropBox.width);
      const newH = Math.round(cropBox.height);
      const offX = Math.round(cropBox.x);
      const offY = Math.round(cropBox.y);

      const c = createOffscreenCanvas(newW, newH);
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.drawImage(activeLayer.canvas, activeLayer.x - offX, activeLayer.y - offY);
        await executeGenerativeExpand(c, {
          x: activeLayer.x - offX,
          y: activeLayer.y - offY,
          width: activeLayer.width,
          height: activeLayer.height,
        });
      }

      const nextLayers = layers.map((l) =>
        l.id === activeLayerId
          ? { ...l, width: newW, height: newH, canvas: c, x: 0, y: 0 }
          : l
      );

      setCanvasWidth(newW);
      setCanvasHeight(newH);
      setLayers(nextLayers);
      setCropBox(null);
      setCurrentTool('move');
      pushHistory('AI Generative Expand', nextLayers, activeLayerId, newW, newH);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyNeuralStyle = (style: any, options?: any) => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer) return;

    const newCanvas = cloneCanvas(activeLayer.canvas);
    applyNeuralStyleFilter(newCanvas, style, options);
    handleCommitLayerEdit(activeLayer.id, newCanvas, `Neural Filter: ${style}`);
  };

  // Sample Projects
  const handleLoadSample = (type: 'nebula' | 'cyberpunk') => {
    if (type === 'nebula') {
      const next = generateNebulaProject(1200, 800);
      setDocumentName('Stellar_Odyssey.psd');
      setCanvasWidth(1200);
      setCanvasHeight(800);
      setLayers(next);
      setActiveLayerId('layer-5');
      pushHistory('Load Sample: Stellar Odyssey', next, 'layer-5', 1200, 800);
    } else {
      const next = generateCyberpunkProject(1000, 1000);
      setDocumentName('Neo_Tokyo_Poster.psd');
      setCanvasWidth(1000);
      setCanvasHeight(1000);
      setLayers(next);
      setActiveLayerId('cp-4');
      pushHistory('Load Sample: Neo Tokyo', next, 'cp-4', 1000, 1000);
    }
  };

  // Open User Image / File Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if JSON project file
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.layers && parsed.width && parsed.height) {
            setDocumentName(file.name.replace('.json', ''));
            setCanvasWidth(parsed.width);
            setCanvasHeight(parsed.height);

            const restored: Layer[] = parsed.layers.map((l: any) => {
              const c = createOffscreenCanvas(l.width || parsed.width, l.height || parsed.height);
              const ctx = c.getContext('2d');
              if (ctx && l.dataUrl) {
                const img = new Image();
                img.src = l.dataUrl;
                img.onload = () => ctx.drawImage(img, 0, 0);
              }
              return {
                id: l.id,
                name: l.name,
                type: l.type || 'raster',
                visible: l.visible !== false,
                locked: Boolean(l.locked),
                opacity: l.opacity ?? 100,
                blendMode: l.blendMode || 'source-over',
                x: l.x || 0,
                y: l.y || 0,
                width: l.width || parsed.width,
                height: l.height || parsed.height,
                adjustments: l.adjustments || {
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
                textData: l.textData,
                shapeData: l.shapeData,
                canvas: c,
              };
            });

            setLayers(restored);
            setActiveLayerId(restored[0].id);
            pushHistory('Open Project File', restored, restored[0].id, parsed.width, parsed.height);
          }
        } catch {
          // ignore parsing error
        }
      };
      reader.readAsText(file);
      return;
    }

    // Standard Image File (PNG, JPG, WEBP)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const c = createOffscreenCanvas(w, h);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const newLayer: Layer = {
          id: 'bg-image',
          name: file.name,
          type: 'raster',
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'source-over',
          canvas: c,
          x: 0,
          y: 0,
          width: w,
          height: h,
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
        };

        setDocumentName(file.name);
        setCanvasWidth(w);
        setCanvasHeight(h);
        setLayers([newLayer]);
        setActiveLayerId('bg-image');
        handleFitScreen();
        pushHistory(`Open Image: ${file.name}`, [newLayer], 'bg-image', w, h);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches('input, textarea')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDeselect();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsNewDocOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        setShowRulers((r) => !r);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // If selection is active, clear pixels in selection on active layer
        const act = layers.find((l) => l.id === activeLayerId);
        if (act && selection.active) {
          const c = cloneCanvas(act.canvas);
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.clearRect(selection.x - act.x, selection.y - act.y, selection.width, selection.height);
            handleCommitLayerEdit(act.id, c, 'Clear Selection');
          }
        }
      } else if (e.key === ']') {
        // Increase brush size
        setSettings((s) => ({ ...s, brushSize: Math.min(300, s.brushSize + 5) }));
      } else if (e.key === '[') {
        // Decrease brush size
        setSettings((s) => ({ ...s, brushSize: Math.max(1, s.brushSize - 5) }));
      } else if (e.key.toLowerCase() === 'v') setCurrentTool('move');
      else if (e.key.toLowerCase() === 'm') setCurrentTool('marquee-rect');
      else if (e.key.toLowerCase() === 'l') setCurrentTool('lasso');
      else if (e.key.toLowerCase() === 'w') setCurrentTool('magic-wand');
      else if (e.key.toLowerCase() === 'c') setCurrentTool('crop');
      else if (e.key.toLowerCase() === 'i') setCurrentTool('eyedropper');
      else if (e.key.toLowerCase() === 'j') setCurrentTool('spot-healing');
      else if (e.key.toLowerCase() === 'b') setCurrentTool('brush');
      else if (e.key.toLowerCase() === 's') setCurrentTool('clone-stamp');
      else if (e.key.toLowerCase() === 'y') setCurrentTool('history-brush');
      else if (e.key.toLowerCase() === 'e') setCurrentTool('eraser');
      else if (e.key.toLowerCase() === 'g') setCurrentTool('paint-bucket');
      else if (e.key.toLowerCase() === 'r') setCurrentTool('blur-tool');
      else if (e.key.toLowerCase() === 'o') setCurrentTool('dodge');
      else if (e.key.toLowerCase() === 'p') setCurrentTool('pen');
      else if (e.key.toLowerCase() === 't') setCurrentTool('text');
      else if (e.key.toLowerCase() === 'a') setCurrentTool('path-select');
      else if (e.key.toLowerCase() === 'u') setCurrentTool('shape-rect');
      else if (e.key.toLowerCase() === 'h') setCurrentTool('hand');
      else if (e.key.toLowerCase() === 'z') setCurrentTool('zoom');
      else if (e.key.toLowerCase() === 'q') setIsQuickMaskActive((prev) => !prev);
      else if (e.key.toLowerCase() === 'x') {
        setSettings((s) => ({
          ...s,
          foregroundColor: s.backgroundColor,
          backgroundColor: s.foregroundColor,
        }));
      } else if (e.key.toLowerCase() === 'd') {
        setSettings((s) => ({
          ...s,
          foregroundColor: '#000000',
          backgroundColor: '#ffffff',
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, layers, activeLayerId, selection]);

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#181818] select-none text-[#cccccc] font-sans">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 1. Top Menu Bar */}
      <TopMenuBar
        documentName={documentName}
        zoom={zoom}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNewDocument={() => setIsNewDocOpen(true)}
        onOpenImage={() => fileInputRef.current?.click()}
        onLoadSample={handleLoadSample}
        onSaveProject={() => {
          setExportTab('standard');
          setIsExportOpen(true);
        }}
        onExport={() => {
          setExportTab('standard');
          setIsExportOpen(true);
        }}
        onOpenPCExport={() => {
          setExportTab('pc-exe');
          setIsExportOpen(true);
        }}
        onNewLayer={handleNewLayer}
        onDuplicateLayer={handleDuplicateLayer}
        onDeleteLayer={handleDeleteLayer}
        onMergeDown={handleMergeDown}
        onFlattenImage={handleFlattenImage}
        onDeselect={handleDeselect}
        onSelectAll={handleSelectAll}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitScreen={handleFitScreen}
        onActualPixels={handleActualPixels}
        onOpenFilterDialog={(type) => setFilterModal({ isOpen: true, type })}
        onOpenAdjustments={(type) => {
          setActivePanelTab('adjustments');
        }}
        onOpenGenerativeFill={() => setActivePanelTab('generative')}
        showRulers={showRulers}
        onToggleRulers={() => setShowRulers(!showRulers)}
        activePanelTab={activePanelTab}
        setActivePanelTab={setActivePanelTab}
      />

      {/* 2. Contextual Tool Options Bar */}
      <ToolOptionsBar
        currentTool={currentTool}
        settings={settings}
        updateSettings={(p) => setSettings((s) => ({ ...s, ...p }))}
        selection={selection}
        onOpenGenerativeFill={() => setActivePanelTab('generative')}
        onDeselect={handleDeselect}
        onCommitCrop={handleCommitCrop}
        onCancelCrop={handleCancelCrop}
        onFitScreen={handleFitScreen}
        onActualPixels={handleActualPixels}
        onSelectSubject={handleSelectSubject}
        onRemoveBackground={handleRemoveBackground}
        onGenerativeExpand={handleGenerativeExpand}
      />

      {/* 3. Main Body Split: Left Tools | Center Canvas Workspace | Right Panels Dock */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Left Photoshop Toolbar */}
        <ToolBar
          currentTool={currentTool}
          setTool={setCurrentTool}
          foregroundColor={settings.foregroundColor}
          backgroundColor={settings.backgroundColor}
          onSwapColors={() => {
            setSettings((s) => ({
              ...s,
              foregroundColor: s.backgroundColor,
              backgroundColor: s.foregroundColor,
            }));
          }}
          onResetColors={() => {
            setSettings((s) => ({
              ...s,
              foregroundColor: '#000000',
              backgroundColor: '#ffffff',
            }));
          }}
          onChangeForegroundColor={(col) => setSettings((s) => ({ ...s, foregroundColor: col }))}
          onChangeBackgroundColor={(col) => setSettings((s) => ({ ...s, backgroundColor: col }))}
          isQuickMaskActive={isQuickMaskActive}
          onToggleQuickMask={() => setIsQuickMaskActive((prev) => !prev)}
        />

        {/* Center Interactive Canvas Workspace */}
        <CanvasWorkspace
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          layers={layers}
          activeLayerId={activeLayerId}
          currentTool={currentTool}
          settings={settings}
          selection={selection}
          setSelection={setSelection}
          zoom={zoom}
          setZoom={setZoom}
          panOffset={panOffset}
          setPanOffset={setPanOffset}
          showRulers={showRulers}
          onCommitLayerEdit={handleCommitLayerEdit}
          onUpdateLayerPosition={handleUpdateLayerPosition}
          onChangeForegroundColor={(col) => setSettings((s) => ({ ...s, foregroundColor: col }))}
          cropBox={cropBox}
          setCropBox={setCropBox}
          isQuickMaskActive={isQuickMaskActive}
          onApplyGenerativeFill={handleApplyGenerativeFill}
          onSelectSubject={handleSelectSubject}
          onRemoveBackground={handleRemoveBackground}
          onInvertSelection={handleInvertSelection}
          onDeselect={handleDeselect}
          onClearSelection={handleClearSelection}
          variations={variations}
          activeVariationIndex={activeVariationIndex}
          onSelectVariation={handleSelectVariation}
          onAcceptVariation={handleAcceptVariation}
          onDiscardVariation={handleDiscardVariation}
          isGenerating={isGenerating}
        />

        {/* Right Dockable Panel (Layers, Adjustments, Swatches, History, AI) */}
        <RightPanelDock
          layers={layers}
          activeLayerId={activeLayerId}
          setActiveLayerId={setActiveLayerId}
          onUpdateLayer={handleUpdateLayer}
          onNewLayer={handleNewLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onDeleteLayer={handleDeleteLayer}
          onMergeDown={handleMergeDown}
          onMoveLayerUp={handleMoveLayerUp}
          onMoveLayerDown={handleMoveLayerDown}
          history={history}
          historyIndex={historyIndex}
          onGoToHistory={handleGoToHistory}
          activeTab={activePanelTab}
          setActiveTab={setActivePanelTab}
          selection={selection}
          onApplyGenerativeFill={handleApplyGenerativeFill}
          onApplyNeuralStyle={handleApplyNeuralStyle}
          onSelectSubject={handleSelectSubject}
          onRemoveBackground={handleRemoveBackground}
          variations={variations}
          activeVariationIndex={activeVariationIndex}
          onSelectVariation={handleSelectVariation}
          foregroundColor={settings.foregroundColor}
          backgroundColor={settings.backgroundColor}
          onChangeForegroundColor={(col) => setSettings((s) => ({ ...s, foregroundColor: col }))}
          onChangeBackgroundColor={(col) => setSettings((s) => ({ ...s, backgroundColor: col }))}
        />
      </div>

      {/* Modals */}
      <NewDocumentModal
        isOpen={isNewDocOpen}
        onClose={() => setIsNewDocOpen(false)}
        onCreate={(name, w, h, bg) => {
          const bgCanvas = createOffscreenCanvas(w, h);
          const ctx = bgCanvas.getContext('2d')!;
          if (bg === 'white') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
          } else if (bg === 'black') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);
          }
          const newLayer: Layer = {
            id: 'layer-1',
            name: bg === 'transparent' ? 'Layer 1' : 'Background',
            type: 'raster',
            visible: true,
            locked: false,
            opacity: 100,
            blendMode: 'source-over',
            canvas: bgCanvas,
            x: 0,
            y: 0,
            width: w,
            height: h,
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
          };

          setDocumentName(`${name}.psd`);
          setCanvasWidth(w);
          setCanvasHeight(h);
          setLayers([newLayer]);
          setActiveLayerId('layer-1');
          handleFitScreen();
          pushHistory('New Document', [newLayer], 'layer-1', w, h);
        }}
      />

      <FilterDialogModal
        isOpen={filterModal.isOpen}
        filterType={filterModal.type}
        sourceCanvas={activeLayer?.canvas || null}
        onClose={() => setFilterModal({ isOpen: false, type: 'gaussian-blur' })}
        onApply={(filteredCanvas, filterName) => {
          if (activeLayer) {
            handleCommitLayerEdit(activeLayer.id, filteredCanvas, filterName);
          }
        }}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        documentName={documentName}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        layers={layers}
        initialTab={exportTab}
      />
    </div>
  );
}
