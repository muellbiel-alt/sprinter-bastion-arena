// Canvas 2D arena renderer: tactical hex grid, Aegis Core reactor, enemy attack telegraphs,
// distinct enemy hulls, Sprinter rig, plasma projectiles, lightning arcs, and floating combat text.

import {
  ARENA_CONFIG,
  FONT_FAMILY,
  PALETTE,
  SCREEN_COMBAT,
  SCREEN_GAMEOVER,
  SCREEN_PAUSED,
  SCREEN_TITLE,
  SCREEN_UPGRADE,
} from './config.js';
import {
  drawAimReticle,
  drawAugmentSelectionModal,
  drawPauseModal,
  drawRunResultsAndRestartModal,
  drawTacticalHud,
  drawTitleBriefingOverlay,
} from './hud.js';

export function drawBastionArenaFloor(ctx, worldState) {
  ctx.fillStyle = PALETTE.arenaBg;
  ctx.fillRect(0, 0, ARENA_CONFIG.width, ARENA_CONFIG.height);

  // Radial core glow
  const grad = ctx.createRadialGradient(
    ARENA_CONFIG.coreX,
    ARENA_CONFIG.coreY,
    24,
    ARENA_CONFIG.coreX,
    ARENA_CONFIG.coreY,
    460,
  );
  grad.addColorStop(0, 'rgba(34, 211, 238, 0.16)');
  grad.addColorStop(0.5, 'rgba(30, 58, 138, 0.08)');
  grad.addColorStop(1, 'rgba(11, 19, 36, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ARENA_CONFIG.width, ARENA_CONFIG.height);

  // Tactical grid lines
  ctx.strokeStyle = PALETTE.arenaGrid;
  ctx.lineWidth = 1;
  const step = 64;
  for (let x = step; x < ARENA_CONFIG.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, ARENA_CONFIG.hudTopHeight);
    ctx.lineTo(x, ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight);
    ctx.stroke();
  }
  for (let y = ARENA_CONFIG.hudTopHeight + step; y < ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA_CONFIG.width, y);
    ctx.stroke();
  }

  // Concentric defense perimeter rings around Aegis Core
  const radii = [110, 210, 320];
  ctx.strokeStyle = PALETTE.arenaRing;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < radii.length; i += 1) {
    ctx.beginPath();
    ctx.arc(ARENA_CONFIG.coreX, ARENA_CONFIG.coreY, radii[i], 0, Math.PI * 2);
    ctx.stroke();
  }

  // Arena combat perimeter frame
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    16,
    ARENA_CONFIG.hudTopHeight + 8,
    ARENA_CONFIG.width - 32,
    ARENA_CONFIG.height - ARENA_CONFIG.hudTopHeight - ARENA_CONFIG.hudBottomHeight - 16,
  );
}

export function drawAegisCoreShield(ctx, worldState) {
  const core = worldState.core;
  const ratio = core.hp / core.maxHp;
  const color =
    ratio > 0.5 ? PALETTE.coreHealthy : ratio > 0.25 ? PALETTE.coreWarning : PALETTE.coreCritical;

  ctx.save();
  ctx.translate(core.x, core.y);

  // Outer rotating shield segments
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i += 1) {
    const start = core.pulseAngle + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.arc(0, 0, core.radius + 8, start, start + 0.68);
    ctx.stroke();
  }

  // Octagonal reactor body
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    const rx = Math.cos(a) * core.radius;
    const ry = Math.sin(a) * core.radius;
    if (i === 0) ctx.moveTo(rx, ry);
    else ctx.lineTo(rx, ry);
  }
  ctx.closePath();
  ctx.fillStyle = core.hitFlash > 0 ? '#f43f5e' : '#0f1e3a';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner core crystal
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.font = `800 12px ${FONT_FAMILY}`;
  ctx.fillStyle = '#06101e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AEGIS', 0, -4);
  ctx.fillText(`${Math.ceil( (core.hp / core.maxHp) * 100 )}%`, 0, 8);

  ctx.restore();
}

