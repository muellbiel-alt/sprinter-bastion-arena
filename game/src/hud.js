// High-contrast Tactical HUD, Title Briefing Modal, Augment Card Selection Modal,
// Pause Overlay, Game Over / Victory Run Summary Modal, and Precision Mouse Reticle.

import { ARENA_CONFIG, FONT_FAMILY, PALETTE, PLAYER_STATS } from './config.js';
import {
  CMD_CARD_1,
  CMD_CARD_2,
  CMD_CARD_3,
  CMD_MUTE_TOGGLE,
  CMD_PAUSE_TOGGLE,
  CMD_RESTART_RUN,
  CMD_START_OR_CONFIRM,
} from './input.js';

export function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function setFont(ctx, weight, sizePx) {
  ctx.font = `${weight} ${sizePx}px ${FONT_FAMILY}`;
}

function drawProgressBar(ctx, x, y, w, h, ratio, fillColor, backColor = '#111c35', borderColor = '#2b4470') {
  const clamped = Math.max(0, Math.min(1, ratio));
  drawRoundedRect(ctx, x, y, w, h, 5);
  ctx.fillStyle = backColor;
  ctx.fill();
  if (clamped > 0) {
    drawRoundedRect(ctx, x + 2, y + 2, Math.max(6, (w - 4) * clamped), h - 4, 4);
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  drawRoundedRect(ctx, x, y, w, h, 5);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export function drawTacticalHud(ctx, worldState, bestScore, audioMuted, interactiveButtons, hoveredButtonId) {
  const player = worldState.player;
  const core = worldState.core;

  // Top HUD Bar backdrop
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, ARENA_CONFIG.width, ARENA_CONFIG.hudTopHeight);
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, ARENA_CONFIG.hudTopHeight);
  ctx.lineTo(ARENA_CONFIG.width, ARENA_CONFIG.hudTopHeight);
  ctx.stroke();

  ctx.textBaseline = 'middle';

  // 1. Sprinter Hull & Shield block (x: 16..276)
  ctx.textAlign = 'left';
  setFont(ctx, '700', 14);
  ctx.fillStyle = PALETTE.accentCyan;
  ctx.fillText(`SPRINTER HULL ${Math.ceil(player.hp)}/${player.maxHp}`, 18, 18);
  setFont(ctx, '700', 13);
  ctx.fillStyle = '#93c5fd';
  ctx.textAlign = 'right';
  ctx.fillText(`SHIELD ${Math.floor(player.shield)}`, 268, 18);
  drawProgressBar(ctx, 18, 29, 250, 16, player.hp / player.maxHp, '#10b981');
  drawProgressBar(ctx, 18, 50, 250, 12, player.shield / player.maxShield, '#38bdf8');

  // 2. Aegis Bastion Core block (x: 288..548)
  ctx.textAlign = 'left';
  setFont(ctx, '700', 14);
  const coreColor =
    core.hp / core.maxHp > 0.5
      ? PALETTE.coreHealthy
      : core.hp / core.maxHp > 0.25
        ? PALETTE.coreWarning
        : PALETTE.coreCritical;
  ctx.fillStyle = coreColor;
  ctx.fillText(`BASTION CORE ${Math.ceil(core.hp)}/${core.maxHp}`, 288, 18);
  drawProgressBar(ctx, 288, 29, 248, 18, core.hp / core.maxHp, coreColor);
  setFont(ctx, '600', 12);
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.fillText('DEFEND CENTRAL AEGIS REACTOR', 288, 57);

  // 3. Center Wave & Hostiles Badge (x: 554..744)
  drawRoundedRect(ctx, 552, 8, 196, 58, 8);
  ctx.fillStyle = '#132242';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  setFont(ctx, '800', 18);
  ctx.fillStyle = '#facc15';
  ctx.fillText(`WAVE ${worldState.wave} / ${worldState.totalWaves}`, 650, 25);
  const remainingFoes = worldState.enemies.length + (worldState.spawnQueue ? worldState.spawnQueue.length : 0);
  setFont(ctx, '700', 13);
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.fillText(`HOSTILES ACTIVE: ${remainingFoes}`, 650, 48);

  // 4. Overdrive Gauge (x: 762..972)
  const odReady = player.overdrive >= PLAYER_STATS.overdriveMax;
  ctx.textAlign = 'left';
  setFont(ctx, '700', 14);
  ctx.fillStyle = odReady ? '#facc15' : '#e879f9';
  ctx.fillText(
    odReady ? 'OVERDRIVE READY! [E / Q]' : `OVERDRIVE ${Math.floor(player.overdrive)}% [E / Q]`,
    764,
    18,
  );
  drawProgressBar(
    ctx,
    764,
    29,
    204,
    18,
    player.overdrive / PLAYER_STATS.overdriveMax,
    odReady ? '#facc15' : '#c084fc',
  );
  setFont(ctx, '600', 12);
  ctx.fillStyle = PALETTE.textSecondary;
  const dashReady = player.dashCooldown <= 0;
  ctx.fillText(
    dashReady ? 'DASH-PARRY [SPACE]: READY' : `DASH COOLDOWN: ${player.dashCooldown.toFixed(1)}s`,
    764,
    57,
  );

  // 5. Score, Combo & Quick Action Buttons (x: 984..1268)
  ctx.textAlign = 'right';
  setFont(ctx, '800', 22);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`SCORE ${worldState.score.toLocaleString('en-US')}`, 1168, 22);

  setFont(ctx, '800', 15);
  ctx.fillStyle = '#facc15';
  ctx.fillText(`COMBO x${player.combo.toFixed(1)}`, 1072, 52);

  setFont(ctx, '600', 13);
  ctx.fillStyle = PALETTE.textMuted;
  ctx.fillText(`BEST ${Math.max(bestScore, worldState.score).toLocaleString('en-US')}`, 1168, 52);

  // Pause & Mute interactive buttons
  const pauseBtn = { id: 'btn_pause', x: 1180, y: 10, w: 86, h: 25, command: CMD_PAUSE_TOGGLE };
  const muteBtn = { id: 'btn_mute', x: 1180, y: 40, w: 86, h: 25, command: CMD_MUTE_TOGGLE };
  interactiveButtons.push(pauseBtn, muteBtn);

  drawRoundedRect(ctx, pauseBtn.x, pauseBtn.y, pauseBtn.w, pauseBtn.h, 5);
  ctx.fillStyle = hoveredButtonId === pauseBtn.id ? '#2563eb' : '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  setFont(ctx, '700', 12);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('[P] PAUSE', pauseBtn.x + pauseBtn.w / 2, pauseBtn.y + 13);

  drawRoundedRect(ctx, muteBtn.x, muteBtn.y, muteBtn.w, muteBtn.h, 5);
  ctx.fillStyle = hoveredButtonId === muteBtn.id ? '#2563eb' : '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.stroke();
  ctx.fillStyle = audioMuted ? '#f43f5e' : '#22d3ee';
  ctx.fillText(audioMuted ? '[M] MUTED' : '[M] AUDIO', muteBtn.x + muteBtn.w / 2, muteBtn.y + 13);

  // Bottom Tactical Status Bar
  const botY = ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight;
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, botY, ARENA_CONFIG.width, ARENA_CONFIG.hudBottomHeight);
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, botY);
  ctx.lineTo(ARENA_CONFIG.width, botY);
  ctx.stroke();

  ctx.textAlign = 'left';
  setFont(ctx, '700', 14);
  ctx.fillStyle = player.weapon.color;
  ctx.fillText(`ARMAMENT: ${player.weapon.shortLabel}`, 18, botY + 18);

  setFont(ctx, '600', 13);
  ctx.fillStyle = PALETTE.textSecondary;
  const augNames =
    worldState.acquiredAugments.length > 0
      ? worldState.acquiredAugments.map((a) => a.title.split(' ')[0]).join(' + ')
      : 'STANDARD LOADOUT';
  ctx.fillText(`AUGMENTS (${worldState.acquiredAugments.length}): ${augNames}  •  PARRIES: ${worldState.parries}`, 18, botY + 38);

  ctx.textAlign = 'right';
  setFont(ctx, '600', 13);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(
    'CONTROLS: [WASD/Arrows] Move • [Mouse + L-Click] Aim & Shoot • [Space/R-Click] Dash-Parry • [E/Q] Nova • [R] Restart',
    ARENA_CONFIG.width - 18,
    botY + 28,
  );

  // Boss health bar overlay at top of arena if Chrono Warden is active
  const boss = worldState.enemies.find((e) => e.kind === 'boss');
  if (boss) {
    const bw = 540;
    const bx = (ARENA_CONFIG.width - bw) / 2;
    const by = ARENA_CONFIG.hudTopHeight + 12;
    drawRoundedRect(ctx, bx - 12, by - 6, bw + 24, 42, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    setFont(ctx, '800', 14);
    ctx.fillStyle = '#facc15';
    ctx.fillText(
      `BOSS: ${boss.label} (PHASE ${boss.bossPhase}/3) — ${Math.ceil(boss.hp)} / ${boss.maxHp} HP`,
      ARENA_CONFIG.width / 2,
      by + 6,
    );
    drawProgressBar(ctx, bx, by + 17, bw, 14, boss.hp / boss.maxHp, '#f43f5e', '#1f1224', '#facc15');
  } else if (worldState.waveBannerTimer > 0 && worldState.waveTitle) {
    const bw = 520;
    const bx = (ARENA_CONFIG.width - bw) / 2;
    const by = ARENA_CONFIG.hudTopHeight + 14;
    drawRoundedRect(ctx, bx, by, bw, 46, 8);
    ctx.fillStyle = 'rgba(13, 25, 48, 0.90)';
    ctx.fill();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    setFont(ctx, '800', 16);
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(worldState.waveTitle, ARENA_CONFIG.width / 2, by + 16);
    setFont(ctx, '600', 12);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(worldState.waveSubtitle, ARENA_CONFIG.width / 2, by + 34);
  }
}

