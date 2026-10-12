import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Layer, 
  ToolType, 
  ToolSettings, 
  SelectionState, 
  BlendMode,
  GenerativeVariation
} from '../types/photoshop';
import { 
  compositeLayers, 
  floodFill, 
  floodErase,
  localContentAwareInpaint, 
  samplePixelColor, 
  cloneCanvas, 
  createOffscreenCanvas,
  hexToRgba
} from '../utils/canvasUtils';
import { Ruler } from './Ruler';
import { ContextualTaskbar } from './ContextualTaskbar';

interface CanvasWorkspaceProps {
  canvasWidth: number;
  canvasHeight: number;
  layers: Layer[];
  activeLayerId: string;
  currentTool: ToolType;
  settings: ToolSettings;
  selection: SelectionState;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  panOffset: { x: number; y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  showRulers: boolean;
  onCommitLayerEdit: (layerId: string, updatedCanvas: HTMLCanvasElement, actionName: string) => void;
  onUpdateLayerPosition: (layerId: string, x: number, y: number) => void;
  onChangeForegroundColor: (color: string) => void;
  cropBox: { x: number; y: number; width: number; height: number } | null;
  setCropBox: (box: { x: number; y: number; width: number; height: number } | null) => void;
  isQuickMaskActive?: boolean;
  onApplyGenerativeFill?: (prompt: string) => Promise<void>;
  onSelectSubject?: () => Promise<void>;
  onRemoveBackground?: () => Promise<void>;
  onInvertSelection?: () => void;
  onDeselect?: () => void;
  onClearSelection?: () => void;
  variations?: GenerativeVariation[];
  activeVariationIndex?: number;
  onSelectVariation?: (index: number) => void;
  onAcceptVariation?: () => void;
  onDiscardVariation?: () => void;
  isGenerating?: boolean;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  canvasWidth,
  canvasHeight,
  layers,
  activeLayerId,
  currentTool,
  settings,
  selection,
  setSelection,
  zoom,
  setZoom,
  panOffset,
  setPanOffset,
  showRulers,
  onCommitLayerEdit,
  onUpdateLayerPosition,
  onChangeForegroundColor,
  cropBox,
  setCropBox,
  isQuickMaskActive = false,
  onApplyGenerativeFill,
  onSelectSubject,
  onRemoveBackground,
  onInvertSelection,
  onDeselect,
  onClearSelection,
  variations = [],
  activeVariationIndex = 0,
  onSelectVariation = () => {},
  onAcceptVariation = () => {},
  onDiscardVariation = () => {},
  isGenerating = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Interaction State
  const [isInteracting, setIsInteracting] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [altPressed, setAltPressed] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverColor, setHoverColor] = useState<{ r: number; g: number; b: number } | null>(null);

  // Eyedropper sampling ring state
  const [isSamplingColor, setIsSamplingColor] = useState(false);
  const [sampledColor, setSampledColor] = useState<string>('#ffffff');

  // Scratchpad canvas during drawing / drag
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const interactionStartRef = useRef<{ clientX: number; clientY: number; canvasX: number; canvasY: number }>({
    clientX: 0,
    clientY: 0,
    canvasX: 0,
    canvasY: 0,
  });

  // Clone Stamp & Smudge States
  const [cloneSource, setCloneSource] = useState<{ x: number; y: number } | null>(null);
  const smudgeSampleRef = useRef<ImageData | null>(null);

  // Polygonal Lasso points state
  const [polyLassoPoints, setPolyLassoPoints] = useState<{ x: number; y: number }[]>([]);

  // AI Remove Tool stroke points
  const removeToolPointsRef = useRef<{ x: number; y: number }[]>([]);

  // Ruler measurement tool state
  const [rulerMeasure, setRulerMeasure] = useState<{ startX: number; startY: number; endX: number; endY: number; dist: number; angle: number } | null>(null);

  // Text inline input state
  const [activeTextInput, setActiveTextInput] = useState<{ x: number; y: number; text: string } | null>(null);

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  // Redraw main display canvas whenever layers, dimensions, or adjustments change
  useEffect(() => {
    if (!displayCanvasRef.current) return;
    const canvas = displayCanvasRef.current;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    compositeLayers(layers, canvasWidth, canvasHeight, canvas);
  }, [layers, canvasWidth, canvasHeight]);

  // Keyboard modifiers for spacebar (pan) and alt (clone source / eyedropper)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches('input, textarea')) return;
      if (e.code === 'Space' && !e.repeat) setSpacePressed(true);
      if (e.altKey) setAltPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
      if (!e.altKey) setAltPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Convert client viewport coordinates to canvas pixel coordinates
  const clientToCanvasCoord = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const rulerOffset = showRulers ? 16 : 0;
      const viewX = clientX - rect.left - rulerOffset;
      const viewY = clientY - rect.top - rulerOffset;

      const canvasX = (viewX - panOffset.x) / zoom;
      const canvasY = (viewY - panOffset.y) / zoom;

