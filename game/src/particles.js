// Visual juice and feedback system: particle sparks, dash afterimages, shockwave rings,
// floating damage/combo text, hit-stop micro-freeze, and directional screen shake.

import { randomRange } from './random.js';

export function createEffectsPool() {
  return {
    sparks: [],
    afterimages: [],
    floatingTexts: [],
    rings: [],
    lightningArcs: [],
    shakeMagnitude: 0,
    shakeX: 0,
    shakeY: 0,
    hitStopTimer: 0,
  };
}

export function spawnHitSparks(effects, random, x, y, color = '#22d3ee', count = 10, speedScale = 1) {
  for (let i = 0; i < count; i += 1) {
    const angle = randomRange(random, 0, Math.PI * 2);
    const speed = randomRange(random, 65, 250) * speedScale;
    const life = randomRange(random, 0.2, 0.45);
    effects.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: randomRange(random, 2.2, 4.8),
      color,
      life,
      maxLife: life,
    });
  }
}

export function spawnDashAfterimage(effects, x, y, angle, radius, color = '#38bdf8') {
  effects.afterimages.push({
    x,
    y,
    angle,
    radius,
    color,
    life: 0.24,
    maxLife: 0.24,
  });
}

export function spawnFloatingCombatText(effects, x, y, text, color = '#f8fafc', size = 18) {
  effects.floatingTexts.push({
    x,
    y,
    vy: -48,
    text,
    color,
    size,
    life: 0.85,
    maxLife: 0.85,
  });
}

export function spawnExplosionRing(effects, x, y, maxRadius = 90, color = '#22d3ee', duration = 0.35) {
  effects.rings.push({
    x,
    y,
    radius: 8,
    maxRadius,
    color,
    life: duration,
    maxLife: duration,
  });
}

export function spawnLightningArc(effects, x1, y1, x2, y2, color = '#a855f7') {
  effects.lightningArcs.push({
    x1,
    y1,
    x2,
    y2,
    color,
    life: 0.18,
    maxLife: 0.18,
  });
}

export function triggerScreenShake(effects, magnitude = 8, hitStopSeconds = 0) {
  effects.shakeMagnitude = Math.max(effects.shakeMagnitude, magnitude);
  if (hitStopSeconds > 0) {
    effects.hitStopTimer = Math.max(effects.hitStopTimer, hitStopSeconds);
  }
}

export function stepVisualEffects(effects, random, dt) {
  if (effects.hitStopTimer > 0) {
    effects.hitStopTimer = Math.max(0, effects.hitStopTimer - dt);
  }

  if (effects.shakeMagnitude > 0.2) {
    const angle = randomRange(random, 0, Math.PI * 2);
    effects.shakeX = Math.cos(angle) * effects.shakeMagnitude;
    effects.shakeY = Math.sin(angle) * effects.shakeMagnitude;
    effects.shakeMagnitude *= Math.pow(0.04, dt);
  } else {
    effects.shakeMagnitude = 0;
    effects.shakeX = 0;
    effects.shakeY = 0;
  }

  for (let i = effects.sparks.length - 1; i >= 0; i -= 1) {
    const s = effects.sparks[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 0.92;
    s.vy *= 0.92;
    s.life -= dt;
    if (s.life <= 0) effects.sparks.splice(i, 1);
  }

  for (let i = effects.afterimages.length - 1; i >= 0; i -= 1) {
    const a = effects.afterimages[i];
    a.life -= dt;
    if (a.life <= 0) effects.afterimages.splice(i, 1);
  }

  for (let i = effects.floatingTexts.length - 1; i >= 0; i -= 1) {
    const f = effects.floatingTexts[i];
    f.y += f.vy * dt;
    f.vy *= 0.95;
    f.life -= dt;
    if (f.life <= 0) effects.floatingTexts.splice(i, 1);
  }

  for (let i = effects.rings.length - 1; i >= 0; i -= 1) {
    const r = effects.rings[i];
    r.life -= dt;
    const progress = 1 - Math.max(0, r.life) / r.maxLife;
    r.radius = 10 + (r.maxRadius - 10) * (1 - Math.pow(1 - progress, 2));
    if (r.life <= 0) effects.rings.splice(i, 1);
  }

  for (let i = effects.lightningArcs.length - 1; i >= 0; i -= 1) {
    const arc = effects.lightningArcs[i];
    arc.life -= dt;
    if (arc.life <= 0) effects.lightningArcs.splice(i, 1);
  }
}
