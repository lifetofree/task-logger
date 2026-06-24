const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function makeIcon(size) {
  const png = new PNG({ width: size, height: size });
  const bg = [0x0f, 0x17, 0x2a, 0xff];
  const accent = [0x22, 0xd3, 0xee, 0xff];
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

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      if (inRoundedRect(x, y, size, size, radius)) {
        png.data[idx] = bg[0];
        png.data[idx + 1] = bg[1];
        png.data[idx + 2] = bg[2];
        png.data[idx + 3] = bg[3];
      } else {
        png.data[idx + 3] = 0;
      }
    }
  }

  // Draw a checkmark in the center
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = Math.max(2, Math.round(size * 0.08));
  const checkPoints = [
    { x: cx - size * 0.22, y: cy + size * 0.02 },
    { x: cx - size * 0.05, y: cy + size * 0.18 },
    { x: cx + size * 0.22, y: cy - size * 0.18 },
  ];

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d1 = distToSegment(x, y, checkPoints[0].x, checkPoints[0].y, checkPoints[1].x, checkPoints[1].y);
      const d2 = distToSegment(x, y, checkPoints[1].x, checkPoints[1].y, checkPoints[2].x, checkPoints[2].y);
      if (d1 <= strokeWidth / 2 || d2 <= strokeWidth / 2) {
        const idx = (size * y + x) << 2;
        png.data[idx] = accent[0];
        png.data[idx + 1] = accent[1];
        png.data[idx + 2] = accent[2];
        png.data[idx + 3] = accent[3];
      }
    }
  }

  return PNG.sync.write(png);
}

const outDir = path.join(__dirname, '..', 'frontend', 'public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), makeIcon(192));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), makeIcon(512));
console.log('Wrote PWA icons');
