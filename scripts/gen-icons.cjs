const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Happiness gradient colors matching the slider
const COLORS = [
  [0xe0, 0x68, 0x58], // 1 - red/terracotta
  [0xe0, 0x68, 0x58],
  [0xe4, 0x80, 0x48],
  [0xe8, 0x98, 0x40],
  [0xe8, 0xa8, 0x38], // ~5.5 - amber
  [0xd4, 0xb0, 0x40],
  [0xb8, 0xc0, 0x40],
  [0x90, 0xb8, 0x44],
  [0x6a, 0xb8, 0x48], // 10 - green
  [0x6a, 0xb8, 0x48],
];

const BG = [0xf5, 0xec, 0xe0, 0xff];

function makeIcon(size) {
  const png = new PNG({ width: size, height: size });
  const radius = size * 0.22;

  function inRoundedRect(x, y, w, h, r) {
    if (x < r && y < r) {
      const dx = r - x;
      const dy = r - y;
      return dx * dx + dy * dy <= r * r;
    }
    if (x >= w - r && y < r) {
      const dx = x - (w - r - 1);
      const dy = r - y;
      return dx * dx + dy * dy <= r * r;
    }
    if (x < r && y >= h - r) {
      const dx = r - x;
      const dy = y - (h - r - 1);
      return dx * dx + dy * dy <= r * r;
    }
    if (x >= w - r && y >= h - r) {
      const dx = x - (w - r - 1);
      const dy = y - (h - r - 1);
      return dx * dx + dy * dy <= r * r;
    }
    return true;
  }

  // Fill background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      if (inRoundedRect(x, y, size, size, radius)) {
        png.data[idx] = BG[0];
        png.data[idx + 1] = BG[1];
        png.data[idx + 2] = BG[2];
        png.data[idx + 3] = BG[3];
      } else {
        png.data[idx + 3] = 0;
      }
    }
  }

  // Draw a 5x5 grid of cells, like the Memento Mori
  const cols = 5;
  const rows = 5;
  const margin = size * 0.16;
  const gap = size * 0.03;
  const cellSize = (size - margin * 2 - gap * (cols - 1)) / cols;
  const cellRadius = cellSize * 0.15;

  // Pseudo-random happiness values for visual variety
  const values = [
    1, 3, 5, 7, 9,
    2, 4, 6, 8, 10,
    1, 3, 6, 7, 9,
    3, 5, 7, 8, 10,
    2, 4, 6, 8, 9,
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const vIdx = row * cols + col;
      const happiness = values[vIdx];
      const colorIdx = Math.min(COLORS.length - 1, Math.max(0, happiness - 1));
      const color = COLORS[colorIdx];
      // Last row: faded (future)
      const alpha = row === rows - 1 ? 0.3 : 1.0;
      const alphaByte = Math.round(0xff * alpha);

      const cx = margin + col * (cellSize + gap);
      const cy = margin + row * (cellSize + gap);

      for (let y = 0; y < cellSize; y++) {
        for (let x = 0; x < cellSize; x++) {
          const px = Math.round(cx + x);
          const py = Math.round(cy + y);
          if (px < 0 || px >= size || py < 0 || py >= size) continue;

          // Rounded corners on cells
          const cr = cellRadius;
          if (x < cr && y < cr) {
            if ((cr - x) * (cr - x) + (cr - y) * (cr - y) > cr * cr) continue;
          }
          if (x >= cellSize - cr && y < cr) {
            if ((x - (cellSize - cr - 1)) ** 2 + (cr - y) ** 2 > cr * cr) continue;
          }
          if (x < cr && y >= cellSize - cr) {
            if ((cr - x) ** 2 + (y - (cellSize - cr - 1)) ** 2 > cr * cr) continue;
          }
          if (x >= cellSize - cr && y >= cellSize - cr) {
            if ((x - (cellSize - cr - 1)) ** 2 + (y - (cellSize - cr - 1)) ** 2 > cr * cr) continue;
          }

          const idx = (size * py + px) << 2;
          png.data[idx] = color[0];
          png.data[idx + 1] = color[1];
          png.data[idx + 2] = color[2];
          png.data[idx + 3] = alphaByte;
        }
      }
    }
  }

  return PNG.sync.write(png);
}

const outDir = path.join(__dirname, '..', 'frontend', 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), makeIcon(192));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), makeIcon(512));
console.log('Wrote PWA icons (Memento Mori grid style)');
