// Iconic Tactical HUD, live-backdrop Title Emblem Screen, Illustrated Augment Draft Cards,
// Pause Modal, and Compact Medal Results Screen.

import { ARENA_CONFIG, FONT_FAMILY, PLAYER_STATS } from './config.js';
import { TAU, formatNumber, labelText, roundedRectPath } from './draw-utils.js';
import {
  CMD_CARD_1,
  CMD_CARD_2,
  CMD_CARD_3,
  CMD_MUTE_TOGGLE,
  CMD_PAUSE_TOGGLE,
  CMD_RESTART_RUN,
  CMD_START_OR_CONFIRM,
} from './input.js';

const INK = '#121829';

function drawPillBar(ctx, x, y, w, h, ratio, fillA, fillB, bg = '#151c30') {
  const clamped = Math.max(0, Math.min(1, ratio));
  roundedRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();

  if (clamped > 0.01) {
    const fillW = Math.max(h, (w - 4) * clamped);
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, fillA);
    grad.addColorStop(1, fillB);
    roundedRectPath(ctx, x + 2, y + 2, fillW, h - 4, (h - 4) / 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  roundedRectPath(ctx, x, y, w, h, h / 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

function drawHeartIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.42);
  ctx.bezierCurveTo(-size * 0.65, -size * 0.05, -size * 0.52, -size * 0.62, 0, -size * 0.22);
  ctx.bezierCurveTo(size * 0.52, -size * 0.62, size * 0.65, -size * 0.05, 0, size * 0.42);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

function drawShieldIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.48);
  ctx.lineTo(size * 0.44, -size * 0.28);
  ctx.lineTo(size * 0.36, size * 0.2);
  ctx.lineTo(0, size * 0.52);
  ctx.lineTo(-size * 0.36, size * 0.2);
  ctx.lineTo(-size * 0.44, -size * 0.28);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

function drawBoltIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(size * 0.12, -size * 0.52);
  ctx.lineTo(-size * 0.36, size * 0.04);
  ctx.lineTo(-size * 0.02, size * 0.04);
  ctx.lineTo(-size * 0.16, size * 0.52);
  ctx.lineTo(size * 0.38, -size * 0.06);
  ctx.lineTo(size * 0.04, -size * 0.06);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

function drawCoreCrystalIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.52);
  ctx.lineTo(size * 0.38, 0);
  ctx.lineTo(0, size * 0.52);
  ctx.lineTo(-size * 0.38, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

function drawTrophyIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-size * 0.38, -size * 0.42);
  ctx.lineTo(size * 0.38, -size * 0.42);
  ctx.lineTo(size * 0.24, size * 0.08);
  ctx.lineTo(-size * 0.24, size * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-size * 0.1, size * 0.08, size * 0.2, size * 0.24);
  ctx.strokeRect(-size * 0.1, size * 0.08, size * 0.2, size * 0.24);
  ctx.fillRect(-size * 0.28, size * 0.32, size * 0.56, size * 0.14);
  ctx.strokeRect(-size * 0.28, size * 0.32, size * 0.56, size * 0.14);
  ctx.restore();
}

function drawCrossedSwordsIcon(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.scale(s, 1);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.38, size * 0.38);
    ctx.lineTo(size * 0.38, -size * 0.38);
    ctx.stroke();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

