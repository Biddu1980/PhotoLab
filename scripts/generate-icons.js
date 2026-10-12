import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Creates a raw RGBA PNG buffer with given width, height, and pixel generator callback
function createPng(width, height, getPixel) {
  // 8 bytes PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: 13 bytes
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth: 8
  ihdrData.writeUInt8(6, 9); // color type: 6 (RGBA)
  ihdrData.writeUInt8(0, 10); // compression method
  ihdrData.writeUInt8(0, 11); // filter method
  ihdrData.writeUInt8(0, 12); // interlace method

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with filter type 0 (None) before each scanline
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * scanlineLength;
    rawData[lineOffset] = 0; // Filter byte: 0

    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = lineOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Compress raw image data with zlib
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buffer = Buffer.alloc(8 + len + 4);
  buffer.writeUInt32BE(len, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  // Compute CRC32
  const crc = crc32(buffer.subarray(4, 8 + len));
  buffer.writeUInt32BE(crc >>> 0, 8 + len);
  return buffer;
}

// CRC32 implementation
let crcTable = null;
function makeCrcTable() {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

function crc32(buf) {
  if (!crcTable) crcTable = makeCrcTable();
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

// Photoshop "Ps" icon pixel generator
function photoshopIconPixel(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Background rounded rectangle
  const pad = isMaskable ? 0.05 : 0.08;
  const radius = 0.2;

  // Outer border / background
  const darkBlueR = 2, darkBlueG = 18, darkBlueB = 40;
  const deepNavyR = 0, deepNavyG = 8, deepNavyB = 20;

  // Interpolate gradient
  const grad = ny;
  let bgR = Math.round(darkBlueR * (1 - grad) + deepNavyR * grad);
  let bgG = Math.round(darkBlueG * (1 - grad) + deepNavyG * grad);
  let bgB = Math.round(darkBlueB * (1 - grad) + deepNavyB * grad);

  // Border check
  const distFromEdgeX = Math.min(nx, 1 - nx);
  const distFromEdgeY = Math.min(ny, 1 - ny);
  const isBorder = (distFromEdgeX < pad + 0.02 && distFromEdgeX >= pad) || (distFromEdgeY < pad + 0.02 && distFromEdgeY >= pad);

  if (isBorder) {
    return [0, 168, 255, 255]; // Neon cyan border
  }

  // Draw stylized letter "P" and "s" in the center
  // Center is around x: 0.25 to 0.5 for P, 0.55 to 0.8 for s, y: 0.35 to 0.65
  const inP_stem = nx >= 0.25 && nx <= 0.33 && ny >= 0.30 && ny <= 0.72;
  const inP_loopTop = nx >= 0.33 && nx <= 0.48 && ny >= 0.30 && ny <= 0.38;
  const inP_loopMid = nx >= 0.33 && nx <= 0.48 && ny >= 0.48 && ny <= 0.56;
  const inP_loopRight = nx >= 0.43 && nx <= 0.51 && ny >= 0.30 && ny <= 0.56;

  const inP = inP_stem || inP_loopTop || inP_loopMid || inP_loopRight;

  const inS_top = nx >= 0.57 && nx <= 0.77 && ny >= 0.35 && ny <= 0.43;
  const inS_mid = nx >= 0.57 && nx <= 0.77 && ny >= 0.49 && ny <= 0.57;
  const inS_bot = nx >= 0.57 && nx <= 0.77 && ny >= 0.64 && ny <= 0.72;
  const inS_left = nx >= 0.55 && nx <= 0.63 && ny >= 0.40 && ny <= 0.52;
  const inS_right = nx >= 0.71 && nx <= 0.79 && ny >= 0.54 && ny <= 0.68;

  const inS = inS_top || inS_mid || inS_bot || inS_left || inS_right;

  if (inP || inS) {
    // Glowing cyan/sky blue
    const cyR = 56, cyG = 189, cyB = 248;
    return [cyR, cyG, cyB, 255];
  }

  // Corner clipping for non-maskable
  if (!isMaskable) {
    if ((nx < pad && ny < pad) || (nx > 1 - pad && ny < pad) || 
        (nx < pad && ny > 1 - pad) || (nx > 1 - pad && ny > 1 - pad)) {
      // outside corners
      const cx = nx < pad ? pad : 1 - pad;
      const cy = ny < pad ? pad : 1 - pad;
      const d = Math.hypot(nx - cx, ny - cy);
      if (d > pad) {
        return [0, 0, 0, 0]; // transparent outside
      }
    }
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 192x192
const png192 = createPng(192, 192, (x, y, w, h) => photoshopIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

// 512x512
const png512 = createPng(512, 512, (x, y, w, h) => photoshopIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

// 512x512 Maskable
const pngMaskable = createPng(512, 512, (x, y, w, h) => photoshopIconPixel(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable);

// Apple touch icon 180x180
const pngApple = createPng(180, 180, (x, y, w, h) => photoshopIconPixel(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple);

// Favicon ico placeholder (or copy 192)
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png192);

console.log('Successfully generated all PWA PNG icons!');