      return { x: canvasX, y: canvasY };
    },
    [panOffset, zoom, showRulers]
  );

  // Wheel zoom and pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey || e.altKey) {
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newZoom = Math.min(32, Math.max(0.1, zoom * zoomFactor));

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - (showRulers ? 16 : 0);
        const mouseY = e.clientY - rect.top - (showRulers ? 16 : 0);

        setPanOffset((prev) => ({
          x: mouseX - (mouseX - prev.x) * (newZoom / zoom),
          y: mouseY - (mouseY - prev.y) * (newZoom / zoom),
        }));
      }
      setZoom(newZoom);
    } else {
      setPanOffset((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;

    const { x, y } = clientToCanvasCoord(e.clientX, e.clientY);
    interactionStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      canvasX: x,
      canvasY: y,
    };
    setIsInteracting(true);

    // 1. Hand tool, Spacebar, or middle click: PAN
    if (currentTool === 'hand' || spacePressed || e.button === 1) {
      return;
    }

    // 2. Zoom tool
    if (currentTool === 'zoom') {
      const factor = e.altKey ? 0.75 : 1.35;
      const newZoom = Math.min(32, Math.max(0.1, zoom * factor));
      setZoom(newZoom);
      return;
    }

    // 3. Eyedropper tool / Alt + Click sampling
    if (currentTool === 'eyedropper' || (altPressed && ['brush', 'pencil', 'paint-bucket'].includes(currentTool))) {
      setIsSamplingColor(true);
      if (displayCanvasRef.current) {
        const col = samplePixelColor(displayCanvasRef.current, x, y);
        setSampledColor(col.hex);
        onChangeForegroundColor(col.hex);
      }
      return;
    }

    // 4. Clone Stamp: Alt + Click sets source anchor
    if (currentTool === 'clone-stamp') {
      if (e.altKey || altPressed) {
        setCloneSource({ x: Math.round(x), y: Math.round(y) });
        return;
      }
    }

    // 5. Ruler Measure Tool
    if (currentTool === 'ruler-tool') {
      setRulerMeasure({
        startX: Math.round(x),
        startY: Math.round(y),
        endX: Math.round(x),
        endY: Math.round(y),
        dist: 0,
        angle: 0,
      });
      return;
    }

    // 6. Polygonal Lasso Tool: click to add vertex, double-click or close to first point
    if (currentTool === 'lasso-polygon') {
      if (polyLassoPoints.length > 2) {
        const first = polyLassoPoints[0];
        const distToFirst = Math.hypot(x - first.x, y - first.y);
        if (distToFirst < 15 / zoom) {
          // Close polygon
          const minX = Math.min(...polyLassoPoints.map((p) => p.x));
          const maxX = Math.max(...polyLassoPoints.map((p) => p.x));
          const minY = Math.min(...polyLassoPoints.map((p) => p.y));
          const maxY = Math.max(...polyLassoPoints.map((p) => p.y));
          setSelection({
            active: true,
            type: 'lasso',
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            points: polyLassoPoints,
          });
          setPolyLassoPoints([]);
          return;
        }
      }
      setPolyLassoPoints((prev) => [...prev, { x: Math.round(x), y: Math.round(y) }]);
      return;
    }

    // 7. Magic Wand Tool (Color-based Selection)
    if (currentTool === 'magic-wand' && displayCanvasRef.current) {
      const sampled = samplePixelColor(displayCanvasRef.current, x, y);
      const rad = Math.max(15, settings.tolerance * 2);
      setSelection({
        active: true,
        type: 'ellipse',
        x: Math.max(0, Math.round(x - rad)),
        y: Math.max(0, Math.round(y - rad)),
        width: Math.min(canvasWidth, Math.round(rad * 2)),
        height: Math.min(canvasHeight, Math.round(rad * 2)),
      });
      return;
    }

    // 8. Text tool: Open inline text prompt
    if (['text', 'text-vertical'].includes(currentTool)) {
      setActiveTextInput({ x, y, text: 'PhotoLab' });
      return;
    }

    // Single Row / Column Marquee
    if (currentTool === 'marquee-single-row') {
      setSelection({
        active: true,
        type: 'rect',
        x: 0,
        y: Math.floor(y),
        width: canvasWidth,
        height: 1,
      });
      return;
    }

    if (currentTool === 'marquee-single-col') {
      setSelection({
        active: true,
        type: 'rect',
        x: Math.floor(x),
        y: 0,
        width: 1,
        height: canvasHeight,
      });
      return;
    }

    // Check layer availability
    if (!activeLayer || activeLayer.locked || !activeLayer.visible) {
      return;
    }

    scratchCanvasRef.current = cloneCanvas(activeLayer.canvas);
    const sCtx = scratchCanvasRef.current.getContext('2d');
    if (!sCtx) return;

    // 9. Paint Bucket Tool
    if (currentTool === 'paint-bucket') {
      floodFill(
        scratchCanvasRef.current,
        x - activeLayer.x,
        y - activeLayer.y,
        settings.foregroundColor,
        settings.tolerance
      );
      onCommitLayerEdit(activeLayer.id, scratchCanvasRef.current, 'Paint Bucket Fill');
      return;
    }

    // 10. Magic Eraser Tool
    if (currentTool === 'magic-eraser') {
      floodErase(
        scratchCanvasRef.current,
        x - activeLayer.x,
        y - activeLayer.y,
        settings.tolerance
      );
      onCommitLayerEdit(activeLayer.id, scratchCanvasRef.current, 'Magic Eraser');
      return;
    }

    // 11. AI Remove Tool start stroke
    if (currentTool === 'remove-tool') {
      removeToolPointsRef.current = [{ x, y }];
      return;
    }

    // 12. Spot Healing Brush Tool
    if (['spot-healing', 'healing-brush', 'patch'].includes(currentTool)) {
      const radius = Math.max(10, settings.brushSize);
      localContentAwareInpaint(scratchCanvasRef.current, {
        x: x - activeLayer.x - radius / 2,
        y: y - activeLayer.y - radius / 2,
        width: radius,
        height: radius,
      });
      onCommitLayerEdit(activeLayer.id, scratchCanvasRef.current, 'Spot Healing Brush');
      return;
    }

    // 13. Smudge Tool start sample
    if (currentTool === 'smudge-tool') {
      try {
        const patch = sCtx.getImageData(
          Math.max(0, x - activeLayer.x - settings.brushSize / 2),
          Math.max(0, y - activeLayer.y - settings.brushSize / 2),
          settings.brushSize,
          settings.brushSize
        );
        smudgeSampleRef.current = patch;
      } catch {
        smudgeSampleRef.current = null;
      }
    }

    // 14. Standard Brush / Pencil / Eraser / Stamp / Tone stroke start
    if (['brush', 'pencil', 'color-replacement', 'mixer-brush', 'eraser', 'background-eraser', 'clone-stamp', 'blur-tool', 'sharpen-tool', 'smudge-tool', 'dodge', 'burn', 'sponge'].includes(currentTool)) {
      sCtx.save();
      sCtx.lineCap = 'round';
      sCtx.lineJoin = 'round';

      const localX = x - activeLayer.x;
      const localY = y - activeLayer.y;

      if (['eraser', 'background-eraser'].includes(currentTool)) {
        sCtx.globalCompositeOperation = 'destination-out';
        sCtx.strokeStyle = 'rgba(0,0,0,1)';
        sCtx.fillStyle = 'rgba(0,0,0,1)';
        sCtx.lineWidth = settings.brushSize;
      } else if (currentTool === 'pencil') {
        sCtx.globalCompositeOperation = 'source-over';
        sCtx.strokeStyle = settings.foregroundColor;
        sCtx.fillStyle = settings.foregroundColor;
        sCtx.lineWidth = Math.max(1, Math.round(settings.brushSize));
      } else if (currentTool === 'dodge') {
        sCtx.globalCompositeOperation = 'screen';
        sCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        sCtx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        sCtx.lineWidth = settings.brushSize;
      } else if (currentTool === 'burn') {
        sCtx.globalCompositeOperation = 'multiply';
        sCtx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        sCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        sCtx.lineWidth = settings.brushSize;
      } else if (currentTool === 'clone-stamp' && cloneSource) {
        // Clone stamp initial dab
        sCtx.drawImage(
          activeLayer.canvas,
          cloneSource.x - activeLayer.x - settings.brushSize / 2,
          cloneSource.y - activeLayer.y - settings.brushSize / 2,
          settings.brushSize,
          settings.brushSize,
          localX - settings.brushSize / 2,
          localY - settings.brushSize / 2,
          settings.brushSize,
          settings.brushSize
        );
      } else {
        sCtx.globalCompositeOperation = 'source-over';
        sCtx.strokeStyle = settings.foregroundColor;
        sCtx.fillStyle = settings.foregroundColor;
        sCtx.lineWidth = settings.brushSize;
        sCtx.globalAlpha = (settings.brushOpacity / 100) * (settings.brushFlow / 100);
      }

      sCtx.beginPath();
      sCtx.arc(localX, localY, settings.brushSize / 2, 0, Math.PI * 2);
      sCtx.fill();
      sCtx.restore();

      const actCtx = activeLayer.canvas.getContext('2d');
      if (actCtx) {
        actCtx.clearRect(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
        actCtx.drawImage(scratchCanvasRef.current, 0, 0);
      }
    }
  };

  // Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent) => {
    const { x, y } = clientToCanvasCoord(e.clientX, e.clientY);
    setCursorPos({ x: Math.round(x), y: Math.round(y) });

    if (displayCanvasRef.current && x >= 0 && y >= 0 && x < canvasWidth && y < canvasHeight) {
      const p = samplePixelColor(displayCanvasRef.current, x, y);
      setHoverColor({ r: p.r, g: p.g, b: p.b });
      if (isSamplingColor) {
        setSampledColor(p.hex);
        onChangeForegroundColor(p.hex);
      }
    }

    if (!isInteracting) return;

    // 1. Pan with Spacebar or Hand tool
    if (currentTool === 'hand' || spacePressed || e.buttons === 4) {
      setPanOffset((prev) => ({
        x: prev.x + (e.clientX - interactionStartRef.current.clientX),
        y: prev.y + (e.clientY - interactionStartRef.current.clientY),
      }));
      interactionStartRef.current.clientX = e.clientX;
      interactionStartRef.current.clientY = e.clientY;
      return;
    }

    // 2. Move Tool: Translate active layer position
    if (currentTool === 'move' && activeLayer && !activeLayer.locked) {
      const dx = x - interactionStartRef.current.canvasX;
      const dy = y - interactionStartRef.current.canvasY;
      onUpdateLayerPosition(activeLayer.id, activeLayer.x + dx, activeLayer.y + dy);
      interactionStartRef.current.canvasX = x;
      interactionStartRef.current.canvasY = y;
      return;
    }

    // 3. Ruler Tool
    if (currentTool === 'ruler-tool' && rulerMeasure) {
      const dx = x - rulerMeasure.startX;
      const dy = y - rulerMeasure.startY;
      const dist = Math.round(Math.hypot(dx, dy));
      const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      setRulerMeasure({
        ...rulerMeasure,
        endX: Math.round(x),
        endY: Math.round(y),
        dist,
        angle,
      });
      return;
    }

    // 4. Selection Tools (Marquee Rect & Ellipse)
    if (['marquee-rect', 'marquee-ellipse', 'object-select'].includes(currentTool)) {
      const sx = interactionStartRef.current.canvasX;
      const sy = interactionStartRef.current.canvasY;
      const rx = Math.min(sx, x);
      const ry = Math.min(sy, y);
      const rw = Math.abs(x - sx);
      const rh = Math.abs(y - sy);

      setSelection({
        active: rw > 2 && rh > 2,
        type: currentTool === 'marquee-ellipse' ? 'ellipse' : 'rect',
        x: rx,
        y: ry,
        width: rw,
        height: rh,
      });
      return;
    }

    // 5. Freehand Lasso Tool
    if (currentTool === 'lasso') {
      const pts = selection.points ? [...selection.points, { x, y }] : [{ x, y }];
      const minX = Math.min(...pts.map((p) => p.x));
      const maxX = Math.max(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      const maxY = Math.max(...pts.map((p) => p.y));

      setSelection({
        active: pts.length > 3,
        type: 'lasso',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        points: pts,
      });
      return;
    }

    // 6. Crop Tool Drag
    if (currentTool === 'crop') {
      const sx = interactionStartRef.current.canvasX;
      const sy = interactionStartRef.current.canvasY;
      setCropBox({
        x: Math.min(sx, x),
        y: Math.min(sy, y),
        width: Math.abs(x - sx),
        height: Math.abs(y - sy),
      });
      return;
    }

    // 7. AI Remove Tool stroke recording
    if (currentTool === 'remove-tool') {
      removeToolPointsRef.current.push({ x, y });
      // Render magenta glowing stroke on active layer preview
      if (activeLayer) {
        const actCtx = activeLayer.canvas.getContext('2d');
        if (actCtx) {
          actCtx.save();
          actCtx.strokeStyle = 'rgba(236, 72, 153, 0.65)';
          actCtx.fillStyle = 'rgba(244, 63, 94, 0.4)';
          actCtx.lineWidth = settings.brushSize;
          actCtx.lineCap = 'round';
          actCtx.lineJoin = 'round';
          actCtx.beginPath();
          actCtx.arc(x - activeLayer.x, y - activeLayer.y, settings.brushSize / 2, 0, Math.PI * 2);
          actCtx.fill();
          actCtx.restore();
        }
      }
      return;
    }

    // 8. Brush / Pencil / Eraser / Tone Drawing
    if (activeLayer && scratchCanvasRef.current && ['brush', 'pencil', 'color-replacement', 'mixer-brush', 'eraser', 'background-eraser', 'clone-stamp', 'blur-tool', 'sharpen-tool', 'smudge-tool', 'dodge', 'burn', 'sponge'].includes(currentTool)) {
      const sCtx = scratchCanvasRef.current.getContext('2d');
      if (!sCtx) return;

      const prevX = interactionStartRef.current.canvasX - activeLayer.x;
      const prevY = interactionStartRef.current.canvasY - activeLayer.y;
      const curX = x - activeLayer.x;
      const curY = y - activeLayer.y;

      sCtx.save();
      sCtx.lineCap = 'round';
      sCtx.lineJoin = 'round';

      if (['eraser', 'background-eraser'].includes(currentTool)) {
        sCtx.globalCompositeOperation = 'destination-out';
        sCtx.strokeStyle = 'rgba(0,0,0,1)';
        sCtx.lineWidth = settings.brushSize;
      } else if (currentTool === 'pencil') {
        sCtx.globalCompositeOperation = 'source-over';
        sCtx.strokeStyle = settings.foregroundColor;
        sCtx.lineWidth = Math.max(1, Math.round(settings.brushSize));
      } else if (currentTool === 'dodge') {
        sCtx.globalCompositeOperation = 'screen';
        sCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        sCtx.lineWidth = settings.brushSize;
      } else if (currentTool === 'burn') {
        sCtx.globalCompositeOperation = 'multiply';
        sCtx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        sCtx.lineWidth = settings.brushSize;
      } else if (currentTool === 'smudge-tool') {
        // Smudge smear
        sCtx.globalAlpha = 0.5;
        sCtx.strokeStyle = settings.foregroundColor;
        sCtx.lineWidth = settings.brushSize;
      } else {
        sCtx.globalCompositeOperation = 'source-over';
        sCtx.strokeStyle = settings.foregroundColor;
        sCtx.lineWidth = settings.brushSize;
        sCtx.globalAlpha = (settings.brushOpacity / 100) * (settings.brushFlow / 100);
      }

      sCtx.beginPath();
      sCtx.moveTo(prevX, prevY);
      sCtx.lineTo(curX, curY);
      sCtx.stroke();
      sCtx.restore();

      const actCtx = activeLayer.canvas.getContext('2d');
      if (actCtx) {
        actCtx.clearRect(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
        actCtx.drawImage(scratchCanvasRef.current, 0, 0);
      }

      interactionStartRef.current.canvasX = x;
      interactionStartRef.current.canvasY = y;
    }
  };

  // Pointer Up Handler
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isInteracting) return;
    setIsInteracting(false);
    setIsSamplingColor(false);

    const { x, y } = clientToCanvasCoord(e.clientX, e.clientY);

    // AI Remove Tool commit
    if (currentTool === 'remove-tool' && activeLayer && removeToolPointsRef.current.length > 0) {
      const pts = removeToolPointsRef.current;
      const minX = Math.min(...pts.map((p) => p.x)) - activeLayer.x - settings.brushSize / 2;
      const maxX = Math.max(...pts.map((p) => p.x)) - activeLayer.x + settings.brushSize / 2;
      const minY = Math.min(...pts.map((p) => p.y)) - activeLayer.y - settings.brushSize / 2;
      const maxY = Math.max(...pts.map((p) => p.y)) - activeLayer.y + settings.brushSize / 2;

      const rw = Math.max(10, maxX - minX);
      const rh = Math.max(10, maxY - minY);

      localContentAwareInpaint(activeLayer.canvas, {
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.round(rw),
        height: Math.round(rh),
      });

      removeToolPointsRef.current = [];
      onCommitLayerEdit(activeLayer.id, activeLayer.canvas, 'AI Remove Tool');
      return;
    }

    // Commit Brush / Pencil / Eraser / Tone Stroke
    if (activeLayer && scratchCanvasRef.current && ['brush', 'pencil', 'color-replacement', 'mixer-brush', 'eraser', 'background-eraser', 'clone-stamp', 'blur-tool', 'sharpen-tool', 'smudge-tool', 'dodge', 'burn', 'sponge'].includes(currentTool)) {
      onCommitLayerEdit(
        activeLayer.id,
        scratchCanvasRef.current,
        currentTool.replace('-', ' ')
      );
      scratchCanvasRef.current = null;
      return;
    }

    // Commit Gradient Tool (Linear, Radial, Angle, Reflected, Diamond)
    if (currentTool === 'gradient' && activeLayer && !activeLayer.locked) {
      const gradCanvas = cloneCanvas(activeLayer.canvas);
      const gCtx = gradCanvas.getContext('2d');
      if (gCtx) {
        const sx = interactionStartRef.current.canvasX - activeLayer.x;
        const sy = interactionStartRef.current.canvasY - activeLayer.y;
        const ex = x - activeLayer.x;
        const ey = y - activeLayer.y;
        const type = settings.gradientType || 'linear';

        gCtx.save();
        if (type === 'radial') {
          const r = Math.hypot(ex - sx, ey - sy);
          const grad = gCtx.createRadialGradient(sx, sy, 0, sx, sy, Math.max(10, r));
          grad.addColorStop(0, settings.foregroundColor);
          grad.addColorStop(1, settings.backgroundColor);
          gCtx.fillStyle = grad;
          gCtx.fillRect(0, 0, gradCanvas.width, gradCanvas.height);
        } else {
          // Linear / Reflected / Angle
          const grad = gCtx.createLinearGradient(sx, sy, ex, ey);
          grad.addColorStop(0, settings.foregroundColor);
          if (type === 'reflected') {
            grad.addColorStop(0.5, settings.backgroundColor);
            grad.addColorStop(1, settings.foregroundColor);
          } else {
            grad.addColorStop(1, settings.backgroundColor);
          }
          gCtx.fillStyle = grad;
          gCtx.fillRect(0, 0, gradCanvas.width, gradCanvas.height);
        }
        gCtx.restore();

        onCommitLayerEdit(activeLayer.id, gradCanvas, `${type} Gradient`);
      }
      return;
    }

    // Commit Vector Shape Tool
    if (['shape-rect', 'shape-rounded-rect', 'shape-ellipse', 'shape-polygon', 'shape-line', 'shape-star', 'custom-shape'].includes(currentTool) && activeLayer && !activeLayer.locked) {
      const shapeCanvas = cloneCanvas(activeLayer.canvas);
      const sCtx = shapeCanvas.getContext('2d');
      if (sCtx) {
        const sx = interactionStartRef.current.canvasX - activeLayer.x;
        const sy = interactionStartRef.current.canvasY - activeLayer.y;
        const ex = x - activeLayer.x;
        const ey = y - activeLayer.y;
        const rx = Math.min(sx, ex);
        const ry = Math.min(sy, ey);
        const rw = Math.abs(ex - sx);
        const rh = Math.abs(ey - sy);

        sCtx.save();
        sCtx.fillStyle = settings.shapeFill;
        sCtx.strokeStyle = settings.shapeStroke;
        sCtx.lineWidth = settings.shapeStrokeWidth;

        if (currentTool === 'shape-line') {
          sCtx.beginPath();
          sCtx.moveTo(sx, sy);
          sCtx.lineTo(ex, ey);
          sCtx.stroke();
        } else if (rw > 3 && rh > 3) {
          if (['shape-rect', 'shape-rounded-rect'].includes(currentTool)) {
            const rad = currentTool === 'shape-rounded-rect' ? Math.max(8, settings.shapeRadius) : settings.shapeRadius;
            if (rad > 0) {
              sCtx.beginPath();
              sCtx.roundRect(rx, ry, rw, rh, rad);
              sCtx.fill();
              if (settings.shapeStrokeWidth > 0) sCtx.stroke();
            } else {
              sCtx.fillRect(rx, ry, rw, rh);
              if (settings.shapeStrokeWidth > 0) sCtx.strokeRect(rx, ry, rw, rh);
            }
          } else if (currentTool === 'shape-ellipse') {
            sCtx.beginPath();
            sCtx.ellipse(rx + rw / 2, ry + rh / 2, rw / 2, rh / 2, 0, 0, Math.PI * 2);
            sCtx.fill();
            if (settings.shapeStrokeWidth > 0) sCtx.stroke();
          } else if (currentTool === 'shape-polygon') {
            drawPolygon(sCtx, rx + rw / 2, ry + rh / 2, settings.polygonSides || 5, rw / 2);
            sCtx.fill();
            if (settings.shapeStrokeWidth > 0) sCtx.stroke();
          } else if (['shape-star', 'custom-shape'].includes(currentTool)) {
            const shapeType = settings.customShapeType || 'star';
            if (shapeType === 'heart') {
              drawHeart(sCtx, rx + rw / 2, ry + rh / 2, rw / 2);
            } else {
              drawStar(sCtx, rx + rw / 2, ry + rh / 2, 5, rw / 2, rw / 4);
            }
            sCtx.fill();
            if (settings.shapeStrokeWidth > 0) sCtx.stroke();
          }
        }
        sCtx.restore();

        onCommitLayerEdit(activeLayer.id, shapeCanvas, `Draw ${currentTool.replace('shape-', '')}`);
      }
    }
  };

  const handleCommitTextInput = () => {
    if (!activeTextInput || !activeLayer || !activeTextInput.text.trim()) {
      setActiveTextInput(null);
      return;
    }

    const tCanvas = cloneCanvas(activeLayer.canvas);
    const ctx = tCanvas.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.font = `${settings.fontWeight} ${settings.fontSize}px "${settings.fontFamily}", sans-serif`;
      ctx.fillStyle = settings.textColor;
      ctx.textAlign = settings.textAlign;
      ctx.textBaseline = 'top';

      const tx = activeTextInput.x - activeLayer.x;
      const ty = activeTextInput.y - activeLayer.y;
      ctx.fillText(activeTextInput.text, tx, ty);
      ctx.restore();

      onCommitLayerEdit(activeLayer.id, tCanvas, 'Horizontal Type');
    }
    setActiveTextInput(null);
  };

  function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  function drawPolygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, sides: number, radius: number) {
    ctx.beginPath();
    const a = (Math.PI * 2) / sides;
    ctx.moveTo(cx + radius, cy);
    for (let i = 1; i < sides; i++) {
      ctx.lineTo(cx + radius * Math.cos(a * i), cy + radius * Math.sin(a * i));
    }
    ctx.closePath();
  }

  function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(cx, cy + size * 0.4);
    ctx.bezierCurveTo(cx - size, cy - topCurveHeight, cx - size * 0.6, cy - size, cx, cy - size * 0.4);
    ctx.bezierCurveTo(cx + size * 0.6, cy - size, cx + size, cy - topCurveHeight, cx, cy + size * 0.4);
    ctx.closePath();
  }

  // Determine CSS cursor based on active tool
  let cursorStyle = 'default';
  if (spacePressed || currentTool === 'hand') cursorStyle = isInteracting ? 'grabbing' : 'grab';
  else if (currentTool === 'zoom') cursorStyle = 'zoom-in';
  else if (currentTool === 'eyedropper' || isSamplingColor) cursorStyle = 'crosshair';
  else if (currentTool === 'remove-tool') cursorStyle = 'crosshair';
  else if (['brush', 'pencil', 'eraser', 'marquee-rect', 'marquee-ellipse', 'lasso', 'lasso-polygon', 'shape-rect', 'shape-ellipse', 'shape-star', 'clone-stamp'].includes(currentTool)) {
    cursorStyle = 'crosshair';
  } else if (['text', 'text-vertical'].includes(currentTool)) cursorStyle = 'text';
  else if (currentTool === 'move') cursorStyle = 'move';

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-[#181818] overflow-hidden select-none relative">
      {/* Top Horizontal Ruler */}
      {showRulers && (
        <div className="h-4 pl-4 shrink-0 bg-[#232323]">
          <Ruler
            orientation="horizontal"
            length={containerRef.current?.clientWidth ? containerRef.current.clientWidth - 16 : 1000}
            zoom={zoom}
            offset={panOffset.x}
            mousePos={cursorPos.x * zoom + panOffset.x}
          />
        </div>
      )}

      {/* Main Workspace Stage */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Vertical Ruler */}
        {showRulers && (
          <div className="w-4 shrink-0 bg-[#232323]">
            <Ruler
              orientation="vertical"
              length={containerRef.current?.clientHeight ? containerRef.current.clientHeight : 800}
              zoom={zoom}
              offset={panOffset.y}
              mousePos={cursorPos.y * zoom + panOffset.y}
            />
          </div>
        )}

        {/* Viewport Canvas Container */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ cursor: cursorStyle }}
          className="flex-1 relative overflow-hidden bg-[#1e1e1e] flex items-center justify-center touch-none"
        >
          {/* Document Canvas Frame (positioned via panOffset and zoom) */}
          <div
            className="absolute shadow-2xl transition-none"
            style={{
              left: `${panOffset.x}px`,
              top: `${panOffset.y}px`,
              width: `${canvasWidth * zoom}px`,
              height: `${canvasHeight * zoom}px`,
            }}
          >
            {/* Transparency checkerboard background */}
            <div className="absolute inset-0 ps-checkerboard pointer-events-none" />

            {/* Composited Image Display Canvas */}
            <canvas
              ref={displayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                imageRendering: zoom >= 2 ? 'pixelated' : 'auto',
              }}
            />

            {/* Quick Mask Mode Ruby Red Mask Overlay */}
            {isQuickMaskActive && (
              <div 
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.45)',
                  mixBlendMode: 'multiply',
                }}
              />
            )}

            {/* Marching Ants Selection Overlay */}
            {selection.active && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              >
                {selection.type === 'rect' && (
                  <rect
                    x={selection.x}
                    y={selection.y}
                    width={selection.width}
                    height={selection.height}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1 / zoom}
                    className="ps-marching-ants"
                  />
                )}
                {selection.type === 'ellipse' && (
                  <ellipse
                    cx={selection.x + selection.width / 2}
                    cy={selection.y + selection.height / 2}
                    rx={selection.width / 2}
                    ry={selection.height / 2}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1 / zoom}
                    className="ps-marching-ants"
                  />
                )}
                {selection.type === 'lasso' && selection.points && selection.points.length > 1 && (
                  <polygon
                    points={selection.points.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1 / zoom}
                    className="ps-marching-ants"
                  />
                )}
              </svg>
            )}

            {/* Polygonal Lasso rubber-band line preview */}
            {polyLassoPoints.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible"
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              >
                <polyline
                  points={[...polyLassoPoints, cursorPos].map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={1.5 / zoom}
                  strokeDasharray="4 4"
                />
                {polyLassoPoints.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={3 / zoom}
                    fill={i === 0 ? '#f43f5e' : '#ffffff'}
                    stroke="#000000"
                    strokeWidth={1 / zoom}
                  />
                ))}
              </svg>
            )}

            {/* Clone Stamp Anchor Crosshair Marker */}
            {cloneSource && currentTool === 'clone-stamp' && (
              <div
                className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${cloneSource.x * zoom}px`,
                  top: `${cloneSource.y * zoom}px`,
                }}
              >
                <div className="w-5 h-5 rounded-full border border-white flex items-center justify-center shadow-md">
                  <div className="w-2.5 h-[1px] bg-white absolute" />
                  <div className="h-2.5 w-[1px] bg-white absolute" />
                </div>
              </div>
            )}

            {/* Ruler Measurement Line Overlay */}
            {rulerMeasure && currentTool === 'ruler-tool' && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible"
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              >
                <line
                  x1={rulerMeasure.startX}
                  y1={rulerMeasure.startY}
                  x2={rulerMeasure.endX}
                  y2={rulerMeasure.endY}
                  stroke="#00a8ff"
                  strokeWidth={2 / zoom}
                />
                <circle cx={rulerMeasure.startX} cy={rulerMeasure.startY} r={3 / zoom} fill="#ffffff" />
                <circle cx={rulerMeasure.endX} cy={rulerMeasure.endY} r={3 / zoom} fill="#ffffff" />
                <text
                  x={rulerMeasure.endX + 8 / zoom}
                  y={rulerMeasure.endY + 8 / zoom}
                  fill="#ffffff"
                  fontSize={11 / zoom}
                  fontFamily="monospace"
                  className="bg-black/80 px-1"
                >
                  {rulerMeasure.dist}px ({rulerMeasure.angle}°)
                </text>
              </svg>
            )}

            {/* Eyedropper Sampling Loupe / Ring */}
            {isSamplingColor && (
              <div
                className="absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${cursorPos.x * zoom}px`,
                  top: `${cursorPos.y * zoom}px`,
                }}
              >
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-2xl overflow-hidden flex flex-col">
                  {/* Top half = new color */}
                  <div className="flex-1" style={{ backgroundColor: sampledColor }} />
                  {/* Bottom half = current foreground */}
                  <div className="flex-1" style={{ backgroundColor: settings.foregroundColor }} />
                </div>
              </div>
            )}

            {/* Crop Box Overlay */}
            {cropBox && currentTool === 'crop' && (
              <div
                className="absolute border-2 border-white shadow-2xl z-30 pointer-events-none"
                style={{
                  left: `${cropBox.x * zoom}px`,
                  top: `${cropBox.y * zoom}px`,
                  width: `${cropBox.width * zoom}px`,
                  height: `${cropBox.height * zoom}px`,
                }}
              >
                {/* 3x3 Rule of thirds grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>
              </div>
            )}

            {/* Inline Text Input Box */}
            {activeTextInput && (
              <div
                className="absolute z-50 bg-[#222222]/95 border-2 border-[#00a8ff] p-2 rounded shadow-2xl"
                style={{
                  left: `${activeTextInput.x * zoom}px`,
                  top: `${activeTextInput.y * zoom}px`,
                  transform: 'translate(-10px, -10px)',
                }}
              >
                <input
                  type="text"
                  autoFocus
                  value={activeTextInput.text}
                  onChange={(e) => setActiveTextInput({ ...activeTextInput, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCommitTextInput();
                    if (e.key === 'Escape') setActiveTextInput(null);
                  }}
                  className="bg-[#111111] border border-[#555555] rounded px-2 py-1 text-white text-[13px] outline-none"
                />
                <div className="flex justify-end gap-1.5 mt-1.5 text-[10px]">
                  <button
                    onClick={handleCommitTextInput}
                    className="px-2 py-0.5 bg-[#00a8ff] text-white rounded font-medium"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setActiveTextInput(null)}
                    className="px-2 py-0.5 bg-[#444444] text-[#cccccc] rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Floating Contextual Taskbar (Photoshop Signature Bar) */}
          {(selection.active || variations.length > 0) && onApplyGenerativeFill && (
            <ContextualTaskbar
              selection={selection}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              zoom={zoom}
              panOffset={panOffset}
              onApplyGenerativeFill={onApplyGenerativeFill}
              onSelectSubject={onSelectSubject || (async () => {})}
              onRemoveBackground={onRemoveBackground || (async () => {})}
              onInvertSelection={onInvertSelection || (() => {})}
              onDeselect={onDeselect || (() => {})}
              onClearSelection={onClearSelection || (() => {})}
              variations={variations}
              activeVariationIndex={activeVariationIndex}
              onSelectVariation={onSelectVariation}
              onAcceptVariation={onAcceptVariation}
              onDiscardVariation={onDiscardVariation}
              isGenerating={isGenerating}
            />
          )}
        </div>
      </div>

      {/* Photoshop Status Bar */}
      <div className="h-6 bg-[#232323] border-t border-[#383838] px-3 flex items-center justify-between text-[10px] text-[#8e8e8e] select-none font-mono shrink-0">
        <div className="flex items-center gap-4">
          <span className="tabular-nums text-[#cccccc]">
            {canvasWidth} × {canvasHeight} px
          </span>
          <span className="text-[#555555]">|</span>
          <span className="tabular-nums text-[#00a8ff]">
            Zoom: {Math.round(zoom * 100)}%
          </span>
          <span className="text-[#555555]">|</span>
          <span className="tabular-nums">
            X: {cursorPos.x}px  Y: {cursorPos.y}px
          </span>
          {hoverColor && (
            <>
              <span className="text-[#555555]">|</span>
              <span className="flex items-center gap-1">
                <span
                  className="w-2.5 h-2.5 rounded-xs border border-[#555555] inline-block"
                  style={{ backgroundColor: `rgb(${hoverColor.r},${hoverColor.g},${hoverColor.b})` }}
                />
                <span className="tabular-nums">
                  RGB: {hoverColor.r}, {hoverColor.g}, {hoverColor.b}
                </span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span>Active Layer: {activeLayer?.name || 'None'}</span>
          <span className="text-[#555555]">|</span>
          <span className="text-[#aaaaaa]">Space: Pan · Alt: Sample/Clone · Double-Click: Close Lasso</span>
        </div>
      </div>
    </div>
  );
};
