// The arena itself: carved stone slabs, a sigil dais under the Aegis Core, an energy moat with four
// bridges, a colonnade parapet, column shadows, braziers and layered atmosphere. The heavy, static
// stonework is painted once per theme into an offscreen layer; only light, fog, flames and moat
// sparkle are drawn per frame, all from the simulation clock so a screenshot never varies.

import { ARENA_CONFIG } from './config.js';
import { TAU, glowDot, hash2 } from './draw-utils.js';

const WIDTH = ARENA_CONFIG.width;
const HEIGHT = ARENA_CONFIG.height;
const TOP = ARENA_CONFIG.hudTopHeight;
const BOTTOM = HEIGHT - ARENA_CONFIG.hudBottomHeight;
const CENTER_X = ARENA_CONFIG.coreX;
const CENTER_Y = ARENA_CONFIG.coreY;
const TILE = 64;
const MOAT_RADIUS = 322;
const BRAZIERS = [
  [168, 214],
  [1112, 214],
  [168, 700],
  [1112, 700],
];
const SIDE_COLUMNS_Y = [196, 440, 684];
const layers = new Map();

function newCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function paintFloorSlabs(g, theme) {
  g.fillStyle = theme.grout;
  g.fillRect(0, TOP, WIDTH, BOTTOM - TOP);
  const columns = Math.ceil(WIDTH / TILE);
  const rows = Math.ceil((BOTTOM - TOP) / TILE);
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const x = i * TILE;
      const y = TOP + j * TILE;
      const h = hash2(i, j, theme.seed);
      g.fillStyle = (i + j) % 2 === 0 ? theme.tileA : theme.tileB;
      g.fillRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
      g.fillStyle = h > 0.5 ? `rgba(255,255,255,${((h - 0.5) * 0.16).toFixed(3)})` : `rgba(0,0,0,${((0.5 - h) * 0.14).toFixed(3)})`;
      g.fillRect(x + 1.5, y + 1.5, TILE - 3, TILE - 3);
      g.fillStyle = theme.hi;
      g.fillRect(x + 1.5, y + 1.5, TILE - 3, 2.5);
      g.fillRect(x + 1.5, y + 1.5, 2.5, TILE - 3);
      g.fillStyle = theme.lo;
      g.fillRect(x + 1.5, y + TILE - 4, TILE - 3, 2.5);
      g.fillRect(x + TILE - 4, y + 1.5, 2.5, TILE - 3);
      if (h > 0.8) {
        g.strokeStyle = theme.grout;
        g.globalAlpha = 0.6;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(x + 14, y + 6);
        g.lineTo(x + 24, y + 24);
        g.lineTo(x + 19, y + 35);
        g.lineTo(x + 35, y + 56);
        g.stroke();
        g.globalAlpha = 1;
      } else if (h < 0.22) {
        g.strokeStyle = theme.lo;
        g.lineWidth = 2;
        g.strokeRect(x + 12.5, y + 12.5, TILE - 25, TILE - 25);
      }
      if (h > 0.45 && h < 0.7) {
        g.fillStyle = theme.lo;
        g.fillRect(x + 10 + h * 20, y + 40, 3, 2);
        g.fillRect(x + 40 - h * 14, y + 18, 2, 2);
        g.fillRect(x + 24, y + 48 - h * 10, 2, 3);
      }
    }
  }
  const light = g.createRadialGradient(CENTER_X, CENTER_Y - 60, 40, CENTER_X, CENTER_Y - 60, 640);
  light.addColorStop(0, theme.light);
  light.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = light;
  g.fillRect(0, TOP, WIDTH, BOTTOM - TOP);
}