export function drawTacticalHud(ctx, worldState, bestScore, audioMuted, interactiveButtons, hoveredButtonId, screen) {
  const player = worldState.player;
  const core = worldState.core;

  // Compact top bar backdrop
  ctx.fillStyle = 'rgba(13, 19, 36, 0.88)';
  ctx.fillRect(0, 0, ARENA_CONFIG.width, ARENA_CONFIG.hudTopHeight);
  ctx.fillStyle = '#2d3f69';
  ctx.fillRect(0, ARENA_CONFIG.hudTopHeight - 2, ARENA_CONFIG.width, 2);

  // On title screen keep top bar ultra clean (just Audio button + Best Score pill)
  if (screen === 'title') {
    const muteBtn = { id: 'btn_mute', x: ARENA_CONFIG.width - 68, y: 15, w: 46, h: 42, command: CMD_MUTE_TOGGLE };
    interactiveButtons.push(muteBtn);
    roundedRectPath(ctx, muteBtn.x, muteBtn.y, muteBtn.w, muteBtn.h, 10);
    ctx.fillStyle = hoveredButtonId === muteBtn.id ? '#2563eb' : '#1b2644';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
    labelText(ctx, audioMuted ? '🔇' : '🔊', muteBtn.x + 23, muteBtn.y + 22, 20, '#f8fafc', { stroke: null });

    roundedRectPath(ctx, 20, 16, 224, 40, 20);
    ctx.fillStyle = '#182440';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawTrophyIcon(ctx, 44, 36, 22, '#facc15');
    labelText(ctx, `BEST ${formatNumber(bestScore)}`, 140, 37, 17, '#fef08a', { weight: '800' });
    return;
  }

  // 1. Left Cluster: Hull HP + Shield + Bastion Core (compact iconic bars)
  drawHeartIcon(ctx, 30, 24, 24, '#fb7185');
  drawPillBar(ctx, 50, 13, 176, 22, player.hp / player.maxHp, '#34d399', '#059669');
  labelText(ctx, `${Math.ceil(player.hp)}/${player.maxHp}`, 138, 24, 13, '#ffffff', { weight: '900' });

  drawShieldIcon(ctx, 30, 52, 20, '#38bdf8');
  drawPillBar(ctx, 50, 43, 176, 16, player.shield / player.maxShield, '#67e8f9', '#0284c7');
  labelText(ctx, `${Math.floor(player.shield)}`, 138, 51, 11, '#e0f2fe', { weight: '800' });

  // Bastion Core Integrity Pill
  const coreRatio = core.hp / core.maxHp;
  const coreA = coreRatio > 0.5 ? '#22d3ee' : coreRatio > 0.25 ? '#fbbf24' : '#fb7185';
  const coreB = coreRatio > 0.5 ? '#0891b2' : coreRatio > 0.25 ? '#d97706' : '#e11d48';
  drawCoreCrystalIcon(ctx, 256, 36, 28, coreA);
  drawPillBar(ctx, 278, 23, 176, 24, coreRatio, coreA, coreB);
  labelText(ctx, `CORE ${Math.ceil(coreRatio * 100)}%`, 366, 35, 13, '#ffffff', { weight: '900' });

  // 2. Center Wave & Hostiles Emblem
  roundedRectPath(ctx, 518, 10, 244, 54, 12);
  ctx.fillStyle = '#182544';
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  labelText(ctx, `WAVE ${worldState.wave} / ${worldState.totalWaves}`, 606, 37, 21, '#facc15', { weight: '900' });
  const foes = worldState.enemies.length + (worldState.spawnQueue ? worldState.spawnQueue.length : 0);
  roundedRectPath(ctx, 686, 20, 64, 34, 8);
  ctx.fillStyle = '#2a1626';
  ctx.fill();
  ctx.strokeStyle = '#fb7185';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  drawCrossedSwordsIcon(ctx, 703, 37, 16, '#fb7185');
  labelText(ctx, `${foes}`, 729, 38, 16, '#ffe4e6', { weight: '900' });

  // 3. Right Cluster: Overdrive Gauge + Score + Combo + Icon Buttons
  const odReady = player.overdrive >= PLAYER_STATS.overdriveMax;
  drawBoltIcon(ctx, 804, 36, 28, odReady ? '#facc15' : '#e879f9');
  drawPillBar(
    ctx,
    822,
    23,
    144,
    24,
    player.overdrive / PLAYER_STATS.overdriveMax,
    odReady ? '#fde047' : '#d946ef',
    odReady ? '#eab308' : '#9333ea',
  );
  labelText(ctx, odReady ? 'NOVA [Q]' : `${Math.floor(player.overdrive)}%`, 894, 35, 13, '#ffffff', { weight: '900' });

  // Score & Combo Badge
  labelText(ctx, formatNumber(worldState.score), 1084, 27, 27, '#ffffff', { weight: '900', align: 'right' });
  roundedRectPath(ctx, 1094, 13, 62, 48, 10);
  ctx.fillStyle = player.combo >= 3 ? '#b45309' : '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.stroke();
  labelText(ctx, `x${Math.round(player.combo)}`, 1125, 37, 21, '#fde047', { weight: '900' });

  labelText(ctx, `BEST ${formatNumber(Math.max(bestScore, worldState.score))}`, 1084, 55, 12, '#94a3b8', {
    weight: '700',
    align: 'right',
    stroke: null,
  });

  // Pause & Mute Icon Buttons
  const pauseBtn = { id: 'btn_pause', x: 1170, y: 15, w: 42, h: 42, command: CMD_PAUSE_TOGGLE };
  const muteBtn = { id: 'btn_mute', x: 1220, y: 15, w: 42, h: 42, command: CMD_MUTE_TOGGLE };
  interactiveButtons.push(pauseBtn, muteBtn);

  for (const [btn, symbol, activeColor] of [
    [pauseBtn, '⏸', '#f8fafc'],
    [muteBtn, audioMuted ? '🔇' : '🔊', audioMuted ? '#fb7185' : '#22d3ee'],
  ]) {
    roundedRectPath(ctx, btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fillStyle = hoveredButtonId === btn.id ? '#2563eb' : '#1a2540';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();
    labelText(ctx, symbol, btn.x + btn.w / 2, btn.y + 22, 18, activeColor, { stroke: null });
  }

  // Boss HP Bar floating cleanly at top of arena
  const boss = worldState.enemies.find((e) => e.kind === 'boss');
  if (boss && screen === 'combat') {
    const bw = 460;
    const bx = (ARENA_CONFIG.width - bw) / 2;
    const by = ARENA_CONFIG.hudTopHeight + 12;
    roundedRectPath(ctx, bx - 14, by - 6, bw + 28, 38, 12);
    ctx.fillStyle = 'rgba(22, 14, 34, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    labelText(ctx, `CHRONO WARDEN • PHASE ${boss.bossPhase}`, ARENA_CONFIG.width / 2, by + 6, 13, '#fde047', {
      weight: '900',
    });
    drawPillBar(ctx, bx, by + 16, bw, 12, boss.hp / boss.maxHp, '#fb7185', '#be123c', '#2a1222');
  } else if (worldState.waveBannerTimer > 0 && worldState.waveTitle && screen === 'combat') {
    const bw = 380;
    const bx = (ARENA_CONFIG.width - bw) / 2;
    const by = ARENA_CONFIG.hudTopHeight + 14;
    roundedRectPath(ctx, bx, by, bw, 36, 18);
    ctx.fillStyle = 'rgba(13, 21, 40, 0.84)';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();
    labelText(ctx, worldState.waveTitle, ARENA_CONFIG.width / 2, by + 18, 15, '#fef08a', { weight: '900' });
  }

  // Slim Bottom Footer Strip (Armament badge + minimal control strip)
  const botY = ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight;
  ctx.fillStyle = 'rgba(13, 19, 36, 0.86)';
  ctx.fillRect(0, botY, ARENA_CONFIG.width, ARENA_CONFIG.hudBottomHeight);

  roundedRectPath(ctx, 18, botY + 11, 240, 32, 16);
  ctx.fillStyle = '#182544';
  ctx.fill();
  ctx.strokeStyle = player.weapon.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  labelText(ctx, player.weapon.shortLabel, 138, botY + 27, 13, player.weapon.color, { weight: '900' });

  labelText(
    ctx,
    'WASD Move  •  Mouse Aim/Fire  •  Space Dash/Parry  •  Q Overdrive  •  P Pause  •  R Restart',
    ARENA_CONFIG.width - 22,
    botY + 27,
    13,
    '#cbd5e1',
    { weight: '700', align: 'right', stroke: null },
  );
}