export function drawTitleBriefingOverlay(ctx, worldState, bestScore, interactiveButtons, hoveredButtonId) {
  const px = 90;
  const py = 92;
  const pw = ARENA_CONFIG.width - 180;
  const ph = 626;

  drawRoundedRect(ctx, px, py, pw, ph, 16);
  ctx.fillStyle = 'rgba(7, 13, 27, 0.92)';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Header badge
  drawRoundedRect(ctx, px + 340, py + 18, pw - 680, 30, 15);
  ctx.fillStyle = '#1e3a8a';
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setFont(ctx, '800', 13);
  ctx.fillStyle = '#67e8f9';
  ctx.fillText('TACTICAL ARENA ROGUELITE • KEYBOARD + MOUSE', ARENA_CONFIG.width / 2, py + 33);

  // Main Title
  setFont(ctx, '900', 52);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('SPRINTER BASTION', ARENA_CONFIG.width / 2, py + 84);

  setFont(ctx, '700', 18);
  ctx.fillStyle = '#facc15';
  ctx.fillText('OVERDRIVE PROTOCOL — DEFEND THE CENTRAL AEGIS CORE', ARENA_CONFIG.width / 2, py + 122);

  // Left Card: Mission Goal & Rules
  const colY = py + 150;
  const colW = 500;
  const colH = 330;
  const leftX = px + 34;
  drawRoundedRect(ctx, leftX, colY, colW, colH, 12);
  ctx.fillStyle = 'rgba(15, 26, 50, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  setFont(ctx, '800', 20);
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('MISSION GOAL & TACTICAL RULES', leftX + 22, colY + 32);

  const rules = [
    ['1. WIN / LOSE:', 'Survive 5 escalating waves & defeat the Chrono Warden Boss.'],
    ['', 'Lose if your Sprinter Hull or the central Bastion Core hits 0 HP.'],
    ['2. BASTION PARRY:', 'Phase-Dash through enemy laser sights & plasma orbs to'],
    ['', 'reflect fire, gain +250 Score, boost Combo & charge Overdrive!'],
    ['3. OVERDRIVE NOVA:', 'At 100% Overdrive, press [E / Q] to unleash a screen-wide'],
    ['', 'plasma shockwave that obliterates projectiles & stuns foes.'],
    ['4. AUGMENT DECK:', 'Choose 1 of 3 Weapon Evolutions & Upgrades after every wave.'],
  ];

  let ry = colY + 68;
  for (let i = 0; i < rules.length; i += 1) {
    const [label, desc] = rules[i];
    if (label) {
      setFont(ctx, '800', 14);
      ctx.fillStyle = '#facc15';
      ctx.fillText(label, leftX + 22, ry);
      setFont(ctx, '600', 14);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(desc, leftX + 158, ry);
    } else {
      setFont(ctx, '500', 14);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(desc, leftX + 158, ry);
    }
    ry += 35;
  }

  // Right Card: Responsive Controls
  const rightX = px + pw - colW - 34;
  drawRoundedRect(ctx, rightX, colY, colW, colH, 12);
  ctx.fillStyle = 'rgba(15, 26, 50, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.stroke();

  setFont(ctx, '800', 20);
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('RESPONSIVE KEYBOARD + MOUSE CONTROLS', rightX + 22, colY + 32);

  const controls = [
    ['WASD / Arrow Keys', '8-Directional Sprinter Rig Movement'],
    ['Mouse + Left-Click', '360° Reticle Aiming & Primary Weapon Fire'],
    ['Space / Shift / R-Click', 'Phase-Dash & Bastion Projectile Parry'],
    ['E / Q / Middle-Click', 'Unleash Overdrive Nova (at 100% Charge)'],
    ['Keys 1 / 2 / 3 or Click', 'Select Tactical Augment Card Between Waves'],
    ['P Key / Pause Button', 'Pause & Tactical Inspection'],
    ['R Key / M Key', 'Instant Restart Run (R) • Synth Mute (M)'],
  ];

  let cy = colY + 70;
  for (let i = 0; i < controls.length; i += 1) {
    const [keyText, actionText] = controls[i];
    drawRoundedRect(ctx, rightX + 20, cy - 13, 178, 26, 5);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    setFont(ctx, '800', 13);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(keyText, rightX + 109, cy);

    ctx.textAlign = 'left';
    setFont(ctx, '600', 14);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(actionText, rightX + 210, cy);
    cy += 37;
  }

  // Bottom Start CTA Button
  const startBtn = {
    id: 'btn_start_mission',
    x: ARENA_CONFIG.width / 2 - 290,
    y: py + ph - 118,
    w: 580,
    h: 64,
    command: CMD_START_OR_CONFIRM,
  };
  interactiveButtons.push(startBtn);

  drawRoundedRect(ctx, startBtn.x, startBtn.y, startBtn.w, startBtn.h, 12);
  ctx.fillStyle = hoveredButtonId === startBtn.id ? '#0ea5e9' : '#0284c7';
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  setFont(ctx, '900', 24);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('▶ START MISSION — CLICK OR PRESS SPACE', ARENA_CONFIG.width / 2, startBtn.y + 33);

  setFont(ctx, '700', 15);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(
    `RECORD SCORE: ${bestScore.toLocaleString('en-US')} PTS  •  5 ESCALATING WAVES + CHRONO WARDEN BOSS`,
    ARENA_CONFIG.width / 2,
    py + ph - 26,
  );
}

