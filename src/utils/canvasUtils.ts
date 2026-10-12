import { Layer, LayerAdjustments, BlendMode } from '../types/photoshop';

/**
 * Creates an empty offscreen HTMLCanvasElement of specified dimensions
 */
export function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/**
 * Deep clones a canvas and its pixels
 */
export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const copy = createOffscreenCanvas(source.width, source.height);
  const ctx = copy.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0);
  }
  return copy;
}

/**
 * Builds CSS filter string from layer adjustments
 */
export function getAdjustmentFilterString(adj: LayerAdjustments): string {
  const filters: string[] = [];

  if (adj.brightness !== 0) {
    filters.push(`brightness(${100 + adj.brightness}%)`);
  }
  if (adj.contrast !== 0) {
    filters.push(`contrast(${100 + adj.contrast}%)`);
  }
  if (adj.saturation !== 0) {
    filters.push(`saturate(${100 + adj.saturation}%)`);
  }
  if (adj.hue !== 0) {
    filters.push(`hue-rotate(${adj.hue}deg)`);
  }
  if (adj.invert > 0) {
    filters.push(`invert(${adj.invert}%)`);
  }
  if (adj.sepia > 0) {
    filters.push(`sepia(${adj.sepia}%)`);
  }
  if (adj.grayscale > 0) {
    filters.push(`grayscale(${adj.grayscale}%)`);
  }
  if (adj.blur > 0) {
    filters.push(`blur(${adj.blur}px)`);
  }

  return filters.length > 0 ? filters.join(' ') : 'none';
}

/**
 * Composites all visible layers into a single canvas
 */
export function compositeLayers(
  layers: Layer[],
  width: number,
  height: number,
  destCanvas?: HTMLCanvasElement
): HTMLCanvasElement {
  const target = destCanvas || createOffscreenCanvas(width, height);
  const ctx = target.getContext('2d');
  if (!ctx) return target;

  ctx.clearRect(0, 0, width, height);

  for (const layer of layers) {
    if (!layer.visible) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100));
    ctx.globalCompositeOperation = (layer.blendMode as GlobalCompositeOperation) || 'source-over';

    const filterStr = getAdjustmentFilterString(layer.adjustments);
    if (filterStr !== 'none') {
      ctx.filter = filterStr;
    }

    ctx.drawImage(layer.canvas, layer.x, layer.y);
    ctx.restore();
  }

  return target;
}

/**
 * Generates small base64 thumbnail of a layer or composited canvas
 */
export function generateThumbnail(source: HTMLCanvasElement, size = 48): string {
  const thumb = createOffscreenCanvas(size, size);
  const ctx = thumb.getContext('2d');
  if (!ctx) return '';

  const scale = Math.min(size / source.width, size / source.height);
  const dw = source.width * scale;
  const dh = source.height * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;

  ctx.drawImage(source, dx, dy, dw, dh);
  return thumb.toDataURL('image/png');
}

/**
 * Color picker utility to read RGB hex at specific coordinates
 */
export function samplePixelColor(canvas: HTMLCanvasElement, x: number, y: number): { hex: string; r: number; g: number; b: number; a: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx || x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
    return { hex: '#000000', r: 0, g: 0, b: 0, a: 0 };
  }

  const p = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
  const hex = '#' + [p[0], p[1], p[2]].map(c => c.toString(16).padStart(2, '0')).join('');
  return { hex, r: p[0], g: p[1], b: p[2], a: p[3] };
}

/**
 * Flood Fill (Paint bucket) with tolerance
 */