export function drawTitleBriefingOverlay(ctx, worldState, bestScore, interactiveButtons, hoveredButtonId) {
  // Subtle upper/lower gradient scrims only so the center sunlit live battle remains crystal clear!
  const topScrim = ctx.createLinearGradient(0, ARENA_CONFIG.hudTopHeight, 0, 290);
  topScrim.addColorStop(0, 'rgba(12, 16, 30, 0.72)');
  topScrim.addColorStop(1, 'rgba(12, 16, 30, 0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, ARENA_CONFIG.hudTopHeight, ARENA_CONFIG.width, 220);

  const botScrim = ctx.createLinearGradient(0, 560, 0, ARENA_CONFIG.height);
  botScrim.addColorStop(0, 'rgba(12, 16, 30, 0)');
  botScrim.addColorStop(0.45, 'rgba(12, 16, 30, 0.80)');
  botScrim.addColorStop(1, 'rgba(12, 16, 30, 0.94)');
  ctx.fillStyle = botScrim;
  ctx.fillRect(0, 560, ARENA_CONFIG.width, ARENA_CONFIG.height - 560);

  // Top Emblem Crest Banner
  const cx = ARENA_CONFIG.width / 2;
  roundedRectPath(ctx, cx - 330, 96, 660, 128, 22);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.stroke();

  labelText(ctx, 'SPRINTER BASTION', cx, 146, 56, '#ffffff', {
    weight: '900',
    stroke: '#121829',
    strokeScale: 0.16,
    spacing: '2px',
  });
  labelText(ctx, 'DEFEND THE AEGIS CORE  •  PARRY FIRE  •  EVOLVE YOUR RIG', cx, 198, 17, '#fde047', {
    weight: '800',
  });

  // Prominent [ PLAY ] CTA Button near bottom above the compact keycap strip
  const playBtn = {
    id: 'btn_start_mission',
    x: cx - 170,
    y: 610,
    w: 340,
    h: 72,
    command: CMD_START_OR_CONFIRM,
  };
  interactiveButtons.push(playBtn);

  const btnHovered = hoveredButtonId === playBtn.id;
  const btnGrad = ctx.createLinearGradient(0, playBtn.y, 0, playBtn.y + playBtn.h);
  btnGrad.addColorStop(0, btnHovered ? '#fde047' : '#facc15');
  btnGrad.addColorStop(1, btnHovered ? '#f59e0b' : '#d97706');

  roundedRectPath(ctx, playBtn.x, playBtn.y, playBtn.w, playBtn.h, 16);
  ctx.fillStyle = btnGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();

  labelText(ctx, '▶  PLAY', cx, playBtn.y + 37, 34, '#121829', {
    weight: '900',
    stroke: '#fef9c3',
    strokeScale: 0.08,
  });

  // Compact Control Strip with visual keycaps at bottom
  const controls = [
    ['WASD', 'Move'],
    ['MOUSE', 'Aim / Fire'],
    ['SPACE', 'Dash / Parry'],
    ['Q / E', 'Overdrive'],
    ['1-3', 'Draft Cards'],
  ];
  const pillW = 202;
  const gap = 16;
  const stripStart = cx - (controls.length * pillW + (controls.length - 1) * gap) / 2;
  const stripY = 716;

  for (let i = 0; i < controls.length; i += 1) {
    const [keyLabel, actionLabel] = controls[i];
    const px = stripStart + i * (pillW + gap);
    roundedRectPath(ctx, px, stripY, pillW, 42, 10);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    roundedRectPath(ctx, px + 8, stripY + 7, 74, 28, 7);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    labelText(ctx, keyLabel, px + 45, stripY + 21, 13, '#38bdf8', { weight: '900', stroke: null });
    labelText(ctx, actionLabel, px + 142, stripY + 21, 14, '#f8fafc', { weight: '700', stroke: null });
  }
  void worldState;
  void bestScore;
}

function drawAugmentEmblem(ctx, card, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);

  // Shielded circular frame
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, TAU);
  ctx.fillStyle = '#131d36';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = card.badgeColor;
  ctx.stroke();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.fillStyle = card.badgeColor;

  if (card.weaponEvolution === 'prismScatter') {
    for (const a of [-0.48, 0, 0.48]) {
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-5, -36, 10, 46);
      ctx.strokeRect(-5, -36, 10, 46);
      ctx.beginPath();
      ctx.arc(0, -38, 6, 0, TAU);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (card.weaponEvolution === 'arcLance') {
    drawBoltIcon(ctx, 0, 0, 74, '#c084fc');
    ctx.beginPath();
    ctx.arc(-24, -18, 6, 0, TAU);
    ctx.arc(24, 18, 6, 0, TAU);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
  } else if (card.weaponEvolution === 'twinRail') {
    for (const ox of [-14, 14]) {
      ctx.fillRect(ox - 6, -34, 12, 68);
      ctx.strokeRect(ox - 6, -34, 12, 68);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(ox - 2, -28, 4, 56);
      ctx.fillStyle = card.badgeColor;
    }
  } else if (card.id === 'bastion_parry_capacitor') {
    drawShieldIcon(ctx, 0, 0, 68, '#22d3ee');
    ctx.beginPath();
    ctx.arc(0, 0, 38, -0.8, 0.8);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.stroke();
  } else if (card.id === 'aegis_nanite_repair') {
    drawHeartIcon(ctx, 0, 2, 64, '#10b981');
  } else {
    drawBoltIcon(ctx, 0, 0, 72, '#fb7185');
  }
  ctx.restore();
}

