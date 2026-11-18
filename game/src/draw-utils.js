// Small canvas drawing helpers shared by every renderer module: rounded rectangles, outlined labels,
// soft glows and a stateless integer hash (so scenery never needs a random generator).

import { FONT_FAMILY } from './config.js';

export const TAU = Math.PI * 2;

export function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** A repeatable value in [0, 1) for the integer cell (i, j): scenery detail that never changes between runs. */
export function hash2(i, j, seed = 0) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function formatNumber(value) {
  return Math.round(value).toLocaleString('en-US');
}

/** Text with a dark outline so it stays readable on any floor colour. */
export function labelText(ctx, text, x, y, size, fill, options = {}) {
  const { weight = '800', align = 'center', stroke = '#141a2b', strokeScale = 0.2, family = FONT_FAMILY, spacing } = options;
  ctx.save();
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (spacing !== undefined && 'letterSpacing' in ctx) ctx.letterSpacing = spacing;
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * strokeScale);
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** A soft round glow; `rgb` is a "r,g,b" string. */
export function glowDot(ctx, x, y, radius, rgb, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${rgb},${alpha})`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

export function verticalGradient(ctx, y0, y1, top, bottom) {
  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  return gradient;
}

export function horizontalGradient(ctx, x0, x1, left, right) {
  const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
  gradient.addColorStop(0, left);
  gradient.addColorStop(1, right);
  return gradient;
}