export function drawAugmentSelectionModal(ctx, worldState, interactiveButtons, hoveredButtonId) {
  const choices = worldState.augmentChoices || [];
  const mx = 74;
  const my = 96;
  const mw = ARENA_CONFIG.width - 148;
  const mh = 616;

  drawRoundedRect(ctx, mx, my, mw, mh, 16);
  ctx.fillStyle = 'rgba(7, 13, 27, 0.93)';
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setFont(ctx, '900', 34);
  ctx.fillStyle = '#facc15';
  ctx.fillText(`WAVE ${worldState.wave} CLEARED — TACTICAL AUGMENT & EVOLUTION`, ARENA_CONFIG.width / 2, my + 44);

  setFont(ctx, '700', 17);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(
    'CHOOSE 1 OF 3 UPGRADE CARDS TO EVOLVE YOUR SPRINTER RIG  •  CLICK A CARD OR PRESS [1] [2] [3]',
    ARENA_CONFIG.width / 2,
    my + 82,
  );

  const cardW = 336;
  const cardH = 440;
  const gap = 28;
  const startX = (ARENA_CONFIG.width - (cardW * 3 + gap * 2)) / 2;
  const cardY = my + 116;
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

    drawRoundedRect(ctx, cx, cardY, cardW, cardH, 14);
    ctx.fillStyle = isSelected ? 'rgba(23, 43, 84, 0.98)' : 'rgba(15, 25, 48, 0.95)';
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#facc15' : card.badgeColor;
    ctx.lineWidth = isSelected ? 3.5 : 2;
    ctx.stroke();

    // Key shortcut badge [1], [2], [3]
    drawRoundedRect(ctx, cx + 18, cardY + 16, 54, 30, 6);
    ctx.fillStyle = card.badgeColor;
    ctx.fill();
    ctx.textAlign = 'center';
    setFont(ctx, '900', 15);
    ctx.fillStyle = '#090d16';
    ctx.fillText(`KEY ${i + 1}`, cx + 45, cardY + 31);

    // Category pill
    ctx.textAlign = 'right';
    setFont(ctx, '800', 12);
    ctx.fillStyle = card.badgeColor;
    ctx.fillText(card.category, cx + cardW - 18, cardY + 31);

    // Procedural emblem illustration inside card
    const iconCenterX = cx + cardW / 2;
    const iconCenterY = cardY + 114;
    ctx.beginPath();
    ctx.arc(iconCenterX, iconCenterY, 44, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(9, 16, 32, 0.9)';
    ctx.fill();
    ctx.strokeStyle = card.badgeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Emblem geometry
    ctx.save();
    ctx.translate(iconCenterX, iconCenterY);
    ctx.strokeStyle = card.badgeColor;
    ctx.fillStyle = card.badgeColor;
    ctx.lineWidth = 3;
    if (card.weaponEvolution === 'prismScatter') {
      for (let a = -1; a <= 1; a += 1) {
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(a * 22, -24);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(a * 22, -24, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (card.weaponEvolution === 'arcLance') {
      ctx.beginPath();
      ctx.moveTo(-18, 20);
      ctx.lineTo(-4, 0);
      ctx.lineTo(10, 8);
      ctx.lineTo(20, -22);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(24, 0);
      ctx.lineTo(0, 26);
      ctx.lineTo(-24, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Card Title
    ctx.textAlign = 'center';
    setFont(ctx, '900', 20);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(card.title, cx + cardW / 2, cardY + 190);

    // Card Summary (wrapped 2 lines)
    setFont(ctx, '500', 14);
    ctx.fillStyle = '#cbd5e1';
    const words = card.summary.split(' ');
    const mid = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, mid).join(' '), cx + cardW / 2, cardY + 228);
    ctx.fillText(words.slice(mid).join(' '), cx + cardW / 2, cardY + 250);

    // Stat bonus box
    drawRoundedRect(ctx, cx + 18, cardY + 282, cardW - 36, 64, 8);
    ctx.fillStyle = 'rgba(6, 12, 24, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    setFont(ctx, '800', 13);
    ctx.fillStyle = '#10b981';
    ctx.fillText('TACTICAL MODIFIERS:', cx + cardW / 2, cardY + 302);
    setFont(ctx, '700', 13);
    ctx.fillStyle = '#facc15';
    ctx.fillText(card.statLine, cx + cardW / 2, cardY + 326);

    // Select CTA button inside card
    drawRoundedRect(ctx, cx + 20, cardY + cardH - 68, cardW - 40, 48, 8);
    ctx.fillStyle = isSelected ? '#facc15' : card.badgeColor;
    ctx.fill();
    setFont(ctx, '900', 16);
    ctx.fillStyle = '#090d16';
    ctx.fillText(`SELECT CARD [${i + 1}] / CLICK`, cx + cardW / 2, cardY + cardH - 44);
  }
}

export function drawRunResultsAndRestartModal(ctx, worldState, bestScore, interactiveButtons, hoveredButtonId) {
  const isVictory = worldState.victory;
  const mx = 130;
  const my = 96;
  const mw = ARENA_CONFIG.width - 260;
  const mh = 612;

  drawRoundedRect(ctx, mx, my, mw, mh, 16);
  ctx.fillStyle = 'rgba(8, 13, 26, 0.94)';
  ctx.fill();
  ctx.strokeStyle = isVictory ? '#10b981' : '#f43f5e';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Status badge
  drawRoundedRect(ctx, ARENA_CONFIG.width / 2 - 190, my + 22, 380, 32, 16);
  ctx.fillStyle = isVictory ? '#065f46' : '#881337';
  ctx.fill();
  setFont(ctx, '800', 14);
  ctx.fillStyle = isVictory ? '#6ee7b7' : '#fda4af';
  ctx.fillText(isVictory ? 'CAMPAIGN COMPLETE • VICTORY' : 'CAMPAIGN ENDED • BASTION OVERRUN', ARENA_CONFIG.width / 2, my + 38);

  // Main Result Header
  setFont(ctx, '900', 46);
  ctx.fillStyle = isVictory ? '#10b981' : '#f43f5e';
  ctx.fillText(
    isVictory ? 'VICTORY — AEGIS CORE SECURED!' : 'GAME OVER — BASTION FALLEN',
    ARENA_CONFIG.width / 2,
    my + 90,
  );

  // Subtitle & Star Rating
  const stars = isVictory ? '★★★★★' : worldState.wave >= 4 ? '★★★★☆' : worldState.wave >= 3 ? '★★★☆☆' : '★★☆☆☆';
  setFont(ctx, '800', 20);
  ctx.fillStyle = '#facc15';
  ctx.fillText(
    `${worldState.defeatReason || 'CHRONO WARDEN ASSAULT'}   •   RATING: ${stars}`,
    ARENA_CONFIG.width / 2,
    my + 132,
  );

  // 2x3 Stats Telemetry Grid
  const stats = [
    ['FINAL SCORE', worldState.score.toLocaleString('en-US'), `BEST SCORE: ${Math.max(bestScore, worldState.score).toLocaleString('en-US')}`, '#38bdf8'],
    ['WAVE REACHED', `SECTOR ${worldState.wave} / ${worldState.totalWaves}`, isVictory ? 'CHRONO WARDEN DEFEATED' : 'FINAL BOSS ENCOUNTER', '#facc15'],
    ['HOSTILES ELIMINATED', `${worldState.kills} FOES`, 'CONFIRMED BASTION KILLS', '#f43f5e'],
    ['BASTION PARRIES', `${worldState.parries} PARRIES`, 'PHASE-DASH REFLECTIONS', '#22d3ee'],
    ['PEAK SCORE COMBO', `x${worldState.player.maxCombo.toFixed(2)}`, 'MAXIMUM MULTIPLIER', '#a855f7'],
    ['FINAL ARMAMENT', worldState.player.weapon.shortLabel, `${worldState.acquiredAugments.length} AUGMENTS EQUIPPED`, '#10b981'],
  ];

  const cellW = 296;
  const cellH = 122;
  const gapX = 26;
  const gapY = 22;
  const gridStartX = (ARENA_CONFIG.width - (cellW * 3 + gapX * 2)) / 2;
  const gridStartY = my + 168;

  for (let i = 0; i < stats.length; i += 1) {
    const [label, value, sub, accent] = stats[i];
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = gridStartX + col * (cellW + gapX);
    const cy = gridStartY + row * (cellH + gapY);

    drawRoundedRect(ctx, cx, cy, cellW, cellH, 10);
    ctx.fillStyle = 'rgba(15, 26, 50, 0.96)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    setFont(ctx, '800', 13);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(label, cx + cellW / 2, cy + 26);

    setFont(ctx, '900', 28);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(value, cx + cellW / 2, cy + 64);

    setFont(ctx, '700', 13);
    ctx.fillStyle = accent;
    ctx.fillText(sub, cx + cellW / 2, cy + 98);
  }

  // Prominent Restart / Play Again Button
  const restartBtn = {
    id: 'btn_play_again',
    x: ARENA_CONFIG.width / 2 - 310,
    y: my + mh - 134,
    w: 620,
    h: 66,
    command: CMD_RESTART_RUN,
  };
  interactiveButtons.push(restartBtn);

  drawRoundedRect(ctx, restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 12);
  ctx.fillStyle = hoveredButtonId === restartBtn.id ? '#059669' : '#10b981';
  ctx.fill();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.stroke();

  setFont(ctx, '900', 24);
  ctx.fillStyle = '#06101e';
  ctx.fillText('↻ PLAY AGAIN / RESTART — CLICK OR PRESS [R / SPACE]', ARENA_CONFIG.width / 2, restartBtn.y + 33);

  setFont(ctx, '700', 15);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(
    'PRESS [R] OR [SPACE] OR CLICK ABOVE TO LAUNCH A NEW CAMPAIGN RUN IMMEDIATELY',
    ARENA_CONFIG.width / 2,
    my + mh - 34,
  );
}

export function drawPauseModal(ctx, interactiveButtons, hoveredButtonId) {
  const pw = 540;
  const ph = 280;
  const px = (ARENA_CONFIG.width - pw) / 2;
  const py = (ARENA_CONFIG.height - ph) / 2;

  drawRoundedRect(ctx, px, py, pw, ph, 14);
  ctx.fillStyle = 'rgba(8, 14, 28, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setFont(ctx, '900', 38);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('MISSION PAUSED', ARENA_CONFIG.width / 2, py + 58);

  setFont(ctx, '600', 16);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Aegis Bastion telemetry on standby. Ready to resume combat.', ARENA_CONFIG.width / 2, py + 104);

  const resumeBtn = { id: 'btn_resume', x: px + 60, y: py + 142, w: 420, h: 50, command: CMD_PAUSE_TOGGLE };
  const restartBtn = { id: 'btn_pause_restart', x: px + 60, y: py + 206, w: 420, h: 46, command: CMD_RESTART_RUN };
  interactiveButtons.push(resumeBtn, restartBtn);

  drawRoundedRect(ctx, resumeBtn.x, resumeBtn.y, resumeBtn.w, resumeBtn.h, 8);
  ctx.fillStyle = hoveredButtonId === resumeBtn.id ? '#0ea5e9' : '#0284c7';
  ctx.fill();
  setFont(ctx, '800', 18);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('▶ RESUME MISSION [PRESS P / ESC]', ARENA_CONFIG.width / 2, resumeBtn.y + 25);

  drawRoundedRect(ctx, restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 8);
  ctx.fillStyle = hoveredButtonId === restartBtn.id ? '#dc2626' : '#334155';
  ctx.fill();
  setFont(ctx, '800', 16);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('↻ RESTART RUN [PRESS R]', ARENA_CONFIG.width / 2, restartBtn.y + 23);
}

export function drawAimReticle(ctx, aimX, aimY, player) {
  ctx.save();
  ctx.translate(aimX, aimY);

  // Subtle dashed aim line from player to reticle
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.restore();

  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-21, 0);
  ctx.lineTo(-8, 0);
  ctx.moveTo(8, 0);
  ctx.lineTo(21, 0);
  ctx.moveTo(0, -21);
  ctx.lineTo(0, -8);
  ctx.moveTo(0, 8);
  ctx.lineTo(0, 21);
  ctx.stroke();

  ctx.fillStyle = player.weapon.color;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