export function drawAugmentSelectionModal(ctx, worldState, interactiveButtons, hoveredButtonId) {
  const choices = worldState.augmentChoices || [];

  // Semi-transparent scrim keeping arena clearly visible underneath
  ctx.fillStyle = 'rgba(10, 15, 28, 0.58)';
  ctx.fillRect(0, ARENA_CONFIG.hudTopHeight, ARENA_CONFIG.width, ARENA_CONFIG.height - ARENA_CONFIG.hudTopHeight);

  // Header Banner
  labelText(ctx, `WAVE ${worldState.wave} CLEARED — CHOOSE AN UPGRADE`, ARENA_CONFIG.width / 2, 134, 34, '#fde047', {
    weight: '900',
    stroke: INK,
    strokeScale: 0.16,
  });

  const cardW = 320;
  const cardH = 420;
  const gap = 34;
  const startX = (ARENA_CONFIG.width - (cardW * 3 + gap * 2)) / 2;
  const cardY = 186;
  const cardCommands = [CMD_CARD_1, CMD_CARD_2, CMD_CARD_3];

  for (let i = 0; i < 3; i += 1) {
    const card = choices[i];
    if (!card) continue;
    const cx = startX + i * (cardW + gap);
    const btnId = `btn_card_${i + 1}`;
    const isSelected = hoveredButtonId === btnId || worldState.selectedCardIndex === i;

    interactiveButtons.push({
      id: btnId,
      x: cx,
      y: cardY,
      w: cardW,
      h: cardH,
      command: cardCommands[i],
    });

    roundedRectPath(ctx, cx, cardY, cardW, cardH, 18);
    ctx.fillStyle = isSelected ? 'rgba(24, 38, 72, 0.96)' : 'rgba(15, 23, 42, 0.93)';
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#facc15' : card.badgeColor;
    ctx.lineWidth = isSelected ? 4 : 2.5;
    ctx.stroke();

    // Top Category Pill + Keycap
    roundedRectPath(ctx, cx + 18, cardY + 18, 46, 30, 8);
    ctx.fillStyle = card.badgeColor;
    ctx.fill();
    labelText(ctx, `[${i + 1}]`, cx + 41, cardY + 33, 15, INK, { weight: '900', stroke: null });
    labelText(ctx, card.category, cx + cardW - 20, cardY + 33, 12, card.badgeColor, {
      weight: '800',
      align: 'right',
      stroke: null,
    });

    // Illustrated Emblem
    drawAugmentEmblem(ctx, card, cx + cardW / 2, cardY + 132);

    // Short Punchy Title (split cleanly if > 18 chars)
    const words = card.title.split(' ');
    if (words.length >= 3) {
      const mid = Math.ceil(words.length / 2);
      labelText(ctx, words.slice(0, mid).join(' '), cx + cardW / 2, cardY + 226, 22, '#ffffff', { weight: '900' });
      labelText(ctx, words.slice(mid).join(' '), cx + cardW / 2, cardY + 254, 22, '#ffffff', { weight: '900' });
    } else {
      labelText(ctx, card.title, cx + cardW / 2, cardY + 240, 22, '#ffffff', { weight: '900' });
    }

    // Single concise stat pill (no verbose paragraph!)
    roundedRectPath(ctx, cx + 18, cardY + 286, cardW - 36, 44, 10);
    ctx.fillStyle = 'rgba(9, 14, 26, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    labelText(ctx, card.statLine, cx + cardW / 2, cardY + 308, 13, '#fef08a', { weight: '800', stroke: null });

    // Select Button
    roundedRectPath(ctx, cx + 22, cardY + cardH - 68, cardW - 44, 48, 12);
    ctx.fillStyle = isSelected ? '#facc15' : card.badgeColor;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    labelText(ctx, `EQUIP  [${i + 1}]`, cx + cardW / 2, cardY + cardH - 44, 18, INK, {
      weight: '900',
      stroke: null,
    });
  }
}