export function drawEnemyTelegraphsAndUnits(ctx, worldState) {
  // 1. Mortar ground hazard rings
  for (let i = 0; i < worldState.hazardZones.length; i += 1) {
    const hz = worldState.hazardZones[i];
    const progress = 1 - Math.max(0, hz.timer) / hz.maxTimer;
    ctx.save();
    ctx.translate(hz.x, hz.y);
    ctx.beginPath();
    ctx.arc(0, 0, hz.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(192, 132, 252, 0.18)';
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, hz.radius * progress, 0, Math.PI * 2);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // 2. Enemy attack telegraphs (laser lock-ons, charge vectors, boss sweep beams)
  for (let i = 0; i < worldState.enemies.length; i += 1) {
    const enemy = worldState.enemies[i];

    if (enemy.kind === 'boss' && enemy.beamSweepActive) {
      for (let b = 0; b < 4; b += 1) {
        const angle = enemy.beamAngle + (b * Math.PI) / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.42)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + Math.cos(angle) * 520, enemy.y + Math.sin(angle) * 520);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (enemy.telegraphTimer > 0) {
      const ratio = 1 - enemy.telegraphTimer / Math.max(0.1, enemy.telegraphMax);
      ctx.save();
      if (enemy.kind === 'sniper') {
        ctx.strokeStyle = ratio > 0.65 ? '#facc15' : '#fb923c';
        ctx.lineWidth = ratio > 0.65 ? 3.5 : 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.targetX, enemy.targetY);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (enemy.kind === 'swarmer' || enemy.kind === 'bruiser') {
        const angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
        const dist = enemy.kind === 'bruiser' ? 110 : 80;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + Math.cos(angle) * dist, enemy.y + Math.sin(angle) * dist);
        ctx.stroke();
      } else if (enemy.kind === 'boss') {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 14 + ratio * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 3. Enemy hulls and health bars
  for (let i = 0; i < worldState.enemies.length; i += 1) {
    const enemy = worldState.enemies[i];
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);

    const fill = enemy.hitFlash > 0 ? '#ffffff' : enemy.color;
    ctx.fillStyle = fill;
    ctx.strokeStyle = enemy.accent;
    ctx.lineWidth = 2.5;

    if (enemy.kind === 'boss') {
      // Dreadnought multi-ring hull
      ctx.beginPath();
      for (let p = 0; p < 12; p += 1) {
        const a = (p * Math.PI) / 6;
        const r = p % 2 === 0 ? enemy.radius + 6 : enemy.radius - 8;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.stroke();
    } else if (enemy.kind === 'sniper') {
      // Angular rail-sniper triangle
      ctx.beginPath();
      ctx.moveTo(enemy.radius + 6, 0);
      ctx.lineTo(-enemy.radius, -enemy.radius * 0.85);
      ctx.lineTo(-enemy.radius * 0.5, 0);
      ctx.lineTo(-enemy.radius, enemy.radius * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (enemy.kind === 'mortar') {
      // Hexagonal artillery drone
      ctx.beginPath();
      for (let p = 0; p < 6; p += 1) {
        const a = (p * Math.PI) / 3;
        const px = Math.cos(a) * enemy.radius;
        const py = Math.sin(a) * enemy.radius;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (enemy.kind === 'bruiser') {
      // Heavy armored juggernaut with front shield arc
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 4, -0.9, 0.9);
      ctx.stroke();
    } else {
      // Swarmer interceptor
      ctx.beginPath();
      ctx.moveTo(enemy.radius + 3, 0);
      ctx.lineTo(-enemy.radius, -enemy.radius * 0.75);
      ctx.lineTo(-enemy.radius, enemy.radius * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // Unit mini health bar
    if (enemy.kind !== 'boss' && enemy.hp < enemy.maxHp) {
      const bw = enemy.radius * 2;
      const bx = enemy.x - enemy.radius;
      const by = enemy.y - enemy.radius - 11;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = enemy.color;
      ctx.fillRect(bx, by, Math.max(2, bw * (enemy.hp / enemy.maxHp)), 5);
    }
  }
}

export function drawPlayerSprinterRig(ctx, worldState) {
  const player = worldState.player;

  // Dash afterimages
  for (let i = 0; i < worldState.effects.afterimages.length; i += 1) {
    const a = worldState.effects.afterimages[i];
    const alpha = Math.max(0, a.life / a.maxLife) * 0.55;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(a.x, a.y);
    ctx.rotate(a.angle);
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.arc(0, 0, a.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Tactical laser aim line toward reticle
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.aimX, player.aimY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.save();
  ctx.translate(player.x, player.y);

  // Parry window golden reflective halo
  if (player.parryTimer > 0) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 14, 0, Math.PI * 2);
    ctx.stroke();
  } else if (player.shield > 0) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, player.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.rotate(player.angle);

  // Sprinter chassis & twin cannon barrels
  ctx.fillStyle = player.weapon.color;
  ctx.fillRect(6, -8, player.radius + 10, 5);
  ctx.fillRect(6, 3, player.radius + 10, 5);

  ctx.beginPath();
  ctx.moveTo(player.radius + 6, 0);
  ctx.lineTo(-player.radius, -player.radius);
  ctx.lineTo(-player.radius * 0.55, 0);
  ctx.lineTo(-player.radius, player.radius);
  ctx.closePath();
  ctx.fillStyle = PALETTE.playerBody;
  ctx.fill();
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.playerCore;
  ctx.fill();

  ctx.restore();
}

export function drawProjectilesAndParticles(ctx, worldState) {
  // Shockwave rings
  for (let i = 0; i < worldState.effects.rings.length; i += 1) {
    const r = worldState.effects.rings[i];
    const alpha = Math.max(0, r.life / r.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Chain lightning arcs
  for (let i = 0; i < worldState.effects.lightningArcs.length; i += 1) {
    const arc = worldState.effects.lightningArcs[i];
    const alpha = Math.max(0, arc.life / arc.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(arc.x1, arc.y1);
    ctx.lineTo((arc.x1 + arc.x2) / 2 + 8, (arc.y1 + arc.y2) / 2 - 8);
    ctx.lineTo(arc.x2, arc.y2);
    ctx.stroke();
    ctx.restore();
  }

  // Player plasma bolts
  for (let i = 0; i < worldState.playerProjectiles.length; i += 1) {
    const bolt = worldState.playerProjectiles[i];
    const angle = Math.atan2(bolt.vy, bolt.vx);
    ctx.save();
    ctx.translate(bolt.x, bolt.y);
    ctx.rotate(angle);
    ctx.fillStyle = bolt.color;
    ctx.beginPath();
    ctx.roundRect(-bolt.radius * 2.2, -bolt.radius * 0.7, bolt.radius * 3.4, bolt.radius * 1.4, 4);
    ctx.fill();
    ctx.restore();
  }

  // Enemy plasma orbs (with parryable ring)
  for (let i = 0; i < worldState.enemyProjectiles.length; i += 1) {
    const orb = worldState.enemyProjectiles[i];
    ctx.save();
    ctx.translate(orb.x, orb.y);
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
    ctx.fillStyle = orb.color;
    ctx.fill();
    ctx.restore();
  }

  // Hit sparks
  for (let i = 0; i < worldState.effects.sparks.length; i += 1) {
    const s = worldState.effects.sparks[i];
    const alpha = Math.max(0, s.life / s.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floating combat numbers & callouts
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < worldState.effects.floatingTexts.length; i += 1) {
    const f = worldState.effects.floatingTexts[i];
    const alpha = Math.min(1, (f.life / f.maxLife) * 1.4);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `900 ${f.size}px ${FONT_FAMILY}`;
    ctx.strokeStyle = '#060a12';
    ctx.lineWidth = 4;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
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

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.voidBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const shakeX = worldState.effects ? worldState.effects.shakeX : 0;
    const shakeY = worldState.effects ? worldState.effects.shakeY : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);

    drawBastionArenaFloor(ctx, worldState);
    drawAegisCoreShield(ctx, worldState);
    drawEnemyTelegraphsAndUnits(ctx, worldState);
    drawPlayerSprinterRig(ctx, worldState);
    drawProjectilesAndParticles(ctx, worldState);
    drawAimReticle(ctx, worldState.player.aimX, worldState.player.aimY, worldState.player);

    // Reset shake offset for crisp HUD and modal rendering
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawTacticalHud(ctx, worldState, bestScore, audioMuted, interactiveButtons, hoveredButtonId);

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