export function floodFill(
  canvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance = 32
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  startX = Math.floor(startX);
  startY = Math.floor(startY);

  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Parse fill color
  const fc = hexToRgba(fillColorHex);

  const startIndex = (startY * w + startX) * 4;
  const startR = data[startIndex];
  const startG = data[startIndex + 1];
  const startB = data[startIndex + 2];
  const startA = data[startIndex + 3];

  // If already close to fill color, do nothing
  if (
    colorDistance(startR, startG, startB, startA, fc.r, fc.g, fc.b, 255) <= 5
  ) {
    return;
  }

  const visited = new Uint8Array(w * h);
  const queue: number[] = [startX + startY * w];
  visited[startX + startY * w] = 1;

  while (queue.length > 0) {
    const idx = queue.pop()!;
    const px = idx % w;
    const py = Math.floor(idx / w);
    const pixelIndex = idx * 4;

    data[pixelIndex] = fc.r;
    data[pixelIndex + 1] = fc.g;
    data[pixelIndex + 2] = fc.b;
    data[pixelIndex + 3] = 255;

    // Check 4-connected neighbors
    const neighbors = [
      [px + 1, py],
      [px - 1, py],
      [px, py + 1],
      [px, py - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nIdx = nx + ny * w;
        if (!visited[nIdx]) {
          const nDataIdx = nIdx * 4;
          const dist = colorDistance(
            data[nDataIdx],
            data[nDataIdx + 1],
            data[nDataIdx + 2],
            data[nDataIdx + 3],
            startR,
            startG,
            startB,
            startA
          );

          if (dist <= tolerance) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Flood Erase (Magic Eraser Tool) with tolerance
 * Erases contiguous pixels matching the source color to transparent
 */
export function floodErase(
  canvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  tolerance = 32
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  startX = Math.floor(startX);
  startY = Math.floor(startY);

  if (startX < 0 || startY < 0 || startX >= w || startY >= h) return;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const startIndex = (startY * w + startX) * 4;
  const startR = data[startIndex];
  const startG = data[startIndex + 1];
  const startB = data[startIndex + 2];
  const startA = data[startIndex + 3];

  if (startA === 0) return; // Already transparent

  const visited = new Uint8Array(w * h);
  const queue: number[] = [startX + startY * w];
  visited[startX + startY * w] = 1;

  while (queue.length > 0) {
    const idx = queue.pop()!;
    const px = idx % w;
    const py = Math.floor(idx / w);
    const pixelIndex = idx * 4;

    data[pixelIndex + 3] = 0; // Erase alpha

    const neighbors = [
      [px + 1, py],
      [px - 1, py],
      [px, py + 1],
      [px, py - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nIdx = nx + ny * w;
        if (!visited[nIdx]) {
          const nDataIdx = nIdx * 4;
          const dist = colorDistance(
            data[nDataIdx],
            data[nDataIdx + 1],
            data[nDataIdx + 2],
            data[nDataIdx + 3],
            startR,
            startG,
            startB,
            startA
          );

          if (dist <= tolerance) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function colorDistance(r1: number, g1: number, b1: number, a1: number, r2: number, g2: number, b2: number, a2: number) {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2) +
    Math.pow(a1 - a2, 2)
  ) / 2;
}

export function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    a: 255,
  };
}

/**
 * Apply Convolution Filter Matrix (Sharpen, Edge Detect, Emboss)
 */
export function applyConvolution(
  canvas: HTMLCanvasElement,
  kernel: number[],
  divisor?: number,
  offset = 0
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const src = ctx.getImageData(0, 0, w, h);
  const dst = ctx.createImageData(w, h);
  const srcData = src.data;
  const dstData = dst.data;

  const kLen = kernel.length;
  const kSize = Math.round(Math.sqrt(kLen));
  const half = Math.floor(kSize / 2);

  const calcDivisor = divisor !== undefined ? divisor : kernel.reduce((a, b) => a + b, 0) || 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      const dstIdx = (y * w + x) * 4;

      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const px = Math.min(w - 1, Math.max(0, x + kx - half));
          const py = Math.min(h - 1, Math.max(0, y + ky - half));
          const srcIdx = (py * w + px) * 4;
          const kVal = kernel[ky * kSize + kx];

          r += srcData[srcIdx] * kVal;
          g += srcData[srcIdx + 1] * kVal;
          b += srcData[srcIdx + 2] * kVal;
        }
      }

      dstData[dstIdx] = Math.min(255, Math.max(0, r / calcDivisor + offset));
      dstData[dstIdx + 1] = Math.min(255, Math.max(0, g / calcDivisor + offset));
      dstData[dstIdx + 2] = Math.min(255, Math.max(0, b / calcDivisor + offset));
      dstData[dstIdx + 3] = srcData[dstIdx + 3];
    }
  }

  ctx.putImageData(dst, 0, 0);
}

/**
 * Apply Pixelate / Mosaic Filter
 */
export function applyPixelate(canvas: HTMLCanvasElement, blockSize = 8): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y += blockSize) {
    for (let x = 0; x < w; x += blockSize) {
      let r = 0, g = 0, b = 0, a = 0;
      let count = 0;

      for (let dy = 0; dy < blockSize && y + dy < h; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          a += data[idx + 3];
          count++;
        }
      }

      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      a = Math.round(a / count);

      for (let dy = 0; dy < blockSize && y + dy < h; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < w; dx++) {
          const idx = ((y + dy) * w + (x + dx)) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = a;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Apply Vignette Effect
 */
export function applyVignette(canvas: HTMLCanvasElement, strength = 0.6): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const radius = Math.max(w, h) * 0.7;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.3, w / 2, h / 2, radius);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Apply Noise Filter
 */
export function applyNoise(canvas: HTMLCanvasElement, amount = 25): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const noise = (Math.random() - 0.5) * amount * 2;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Content-Aware Inpainting / Patch Fill
 * Used when user executes Generative Eraser or inpainting locally
 */
export function localContentAwareInpaint(
  canvas: HTMLCanvasElement,
  bounds: { x: number; y: number; width: number; height: number }
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { x, y, width, height } = bounds;
  const bx = Math.max(0, Math.floor(x));
  const by = Math.max(0, Math.floor(y));
  const bw = Math.min(canvas.width - bx, Math.ceil(width));
  const bh = Math.min(canvas.height - by, Math.ceil(height));

  if (bw <= 0 || bh <= 0) return;

  // Sample perimeter pixels surrounding the bounding box
  const pad = 12;
  const sx = Math.max(0, bx - pad);
  const sy = Math.max(0, by - pad);
  const sw = Math.min(canvas.width - sx, bw + pad * 2);
  const sh = Math.min(canvas.height - sy, bh + pad * 2);

  // Soft blend from surroundings into target
  ctx.save();
  // Draw a smooth radial or linear gradient derived from surrounding dominant tones
  const p1 = samplePixelColor(canvas, sx, sy);
  const p2 = samplePixelColor(canvas, sx + sw - 1, sy);
  const p3 = samplePixelColor(canvas, sx, sy + sh - 1);
  const p4 = samplePixelColor(canvas, sx + sw - 1, sy + sh - 1);

  const grad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  grad.addColorStop(0, p1.hex);
  grad.addColorStop(0.33, p2.hex);
  grad.addColorStop(0.66, p3.hex);
  grad.addColorStop(1, p4.hex);

  ctx.fillStyle = grad;
  ctx.fillRect(bx, by, bw, bh);

  // Add subtle texture noise to match surroundings
  const patchCanvas = createOffscreenCanvas(bw, bh);
  const patchCtx = patchCanvas.getContext('2d');
  if (patchCtx) {
    patchCtx.drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh);
    applyNoise(patchCanvas, 14);
    ctx.drawImage(patchCanvas, bx, by);
  }
  ctx.restore();
}

/**
 * Procedural Art Generation for Sample Projects
 */
export function generateNebulaProject(width = 1200, height = 800): Layer[] {
  // Layer 1: Cosmic Background Gradient
  const bgCanvas = createOffscreenCanvas(width, height);
  const bgCtx = bgCanvas.getContext('2d')!;
  const bgGrad = bgCtx.createRadialGradient(width * 0.4, height * 0.5, 50, width * 0.5, height * 0.5, width * 0.8);
  bgGrad.addColorStop(0, '#1a0b36');
  bgGrad.addColorStop(0.4, '#0d0722');
  bgGrad.addColorStop(1, '#05020a');
  bgCtx.fillStyle = bgGrad;
  bgCtx.fillRect(0, 0, width, height);

  // Layer 2: Nebula Clouds & Dust
  const nebCanvas = createOffscreenCanvas(width, height);
  const nebCtx = nebCanvas.getContext('2d')!;
  
  // Magenta cloud
  const mGrad = nebCtx.createRadialGradient(width * 0.35, height * 0.45, 10, width * 0.35, height * 0.45, width * 0.35);
  mGrad.addColorStop(0, 'rgba(236, 72, 153, 0.7)');
  mGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.35)');
  mGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  nebCtx.fillStyle = mGrad;
  nebCtx.beginPath();
  nebCtx.arc(width * 0.35, height * 0.45, width * 0.35, 0, Math.PI * 2);
  nebCtx.fill();

  // Cyan cloud
  const cGrad = nebCtx.createRadialGradient(width * 0.65, height * 0.55, 10, width * 0.65, height * 0.55, width * 0.4);
  cGrad.addColorStop(0, 'rgba(6, 182, 212, 0.65)');
  cGrad.addColorStop(0.4, 'rgba(59, 130, 246, 0.3)');
  cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  nebCtx.fillStyle = cGrad;
  nebCtx.beginPath();
  nebCtx.arc(width * 0.65, height * 0.55, width * 0.4, 0, Math.PI * 2);
  nebCtx.fill();

  // Amber flare
  const aGrad = nebCtx.createRadialGradient(width * 0.5, height * 0.38, 5, width * 0.5, height * 0.38, width * 0.2);
  aGrad.addColorStop(0, 'rgba(251, 191, 36, 0.75)');
  aGrad.addColorStop(0.3, 'rgba(249, 115, 22, 0.4)');
  aGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  nebCtx.fillStyle = aGrad;
  nebCtx.beginPath();
  nebCtx.arc(width * 0.5, height * 0.38, width * 0.2, 0, Math.PI * 2);
  nebCtx.fill();

  // Layer 3: Starfield & Sparkling Particles
  const starsCanvas = createOffscreenCanvas(width, height);
  const starsCtx = starsCanvas.getContext('2d')!;
  for (let i = 0; i < 400; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height;
    const sr = Math.random() * 2 + 0.5;
    const alpha = Math.random() * 0.8 + 0.2;
    starsCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    starsCtx.beginPath();
    starsCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    starsCtx.fill();
    // 4-point lens star spikes on bright stars
    if (sr > 2.2 && Math.random() > 0.4) {
      starsCtx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
      starsCtx.lineWidth = 0.75;
      starsCtx.beginPath();
      starsCtx.moveTo(sx - 12, sy);
      starsCtx.lineTo(sx + 12, sy);
      starsCtx.moveTo(sx, sy - 12);
      starsCtx.lineTo(sx, sy + 12);
      starsCtx.stroke();
    }
  }

  // Layer 4: Floating Celestial Sphere Shape
  const planetCanvas = createOffscreenCanvas(width, height);
  const pCtx = planetCanvas.getContext('2d')!;
  const px = width * 0.5;
  const py = height * 0.48;
  const pr = 130;
  
  // Planet body
  const pGrad = pCtx.createRadialGradient(px - 40, py - 40, 10, px, py, pr);
  pGrad.addColorStop(0, '#f8fafc');
  pGrad.addColorStop(0.3, '#38bdf8');
  pGrad.addColorStop(0.7, '#1e1b4b');
  pGrad.addColorStop(1, '#090514');
  pCtx.fillStyle = pGrad;
  pCtx.beginPath();
  pCtx.arc(px, py, pr, 0, Math.PI * 2);
  pCtx.fill();

  // Planet planetary ring
  pCtx.save();
  pCtx.translate(px, py);
  pCtx.rotate(-Math.PI / 6);
  pCtx.beginPath();
  pCtx.ellipse(0, 0, pr * 1.8, pr * 0.35, 0, 0, Math.PI * 2);
  pCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  pCtx.lineWidth = 8;
  pCtx.stroke();
  pCtx.restore();

  // Layer 5: Modern Typography Header
  const textCanvas = createOffscreenCanvas(width, height);
  const tCtx = textCanvas.getContext('2d')!;
  tCtx.textAlign = 'center';
  tCtx.textBaseline = 'middle';
  tCtx.font = 'bold 54px "Plus Jakarta Sans", sans-serif';
  tCtx.fillStyle = '#ffffff';
  tCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  tCtx.shadowBlur = 12;
  tCtx.fillText('STELLAR ODYSSEY', width / 2, height * 0.82);

  tCtx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  tCtx.fillStyle = '#94a3b8';
  tCtx.letterSpacing = '6px';
  tCtx.fillText('CREATIVE HORIZON · EDITION 2026', width / 2, height * 0.88);

  const defaultAdjustments: LayerAdjustments = {
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
  };

  return [
    {
      id: 'layer-1',
      name: 'Deep Space Background',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'source-over',
      canvas: bgCanvas,
      x: 0,
      y: 0,
      width,
      height,
      adjustments: { ...defaultAdjustments },
    },
    {
      id: 'layer-2',
      name: 'Nebula Gas Clouds',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 85,
      blendMode: 'screen',
      canvas: nebCanvas,
      x: 0,
      y: 0,
      width,
      height,
      adjustments: { ...defaultAdjustments },
    },
    {
      id: 'layer-3',
      name: 'Starfield Array',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 95,
      blendMode: 'screen',
      canvas: starsCanvas,
      x: 0,
      y: 0,
      width,
      height,
      adjustments: { ...defaultAdjustments },
    },
    {
      id: 'layer-4',
      name: 'Celestial Orb & Ring',
      type: 'shape',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'source-over',
      canvas: planetCanvas,
      x: 0,
      y: 0,
      width,
      height,
      adjustments: { ...defaultAdjustments },
      shapeData: {
        shapeType: 'ellipse',
        fill: '#38bdf8',
        stroke: '#ffffff',
        strokeWidth: 4,
      },
    },
    {
      id: 'layer-5',
      name: 'Title Typography',
      type: 'text',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'source-over',
      canvas: textCanvas,
      x: 0,
      y: 0,
      width,
      height,
      adjustments: { ...defaultAdjustments },
      textData: {
        text: 'STELLAR ODYSSEY',
        fontSize: 54,
        fontFamily: 'Plus Jakarta Sans',
        color: '#ffffff',
        fontWeight: 'bold',
        align: 'center',
      },
    },
  ];
}