export function drawRunResultsAndRestartModal(ctx, worldState, bestScore, interactiveButtons, hoveredButtonId) {
  const isVictory = worldState.victory;
  ctx.fillStyle = 'rgba(10, 14, 28, 0.60)';
  ctx.fillRect(0, ARENA_CONFIG.hudTopHeight, ARENA_CONFIG.width, ARENA_CONFIG.height - ARENA_CONFIG.hudTopHeight);

  const mw = 740;
  const mh = 510;
  const mx = (ARENA_CONFIG.width - mw) / 2;
  const my = 148;

  roundedRectPath(ctx, mx, my, mw, mh, 20);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.fill();
  ctx.strokeStyle = isVictory ? '#34d399' : '#facc15';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Medal / Rank Badge at top center
  const rank = isVictory ? 'S' : worldState.wave >= 4 ? 'A' : worldState.wave >= 2 ? 'B' : 'C';
  ctx.beginPath();
  ctx.arc(ARENA_CONFIG.width / 2, my + 62, 42, 0, TAU);
  ctx.fillStyle = isVictory ? '#10b981' : '#f59e0b';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  labelText(ctx, rank, ARENA_CONFIG.width / 2, my + 64, 40, INK, { weight: '900', stroke: null });

  labelText(
    ctx,
    isVictory ? 'VICTORY — AEGIS SECURED!' : 'RUN COMPLETE — BASTION FALLEN',
    ARENA_CONFIG.width / 2,
    my + 132,
    34,
    isVictory ? '#34d399' : '#fb7185',
    { weight: '900' },
  );

  labelText(
    ctx,
    `WAVE ${worldState.wave} / ${worldState.totalWaves}  •  BEST SCORE: ${formatNumber(Math.max(bestScore, worldState.score))}`,
    ARENA_CONFIG.width / 2,
    my + 170,
    16,
    '#fde047',
    { weight: '800' },
  );

  // 4 Iconic Stat Tiles
  const tiles = [
    ['SCORE', formatNumber(worldState.score), '#38bdf8', 'trophy'],
    ['KILLS', `${worldState.kills}`, '#fb7185', 'swords'],
    ['PARRIES', `${worldState.parries}`, '#22d3ee', 'shield'],
    ['PEAK COMBO', `x${worldState.player.maxCombo.toFixed(1)}`, '#facc15', 'bolt'],
  ];
  const tileW = 156;
  const tileH = 148;
  const tileGap = 18;
  const gridX = ARENA_CONFIG.width / 2 - (tileW * 4 + tileGap * 3) / 2;
  const tileY = my + 204;

  for (let i = 0; i < tiles.length; i += 1) {
    const [label, val, accent, iconKind] = tiles[i];
    const tx = gridX + i * (tileW + tileGap);
    roundedRectPath(ctx, tx, tileY, tileW, tileH, 14);
    ctx.fillStyle = '#182440';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    if (iconKind === 'trophy') drawTrophyIcon(ctx, tx + tileW / 2, tileY + 38, 34, accent);
    else if (iconKind === 'swords') drawCrossedSwordsIcon(ctx, tx + tileW / 2, tileY + 38, 32, accent);
    else if (iconKind === 'shield') drawShieldIcon(ctx, tx + tileW / 2, tileY + 38, 34, accent);
    else drawBoltIcon(ctx, tx + tileW / 2, tileY + 38, 34, accent);

    labelText(ctx, val, tx + tileW / 2, tileY + 92, 28, '#ffffff', { weight: '900' });
    labelText(ctx, label, tx + tileW / 2, tileY + 126, 13, accent, { weight: '800', stroke: null });
  }

  // Big [ PLAY AGAIN ] Button
  const restartBtn = {
    id: 'btn_play_again',
    x: ARENA_CONFIG.width / 2 - 190,
    y: my + mh - 102,
    w: 380,
    h: 66,
    command: CMD_RESTART_RUN,
  };
  interactiveButtons.push(restartBtn);

  roundedRectPath(ctx, restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 16);
  ctx.fillStyle = hoveredButtonId === restartBtn.id ? '#34d399' : '#10b981';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  labelText(ctx, '↻  PLAY AGAIN', ARENA_CONFIG.width / 2, restartBtn.y + 34, 28, INK, {
    weight: '900',
    stroke: '#d1fae5',
    strokeScale: 0.08,
  });

  labelText(ctx, 'PRESS [R] OR [SPACE] OR CLICK TO RESTART', ARENA_CONFIG.width / 2, my + mh - 18, 13, '#cbd5e1', {
    weight: '700',
    stroke: null,
  });
}