function paintDais(g, theme) {
  g.save();
  g.translate(CENTER_X, CENTER_Y);
  g.beginPath();
  g.arc(0, 4, 178, 0, TAU);
  g.fillStyle = 'rgba(30,15,20,0.24)';
  g.fill();
  g.beginPath();
  g.arc(0, 0, 170, 0, TAU);
  g.fillStyle = theme.dais;
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = theme.hi;
  g.stroke();
  g.lineWidth = 2;
  g.strokeStyle = theme.lo;
  g.beginPath();
  g.arc(0, 0, 166, 0, TAU);
  g.stroke();
  g.strokeStyle = theme.grout;
  g.globalAlpha = 0.7;
  g.lineWidth = 2.5;
  for (const radius of [140, 112, 84]) {
    g.beginPath();
    g.arc(0, 0, radius, 0, TAU);
    g.stroke();
  }
  for (let k = 0; k < 24; k += 1) {
    const angle = (k * TAU) / 24;
    g.beginPath();
    g.moveTo(Math.cos(angle) * 118, Math.sin(angle) * 118);
    g.lineTo(Math.cos(angle) * 136, Math.sin(angle) * 136);
    g.stroke();
  }
  g.globalAlpha = 0.6;
  g.strokeStyle = theme.accent;
  g.lineWidth = 3;
  g.beginPath();
  for (let k = 0; k < 16; k += 1) {
    const angle = (k * TAU) / 16 - Math.PI / 2;
    const radius = k % 2 === 0 ? 156 : 96;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (k === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.stroke();
  g.globalAlpha = 1;
  g.beginPath();
  g.arc(0, 0, 62, 0, TAU);
  g.fillStyle = theme.daisInner;
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = theme.accent;
  g.stroke();
  g.restore();
}

function paintMoat(g, theme) {
  g.save();
  g.translate(CENTER_X, CENTER_Y);
  const ring = (width, style) => {
    g.lineWidth = width;
    g.strokeStyle = style;
    g.beginPath();
    g.arc(0, 0, MOAT_RADIUS, 0, TAU);
    g.stroke();
  };
  ring(48, theme.wallDark);
  ring(42, theme.wall);
  ring(31, theme.moatDeep);
  g.globalAlpha = 0.92;
  ring(19, theme.moat);
  g.globalAlpha = 1;
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.beginPath();
  g.arc(0, 0, MOAT_RADIUS - 5, 0, TAU);
  g.stroke();
  for (let k = 0; k < 4; k += 1) {
    g.save();
    g.rotate((k * Math.PI) / 2);
    g.fillStyle = theme.wallDark;
    g.fillRect(MOAT_RADIUS - 42, -46, 84, 92);
    g.fillStyle = theme.tileA;
    g.fillRect(MOAT_RADIUS - 39, -42, 78, 84);
    g.strokeStyle = theme.grout;
    g.lineWidth = 2;
    for (let p = 1; p < 5; p += 1) {
      g.beginPath();
      g.moveTo(MOAT_RADIUS - 39 + p * 15.6, -42);
      g.lineTo(MOAT_RADIUS - 39 + p * 15.6, 42);
      g.stroke();
    }
    g.fillStyle = theme.pillarLight;
    g.fillRect(MOAT_RADIUS - 42, -50, 84, 8);
    g.fillRect(MOAT_RADIUS - 42, 42, 84, 8);
    for (const px of [MOAT_RADIUS - 40, MOAT_RADIUS + 40]) {
      for (const py of [-46, 46]) {
        g.beginPath();
        g.arc(px, py, 6, 0, TAU);
        g.fillStyle = theme.pillarDark;
        g.fill();
        glowDot(g, px, py, 14, '255,236,170', 0.5);
      }
    }
    g.restore();
  }
  g.restore();
}

function paintColumn(g, centerX, baseY, height, theme, withShadow) {
  if (withShadow) {
    g.fillStyle = 'rgba(30,15,20,0.17)';
    g.beginPath();
    g.moveTo(centerX - 17, baseY);
    g.lineTo(centerX + 17, baseY);
    g.lineTo(centerX + 17 + height * 0.9, baseY + height * 0.38);
    g.lineTo(centerX - 17 + height * 0.9, baseY + height * 0.38);
    g.closePath();
    g.fill();
  }
  const shaft = g.createLinearGradient(centerX - 17, 0, centerX + 17, 0);
  shaft.addColorStop(0, theme.pillarLight);
  shaft.addColorStop(0.55, theme.pillarLight);
  shaft.addColorStop(1, theme.pillarDark);
  g.fillStyle = shaft;
  g.fillRect(centerX - 16, baseY - height + 12, 32, height - 24);
  g.strokeStyle = 'rgba(0,0,0,0.13)';
  g.lineWidth = 2;
  for (const offset of [-8, 0, 8]) {
    g.beginPath();
    g.moveTo(centerX + offset, baseY - height + 16);
    g.lineTo(centerX + offset, baseY - 14);
    g.stroke();
  }
  g.fillStyle = theme.pillarDark;
  g.fillRect(centerX - 23, baseY - 14, 46, 14);
  g.fillStyle = theme.pillarLight;
  g.fillRect(centerX - 23, baseY - 14, 46, 5);
  g.fillStyle = theme.pillarDark;
  g.fillRect(centerX - 23, baseY - height, 46, 13);
  g.fillStyle = theme.pillarLight;
  g.fillRect(centerX - 23, baseY - height, 46, 5);
  g.strokeStyle = theme.lo;
  g.lineWidth = 1.5;
  g.strokeRect(centerX - 23, baseY - 14, 46, 14);
  g.strokeRect(centerX - 23, baseY - height, 46, 13);
}

function paintParapet(g, theme) {
  const wall = g.createLinearGradient(0, 0, 0, TOP);
  wall.addColorStop(0, theme.wallDark);
  wall.addColorStop(1, theme.wall);
  g.fillStyle = wall;
  g.fillRect(0, 0, WIDTH, TOP);
  for (let row = 0; row < 5; row += 1) {
    const offset = (row % 2) * 24;
    for (let x = -offset; x < WIDTH; x += 48) {
      g.strokeStyle = 'rgba(0,0,0,0.18)';
      g.lineWidth = 1;
      g.strokeRect(x + 0.5, row * 20 + 0.5, 48, 20);
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(x + 1.5, row * 20 + 1.5, 46, 2);
    }
  }
  for (let k = 0; k < 8; k += 1) {
    const centerX = 80 + k * 160;
    g.fillStyle = 'rgba(25,10,20,0.38)';
    g.beginPath();
    g.moveTo(centerX - 48, TOP - 6);
    g.lineTo(centerX - 48, TOP - 42);
    g.arc(centerX, TOP - 42, 48, Math.PI, 0);
    g.lineTo(centerX + 48, TOP - 6);
    g.closePath();
    g.fill();
  }
  for (let k = 0; k <= 8; k += 1) paintColumn(g, k * 160, TOP, 76, theme, false);
  g.fillStyle = theme.pillarLight;
  g.fillRect(0, TOP - 6, WIDTH, 6);
  g.fillStyle = theme.lo;
  g.fillRect(0, TOP - 1, WIDTH, 2);
  const cast = g.createLinearGradient(0, TOP, 0, TOP + 38);
  cast.addColorStop(0, 'rgba(0,0,0,0.36)');
  cast.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = cast;
  g.fillRect(0, TOP, WIDTH, 38);
}

function paintBottomLedge(g, theme) {
  const ledge = g.createLinearGradient(0, BOTTOM, 0, HEIGHT);
  ledge.addColorStop(0, theme.pillarLight);
  ledge.addColorStop(0.35, theme.wall);
  ledge.addColorStop(1, theme.wallDark);
  g.fillStyle = ledge;
  g.fillRect(0, BOTTOM, WIDTH, HEIGHT - BOTTOM);
  g.fillStyle = theme.lo;
  g.fillRect(0, BOTTOM, WIDTH, 2);
}

function paintBrazierBase(g, x, y, theme) {
  g.fillStyle = 'rgba(30,15,20,0.30)';
  g.beginPath();
  g.ellipse(x + 6, y + 22, 34, 11, 0, 0, TAU);
  g.fill();
  g.fillStyle = theme.pillarDark;
  g.beginPath();
  g.moveTo(x - 20, y + 20);
  g.lineTo(x + 20, y + 20);
  g.lineTo(x + 11, y - 6);
  g.lineTo(x - 11, y - 6);
  g.closePath();
  g.fill();
  g.strokeStyle = theme.lo;
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = theme.wallDark;
  g.beginPath();
  g.ellipse(x, y - 8, 25, 9, 0, 0, TAU);
  g.fill();
  g.strokeStyle = theme.pillarLight;
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = '#2a1a16';
  g.beginPath();
  g.ellipse(x, y - 9, 19, 6, 0, 0, TAU);
  g.fill();
}

function buildStaticLayer(theme) {
  const layer = newCanvas(WIDTH, HEIGHT);
  const g = layer.getContext('2d');
  paintFloorSlabs(g, theme);
  paintDais(g, theme);
  paintMoat(g, theme);
  for (const [x, y] of BRAZIERS) paintBrazierBase(g, x, y, theme);
  for (const y of SIDE_COLUMNS_Y) {
    paintColumn(g, 22, y, 100, theme, true);
    paintColumn(g, WIDTH - 22, y, 100, theme, true);
  }
  paintBottomLedge(g, theme);
  paintParapet(g, theme);

  const fog = newCanvas(640, 260);
  const f = fog.getContext('2d');
  const gradient = f.createRadialGradient(320, 130, 10, 320, 130, 300);
  gradient.addColorStop(0, `rgba(${theme.fogRGB},0.55)`);
  gradient.addColorStop(1, `rgba(${theme.fogRGB},0)`);
  f.fillStyle = gradient;
  f.save();
  f.scale(1, 0.42);
  f.fillRect(0, 0, 640, 620);
  f.restore();
  return { layer, fog };
}

function layersFor(theme) {
  let entry = layers.get(theme.id);
  if (!entry) {
    entry = buildStaticLayer(theme);
    layers.set(theme.id, entry);
  }
  return entry;
}

function drawFlame(ctx, x, y, time, seed, theme) {
  glowDot(ctx, x, y - 26, 60, theme.flameRGB, 0.42 + 0.08 * Math.sin(time * 9 + seed));
  for (let k = 0; k < 3; k += 1) {
    const sway = Math.sin(time * (8 + k * 2.3) + seed + k) * 4;
    const height = 34 - k * 8 + Math.sin(time * 11 + seed * 2 + k) * 4;
    const width = 12 - k * 3;
    ctx.beginPath();
    ctx.moveTo(x - width, y - 10);
    ctx.bezierCurveTo(x - width, y - 10 - height * 0.5, x + sway, y - 10 - height * 0.7, x + sway, y - 10 - height);
    ctx.bezierCurveTo(x + sway, y - 10 - height * 0.7, x + width, y - 10 - height * 0.5, x + width, y - 10);
    ctx.closePath();
    ctx.fillStyle = k === 0 ? `rgba(${theme.flameRGB},0.95)` : k === 1 ? 'rgba(255,214,110,0.95)' : 'rgba(255,250,214,0.95)';
    ctx.fill();
  }
}

/** Stonework, moat shimmer, braziers and low fog: everything that sits under the fighters. */
export function drawArenaBackdrop(ctx, theme, time) {
  const { layer, fog } = layersFor(theme);
  ctx.drawImage(layer, 0, 0);

  ctx.save();
  ctx.translate(CENTER_X, CENTER_Y);
  ctx.lineWidth = 5;
  ctx.strokeStyle = theme.moatSpark;
  ctx.setLineDash([26, 40]);
  ctx.lineDashOffset = -time * 34;
  for (let k = 0; k < 4; k += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, MOAT_RADIUS - 2, (k * Math.PI) / 2 + 0.2, ((k + 1) * Math.PI) / 2 - 0.2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  BRAZIERS.forEach(([x, y], index) => drawFlame(ctx, x, y, time, index * 1.7, theme));

  const speeds = [9, 14, 21];
  const rows = [250, 470, 690];
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let k = 0; k < 3; k += 1) {
    const x = ((time * speeds[k] + k * 520) % (WIDTH + 640)) - 640;
    ctx.drawImage(fog, x, rows[k] - 130);
  }
  ctx.restore();
}

/** Light shafts, drifting dust and a warm vignette: drawn over the fighters, kept faint so they stay readable. */
export function drawArenaAtmosphere(ctx, theme, time) {
  ctx.save();
  const shaft = ctx.createLinearGradient(0, TOP, 0, BOTTOM);
  shaft.addColorStop(0, `rgba(${theme.rayRGB},0.16)`);
  shaft.addColorStop(1, `rgba(${theme.rayRGB},0)`);
  ctx.fillStyle = shaft;
  for (let k = 0; k < 3; k += 1) {
    const x = 120 + k * 380 + Math.sin(time * 0.25 + k) * 30;
    ctx.beginPath();
    ctx.moveTo(x, TOP);
    ctx.lineTo(x + 110, TOP);
    ctx.lineTo(x + 370, BOTTOM);
    ctx.lineTo(x + 260, BOTTOM);
    ctx.closePath();
    ctx.fill();
  }
  for (let k = 0; k < 26; k += 1) {
    const x = (hash2(k, 1, 5) * WIDTH + time * (6 + hash2(k, 2, 5) * 10)) % WIDTH;
    const y = TOP + hash2(k, 3, 5) * (BOTTOM - TOP) + Math.sin(time * 0.7 + k) * 14;
    const alpha = 0.3 + 0.25 * Math.sin(time * 1.3 + k * 1.9);
    ctx.fillStyle = `rgba(255,250,230,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + hash2(k, 4, 5) * 1.3, 0, TAU);
    ctx.fill();
  }
  const vignette = ctx.createRadialGradient(CENTER_X, CENTER_Y, 380, CENTER_X, CENTER_Y, 900);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, theme.vignette);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, TOP, WIDTH, BOTTOM - TOP);
  ctx.restore();
}