/**
 * Generate Cyberpunk Poster Sample Project
 */
export function generateCyberpunkProject(width = 1000, height = 1000): Layer[] {
  const bgCanvas = createOffscreenCanvas(width, height);
  const bgCtx = bgCanvas.getContext('2d')!;
  const bgGrad = bgCtx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#1e1b4b');
  bgGrad.addColorStop(1, '#020617');
  bgCtx.fillStyle = bgGrad;
  bgCtx.fillRect(0, 0, width, height);

  // Perspective Neon Grid
  const gridCanvas = createOffscreenCanvas(width, height);
  const gCtx = gridCanvas.getContext('2d')!;
  gCtx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
  gCtx.lineWidth = 1.5;

  // Horizon
  const horizon = height * 0.55;
  // Vanishing point lines
  for (let x = -width; x < width * 2; x += 60) {
    gCtx.beginPath();
    gCtx.moveTo(width / 2, horizon);
    gCtx.lineTo(x, height);
    gCtx.stroke();
  }
  // Horizontal grid lines
  for (let y = horizon + 10; y <= height; y += (y - horizon) * 0.28 + 4) {
    gCtx.beginPath();
    gCtx.moveTo(0, y);
    gCtx.lineTo(width, y);
    gCtx.stroke();
  }

  // Neon Sun
  const sunCanvas = createOffscreenCanvas(width, height);
  const sCtx = sunCanvas.getContext('2d')!;
  const sGrad = sCtx.createLinearGradient(0, horizon - 220, 0, horizon);
  sGrad.addColorStop(0, '#f43f5e');
  sGrad.addColorStop(0.5, '#fb923c');
  sGrad.addColorStop(1, '#facc15');
  sCtx.fillStyle = sGrad;
  sCtx.beginPath();
  sCtx.arc(width / 2, horizon - 30, 160, 0, Math.PI * 2);
  sCtx.fill();

  // Cut-out stripes through sun
  sCtx.fillStyle = '#1e1b4b';
  for (let sy = horizon - 90; sy < horizon + 130; sy += 16) {
    const stripH = (sy - (horizon - 90)) * 0.08 + 2;
    sCtx.fillRect(width / 2 - 180, sy, 360, stripH);
  }

  // Modern Typography
  const tCanvas = createOffscreenCanvas(width, height);
  const tCtx = tCanvas.getContext('2d')!;
  tCtx.textAlign = 'center';
  tCtx.font = 'bold 72px "Plus Jakarta Sans", sans-serif';
  tCtx.fillStyle = '#00f0ff';
  tCtx.shadowColor = 'rgba(0, 240, 255, 0.8)';
  tCtx.shadowBlur = 20;
  tCtx.fillText('NEO TOKYO', width / 2, 220);

  const defaultAdjustments: LayerAdjustments = {
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
  };

  return [
    {
      id: 'cp-1',
      name: 'Night Horizon Canvas',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'source-over',
      canvas: bgCanvas,
      x: 0,
      y: 0,
      width,
      height,
      adjustments: { ...defaultAdjustments },
    },
    {
      id: 'cp-2',
      name: 'Retrowave Neon Grid',
      type: 'raster',
      visible: true,
      locked: false,
      opacity: 90,
      blendMode: 'screen',
      canvas: gridCanvas,
      x: 0,
      y: 0,
      width,
      height,
      adjustments: { ...defaultAdjustments },
    },
    {
      id: 'cp-3',
      name: 'Segmented Synth Sun',
      type: 'shape',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'source-over',
      canvas: sunCanvas,
      x: 0,
      y: 0,
      width,
      height,
      adjustments: { ...defaultAdjustments },
    },
    {
      id: 'cp-4',
      name: 'Cyberpunk Vector Header',
      type: 'text',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'screen',
      canvas: tCanvas,
      x: 0,
      y: 0,
      width,
      height,
      adjustments: { ...defaultAdjustments },
      textData: {
        text: 'NEO TOKYO',
        fontSize: 72,
        fontFamily: 'Plus Jakarta Sans',
        color: '#00f0ff',
        fontWeight: 'bold',
        align: 'center',
      },
    },
  ];
}