export function drawPauseModal(ctx, interactiveButtons, hoveredButtonId) {
  ctx.fillStyle = 'rgba(10, 14, 28, 0.58)';
  ctx.fillRect(0, ARENA_CONFIG.hudTopHeight, ARENA_CONFIG.width, ARENA_CONFIG.height - ARENA_CONFIG.hudTopHeight);

  const pw = 440;
  const ph = 240;
  const px = (ARENA_CONFIG.width - pw) / 2;
  const py = (ARENA_CONFIG.height - ph) / 2;

  roundedRectPath(ctx, px, py, pw, ph, 18);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.stroke();

  labelText(ctx, 'PAUSED', ARENA_CONFIG.width / 2, py + 52, 36, '#ffffff', { weight: '900' });

  const resumeBtn = { id: 'btn_resume', x: px + 50, y: py + 94, w: 340, h: 52, command: CMD_PAUSE_TOGGLE };
  const restartBtn = { id: 'btn_pause_restart', x: px + 50, y: py + 160, w: 340, h: 48, command: CMD_RESTART_RUN };
  interactiveButtons.push(resumeBtn, restartBtn);

  roundedRectPath(ctx, resumeBtn.x, resumeBtn.y, resumeBtn.w, resumeBtn.h, 12);
  ctx.fillStyle = hoveredButtonId === resumeBtn.id ? '#fde047' : '#facc15';
  ctx.fill();
  labelText(ctx, '▶ RESUME [P]', ARENA_CONFIG.width / 2, resumeBtn.y + 26, 20, INK, { weight: '900', stroke: null });

  roundedRectPath(ctx, restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 12);
  ctx.fillStyle = hoveredButtonId === restartBtn.id ? '#ef4444' : '#334155';
  ctx.fill();
  labelText(ctx, '↻ RESTART [R]', ARENA_CONFIG.width / 2, restartBtn.y + 24, 18, '#ffffff', {
    weight: '800',
    stroke: null,
  });
}

export function drawAimReticle(ctx, aimX, aimY, player) {
  ctx.save();
  ctx.translate(aimX, aimY);

  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, TAU);
  ctx.stroke();

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  for (const [x1, y1, x2, y2] of [
    [-22, 0, -8, 0],
    [8, 0, 22, 0],
    [0, -22, 0, -8],
    [0, 8, 0, 22],
  ]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = player.weapon.color;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}
