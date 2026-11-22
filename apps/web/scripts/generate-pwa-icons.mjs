// Draws the LRMS app icon (white cross on clinical teal) into public/. Run: node scripts/generate-pwa-icons.mjs
import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TEAL = [0x0d, 0x94, 0x88];
const WHITE = [255, 255, 255];
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
mkdirSync(out, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body));
  return Buffer.concat([head, body, tail]);
};

// armRatio: cross arm length as a share of the canvas; rounded = icon with corners, else full-bleed.
function icon(size, armRatio, rounded) {
  const SS = 4;
  const arm = size * armRatio;
  const thick = arm / 3;
  const c = size / 2;
  const radius = rounded ? size * 0.22 : 0;
  const inCross = (x, y) =>
    (Math.abs(x - c) <= thick / 2 && Math.abs(y - c) <= arm / 2) ||
    (Math.abs(y - c) <= thick / 2 && Math.abs(x - c) <= arm / 2);
  const inCard = (x, y) => {
    if (!rounded) return true;
    const dx = Math.max(radius - x, x - (size - radius), 0);
    const dy = Math.max(radius - y, y - (size - radius), 0);
    return dx * dx + dy * dy <= radius * radius;
  };
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (!inCard(px, py)) continue;
          const col = inCross(px, py) ? WHITE : TEAL;
          r += col[0]; g += col[1]; b += col[2]; a++;
        }
      }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const n = SS * SS;
      raw[o] = a ? Math.round(r / a) : 0;
      raw[o + 1] = a ? Math.round(g / a) : 0;
      raw[o + 2] = a ? Math.round(b / a) : 0;
      raw[o + 3] = Math.round((a / n) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Maskable icons are cropped to a circle, so the cross stays inside the central 60%.
writeFileSync(path.join(out, 'pwa-192x192.png'), icon(192, 0.56, true));
writeFileSync(path.join(out, 'pwa-512x512.png'), icon(512, 0.56, true));
writeFileSync(path.join(out, 'pwa-maskable-512x512.png'), icon(512, 0.4, false));
writeFileSync(path.join(out, 'apple-touch-icon.png'), icon(180, 0.5, false));

writeFileSync(
  path.join(out, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="113" fill="#0d9488"/><path fill="#fff" d="M208 112h96v96h96v96h-96v96h-96v-96h-96v-96h96z"/></svg>\n`,
);
