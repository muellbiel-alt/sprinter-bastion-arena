// High-contrast 3/4 arena compositor: blends architectural backdrop, Aegis obelisk, Y-sorted
// detailed sprites, inked telegraphs/projectiles, particles, atmospheric shafts, and clean HUD.

import { drawArenaAtmosphere, drawArenaBackdrop } from './backdrop.js';
import {
  ARENA_CONFIG,
  FONT_FAMILY,
  PALETTE,
  SCREEN_GAMEOVER,
  SCREEN_PAUSED,
  SCREEN_TITLE,
  SCREEN_UPGRADE,
} from './config.js';
import { TAU, glowDot, labelText } from './draw-utils.js';
import {
  drawAimReticle,
  drawAugmentSelectionModal,
  drawPauseModal,
  drawRunResultsAndRestartModal,
  drawTacticalHud,
  drawTitleBriefingOverlay,
} from './hud.js';
import { drawAegisObelisk, drawBastionVanguard, drawEnemySprite } from './sprites.js';
import { themeForWave } from './themes.js';

const INK = '#141a2b';

export function drawEnemyTelegraphs(ctx, worldState) {
  // Mortar impact warning rings on the stone floor
  for (let i = 0; i < worldState.hazardZones.length; i += 1) {
    const hz = worldState.hazardZones[i];
    const progress = 1 - Math.max(0, hz.timer) / hz.maxTimer;
    ctx.save();
    ctx.translate(hz.x, hz.y);
    ctx.beginPath();
    ctx.ellipse(0, 0, hz.radius, hz.radius * 0.72, 0, 0, TAU);
    ctx.fillStyle = 'rgba(192, 132, 252, 0.24)';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, hz.radius * progress, hz.radius * 0.72 * progress, 0, 0, TAU);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.8;
    ctx.stroke();
    ctx.restore();
  }

  // Enemy laser lock-ons, charge paths, and boss sweep beams
  for (let i = 0; i < worldState.enemies.length; i += 1) {
    const enemy = worldState.enemies[i];

    if (enemy.kind === 'boss' && enemy.beamSweepActive) {
      for (let b = 0; b < 4; b += 1) {
        const angle = enemy.beamAngle + (b * Math.PI) / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 190, 50, 0.45)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y - 28);
        ctx.lineTo(enemy.x + Math.cos(angle) * 460, enemy.y - 28 + Math.sin(angle) * 460);
        ctx.stroke();
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }

    if (enemy.telegraphTimer > 0) {
      const ratio = 1 - enemy.telegraphTimer / Math.max(0.1, enemy.telegraphMax);
      ctx.save();
      if (enemy.kind === 'sniper') {
        ctx.strokeStyle = INK;
        ctx.lineWidth = ratio > 0.6 ? 5 : 4;
        ctx.setLineDash([10, 7]);
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y - 20);
        ctx.lineTo(enemy.targetX, enemy.targetY - 12);
        ctx.stroke();
        ctx.strokeStyle = ratio > 0.6 ? '#fde047' : '#ff6b35';
        ctx.lineWidth = ratio > 0.6 ? 2.8 : 2.2;
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (enemy.kind === 'swarmer' || enemy.kind === 'bruiser') {
        const angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
        const dist = enemy.kind === 'bruiser' ? 115 : 85;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + Math.cos(angle) * dist, enemy.y + Math.sin(angle) * dist);
        ctx.stroke();
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 2.6;
        ctx.stroke();
      } else if (enemy.kind === 'boss') {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y + 10, enemy.radius + 26 + ratio * 18, (enemy.radius + 26) * 0.55, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

export function drawSortedUnitsAndHealthBars(ctx, worldState, time) {
  // Draw dash afterimages behind vanguard
  for (let i = 0; i < worldState.effects.afterimages.length; i += 1) {
    const a = worldState.effects.afterimages[i];
    const alpha = Math.max(0, a.life / a.maxLife) * 0.45;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.ellipse(a.x, a.y - 12, a.radius * 0.9, a.radius * 1.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Subtle aim guide line
  const player = worldState.player;
  ctx.save();
  ctx.strokeStyle = 'rgba(20, 26, 43, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 18);
  ctx.lineTo(player.aimX, player.aimY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Depth-sort Obelisk, Vanguard, and Enemies by Y coordinate for natural 3/4 overlap
  const drawables = [
    { y: worldState.core.y, draw: () => drawAegisObelisk(ctx, worldState.core, time) },
    { y: player.y, draw: () => drawBastionVanguard(ctx, player, time) },
  ];
  for (let i = 0; i < worldState.enemies.length; i += 1) {
    const enemy = worldState.enemies[i];
    drawables.push({
      y: enemy.y,
      draw: () => {
        drawEnemySprite(ctx, enemy, time);
        if (enemy.kind !== 'boss' && enemy.hp < enemy.maxHp) {
          const bw = enemy.radius * 2.1;
          const bx = enemy.x - bw / 2;
          const by = enemy.y - enemy.radius * 2.1 - 14;
          ctx.fillStyle = INK;
          ctx.fillRect(bx - 1.5, by - 1.5, bw + 3, 7);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(bx, by, bw, 4);
          ctx.fillStyle = '#fb7185';
          ctx.fillRect(bx, by, Math.max(2, bw * (enemy.hp / enemy.maxHp)), 4);
        }
      },
    });
  }
  drawables.sort((a, b) => a.y - b.y);
  for (let i = 0; i < drawables.length; i += 1) {
    drawables[i].draw();
  }
}

export function drawProjectilesAndParticles(ctx, worldState) {
  // Shockwave rings
  for (let i = 0; i < worldState.effects.rings.length; i += 1) {
    const r = worldState.effects.rings[i];
    const alpha = Math.max(0, r.life / r.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.restore();
  }

  // Chain lightning arcs
  for (let i = 0; i < worldState.effects.lightningArcs.length; i += 1) {
    const arc = worldState.effects.lightningArcs[i];
    const alpha = Math.max(0, arc.life / arc.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(arc.x1, arc.y1 - 12);
    ctx.lineTo((arc.x1 + arc.x2) / 2 + 10, (arc.y1 + arc.y2) / 2 - 22);
    ctx.lineTo(arc.x2, arc.y2 - 12);
    ctx.stroke();
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // Player plasma bolts (inked high-contrast darts)
  for (let i = 0; i < worldState.playerProjectiles.length; i += 1) {
    const bolt = worldState.playerProjectiles[i];
    const angle = Math.atan2(bolt.vy, bolt.vx);
    glowDot(ctx, bolt.x, bolt.y, bolt.radius * 3.2, '255,230,120', 0.45);
    ctx.save();
    ctx.translate(bolt.x, bolt.y);
    ctx.rotate(angle);
    ctx.fillStyle = bolt.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-bolt.radius * 2.1, -bolt.radius * 0.72, bolt.radius * 3.6, bolt.radius * 1.44, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-bolt.radius, -bolt.radius * 0.25, bolt.radius * 1.8, bolt.radius * 0.5);
    ctx.restore();
  }

  // Enemy plasma orbs (inked crimson-orange orbs so they pop on bright stone)
  for (let i = 0; i < worldState.enemyProjectiles.length; i += 1) {
    const orb = worldState.enemyProjectiles[i];
    glowDot(ctx, orb.x, orb.y, orb.radius * 2.8, '255,80,70', 0.45);
    ctx.save();
    ctx.translate(orb.x, orb.y);
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius + 2, 0, TAU);
    ctx.fillStyle = '#e11d48';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius * 0.55, 0, TAU);
    ctx.fillStyle = '#fef08a';
    ctx.fill();
    ctx.restore();
  }

  // Hit sparks (inked bright particles)
  for (let i = 0; i < worldState.effects.sparks.length; i += 1) {
    const s = worldState.effects.sparks[i];
    const alpha = Math.max(0, s.life / s.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Crisp outlined floating combat text
  for (let i = 0; i < worldState.effects.floatingTexts.length; i += 1) {
    const f = worldState.effects.floatingTexts[i];
    const alpha = Math.min(1, (f.life / f.maxLife) * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    labelText(ctx, f.text, f.x, f.y, f.size, f.color, {
      weight: '900',
      stroke: INK,
      strokeScale: 0.24,
      family: FONT_FAMILY,
    });
    ctx.restore();
  }
}

export function createBastionRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const interactiveButtons = [];

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / ARENA_CONFIG.width, height / ARENA_CONFIG.height);
    view.x = (width - ARENA_CONFIG.width * view.scale) / 2;
    view.y = (height - ARENA_CONFIG.height * view.scale) / 2;
  }

  function renderFrame(worldState, screen, bestScore, audioMuted = false, hoveredButtonId = null) {
    interactiveButtons.length = 0;
    const theme = themeForWave(worldState.wave);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.voidBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const shakeX = worldState.effects ? worldState.effects.shakeX : 0;
    const shakeY = worldState.effects ? worldState.effects.shakeY : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);

    drawArenaBackdrop(ctx, theme, worldState.elapsed);
    drawEnemyTelegraphs(ctx, worldState);
    drawSortedUnitsAndHealthBars(ctx, worldState, worldState.elapsed);
    drawProjectilesAndParticles(ctx, worldState);
    drawArenaAtmosphere(ctx, theme, worldState.elapsed);

    if (screen !== SCREEN_TITLE) {
      drawAimReticle(ctx, worldState.player.aimX, worldState.player.aimY, worldState.player);
    }

    // Crisp unshaken HUD and modal overlays
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawTacticalHud(ctx, worldState, bestScore, audioMuted, interactiveButtons, hoveredButtonId, screen);

    if (screen === SCREEN_TITLE) {
      drawTitleBriefingOverlay(ctx, worldState, bestScore, interactiveButtons, hoveredButtonId);
    } else if (screen === SCREEN_UPGRADE) {
      drawAugmentSelectionModal(ctx, worldState, interactiveButtons, hoveredButtonId);
    } else if (screen === SCREEN_PAUSED) {
      drawPauseModal(ctx, interactiveButtons, hoveredButtonId);
    } else if (screen === SCREEN_GAMEOVER) {
      drawRunResultsAndRestartModal(ctx, worldState, bestScore, interactiveButtons, hoveredButtonId);
    }
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    draw: renderFrame,
    getViewportTransform: () => view,
    getInteractiveButtons: () => interactiveButtons,
  };
}
