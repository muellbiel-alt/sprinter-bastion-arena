// Enemy archetypes, wave spawner, visible attack telegraphs, and Chrono Warden multi-phase boss AI.

import { ARENA_CONFIG, BOSS_PHASES, ENEMY_ARCHETYPES, PLAYER_STATS } from './config.js';
import {
  spawnExplosionRing,
  spawnFloatingCombatText,
  spawnHitSparks,
  triggerScreenShake,
} from './particles.js';
import { randomRange } from './random.js';

export function buildWaveSpawnQueue(random, waveSpec) {
  const queue = [];
  for (let i = 0; i < waveSpec.spawns.length; i += 1) {
    const group = waveSpec.spawns[i];
    for (let c = 0; c < group.count; c += 1) {
      queue.push(group.kind);
    }
  }
  // Keep boss first if present, shuffle the rest deterministically
  const hasBoss = queue.includes('boss');
  const others = queue.filter((k) => k !== 'boss');
  for (let i = others.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = others[i];
    others[i] = others[j];
    others[j] = tmp;
  }
  return hasBoss ? ['boss', ...others] : others;
}

export function spawnEnemyFromEdge(worldState, random, kind, forcedPos = null) {
  const spec = ENEMY_ARCHETYPES[kind] || ENEMY_ARCHETYPES.swarmer;
  let x = 0;
  let y = 0;
  if (forcedPos) {
    x = forcedPos.x;
    y = forcedPos.y;
  } else if (kind === 'boss') {
    x = ARENA_CONFIG.coreX;
    y = ARENA_CONFIG.hudTopHeight + 68;
  } else {
    const edge = Math.floor(random() * 4);
    const pad = 54;
    if (edge === 0) {
      x = randomRange(random, pad, ARENA_CONFIG.width - pad);
      y = ARENA_CONFIG.hudTopHeight + 28;
    } else if (edge === 1) {
      x = ARENA_CONFIG.width - pad;
      y = randomRange(random, ARENA_CONFIG.hudTopHeight + 40, ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight - 40);
    } else if (edge === 2) {
      x = randomRange(random, pad, ARENA_CONFIG.width - pad);
      y = ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight - 28;
    } else {
      x = pad;
      y = randomRange(random, ARENA_CONFIG.hudTopHeight + 40, ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight - 40);
    }
  }

  const waveScale = 1 + (worldState.wave - 1) * 0.12;
  const maxHp = Math.round(spec.hp * (kind === 'boss' ? 1 : waveScale));
  const unit = {
    id: worldState.nextEntityId++,
    kind: spec.kind,
    label: spec.label,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: spec.radius,
    hp: maxHp,
    maxHp,
    speed: spec.speed,
    damage: spec.damage,
    score: spec.score,
    color: spec.color,
    accent: spec.accent,
    angle: Math.atan2(ARENA_CONFIG.coreY - y, ARENA_CONFIG.coreX - x),
    cooldown: randomRange(random, 0.45, spec.attackCooldown * 0.8),
    telegraphTimer: 0,
    telegraphMax: spec.telegraphDuration,
    telegraphKind: null,
    targetX: ARENA_CONFIG.coreX,
    targetY: ARENA_CONFIG.coreY,
    bossPhase: 1,
    beamAngle: 0,
    beamSweepActive: false,
    summonTimer: 5.2,
    hitFlash: 0,
    stunTimer: 0,
  };
  worldState.enemies.push(unit);
  return unit;
}

export function spawnChronoWardenBoss(worldState, random) {
  return spawnEnemyFromEdge(worldState, random, 'boss', {
    x: ARENA_CONFIG.coreX,
    y: ARENA_CONFIG.hudTopHeight + 92,
  });
}

export function spawnWaveEncounter(worldState, random, waveSpec) {
  worldState.spawnQueue = buildWaveSpawnQueue(random, waveSpec);
  worldState.spawnTimer = 0.2;
  worldState.waveTitle = waveSpec.title;
  worldState.waveSubtitle = waveSpec.subtitle;
  worldState.waveBannerTimer = 2.6;
  // Spawn initial vanguard immediately so the arena is lively right away
  const initialCount = Math.min(4, worldState.spawnQueue.length);
  for (let i = 0; i < initialCount; i += 1) {
    const nextKind = worldState.spawnQueue.shift();
    spawnEnemyFromEdge(worldState, random, nextKind);
  }
}

export function stepBossMultiPhaseAttack(worldState, random, boss, dt) {
  const hpRatio = boss.hp / boss.maxHp;
  let phaseSpec = BOSS_PHASES[0];
  if (hpRatio <= BOSS_PHASES[2].hpThreshold) phaseSpec = BOSS_PHASES[2];
  else if (hpRatio <= BOSS_PHASES[1].hpThreshold) phaseSpec = BOSS_PHASES[1];

  if (boss.bossPhase !== phaseSpec.phase) {
    boss.bossPhase = phaseSpec.phase;
    spawnExplosionRing(worldState.effects, boss.x, boss.y, 170, '#facc15', 0.5);
    spawnFloatingCombatText(worldState.effects, boss.x, boss.y - 48, phaseSpec.title, '#facc15', 22);
    triggerScreenShake(worldState.effects, 11, 0.04);
  }

  boss.beamSweepActive = phaseSpec.beamSweep;
  if (boss.beamSweepActive) {
    boss.beamAngle += dt * (boss.bossPhase === 3 ? 0.95 : 0.65);
  }

  boss.summonTimer -= dt;
  if (boss.summonTimer <= 0 && worldState.enemies.length < 10) {
    boss.summonTimer = phaseSpec.summonInterval;
    spawnEnemyFromEdge(worldState, random, 'swarmer', {
      x: boss.x + randomRange(random, -90, 90),
      y: boss.y + randomRange(random, 40, 90),
    });
  }

  if (boss.telegraphTimer > 0) {
    boss.telegraphTimer -= dt;
    if (boss.telegraphTimer <= 0) {
      const count = phaseSpec.radialBolts;
      const baseAngle = boss.angle;
      for (let i = 0; i < count; i += 1) {
        const theta = baseAngle + (i * Math.PI * 2) / count;
        worldState.enemyProjectiles.push({
          x: boss.x + Math.cos(theta) * (boss.radius + 8),
          y: boss.y + Math.sin(theta) * (boss.radius + 8),
          vx: Math.cos(theta) * 285,
          vy: Math.sin(theta) * 285,
          radius: 7,
          damage: 16,
          color: '#facc15',
          parryable: true,
        });
      }
      spawnExplosionRing(worldState.effects, boss.x, boss.y, 110, '#facc15', 0.3);
      boss.cooldown = ENEMY_ARCHETYPES.boss.attackCooldown * (boss.bossPhase === 3 ? 0.72 : 0.88);
    }
  } else {
    boss.cooldown -= dt;
    if (boss.cooldown <= 0) {
      boss.telegraphTimer = ENEMY_ARCHETYPES.boss.telegraphDuration;
      boss.telegraphMax = boss.telegraphTimer;
      boss.telegraphKind = 'radialSalvo';
      boss.targetX = worldState.player.x;
      boss.targetY = worldState.player.y;
    }
  }
}

export function stepEnemyAIAndTelegraphs(worldState, random, dt) {
  const player = worldState.player;
  const core = worldState.core;

  for (let i = worldState.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = worldState.enemies[i];
    if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    if (enemy.stunTimer > 0) {
      enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
      continue;
    }

    const distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    const distToCore = Math.hypot(core.x - enemy.x, core.y - enemy.y);
    const chasePlayer = enemy.kind === 'sniper' || enemy.kind === 'swarmer' || distToPlayer < distToCore * 0.85;
    const goalX = chasePlayer ? player.x : core.x;
    const goalY = chasePlayer ? player.y : core.y;
    const dx = goalX - enemy.x;
    const dy = goalY - enemy.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    enemy.angle = Math.atan2(dy, dx);

    if (enemy.kind === 'boss') {
      const orbitAngle = worldState.elapsed * 0.55;
      const desiredX = ARENA_CONFIG.coreX + Math.cos(orbitAngle) * 210;
      const desiredY = ARENA_CONFIG.coreY - 150 + Math.sin(orbitAngle * 2) * 55;
      enemy.x += (desiredX - enemy.x) * Math.min(1, dt * 1.8);
      enemy.y += (desiredY - enemy.y) * Math.min(1, dt * 1.8);
      stepBossMultiPhaseAttack(worldState, random, enemy, dt);
      continue;
    }

    const spec = ENEMY_ARCHETYPES[enemy.kind] || ENEMY_ARCHETYPES.swarmer;
    const preferredRange = spec.preferredRange || 0;

    if (enemy.telegraphTimer > 0) {
      enemy.telegraphTimer -= dt;
      if (enemy.telegraphTimer <= 0) {
        // Execute telegraphed attack
        if (enemy.kind === 'sniper') {
          const shotAngle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
          worldState.enemyProjectiles.push({
            x: enemy.x + Math.cos(shotAngle) * (enemy.radius + 6),
            y: enemy.y + Math.sin(shotAngle) * (enemy.radius + 6),
            vx: Math.cos(shotAngle) * 540,
            vy: Math.sin(shotAngle) * 540,
            radius: 6,
            damage: enemy.damage,
            color: '#fb923c',
            parryable: true,
          });
        } else if (enemy.kind === 'mortar') {
          worldState.hazardZones.push({
            x: enemy.targetX,
            y: enemy.targetY,
            radius: 68,
            timer: 0.7,
            maxTimer: 0.7,
            damage: enemy.damage,
            color: '#c084fc',
          });
        } else if (enemy.kind === 'swarmer' || enemy.kind === 'bruiser') {
          const lungeAngle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
          const lungeDist = enemy.kind === 'bruiser' ? 105 : 75;
          enemy.x += Math.cos(lungeAngle) * lungeDist;
          enemy.y += Math.sin(lungeAngle) * lungeDist;
          spawnHitSparks(worldState.effects, random, enemy.x, enemy.y, enemy.color, 7, 0.8);
        }
        enemy.cooldown = spec.attackCooldown;
        enemy.telegraphKind = null;
      }
      continue;
    }

    if (preferredRange > 0 && dist < preferredRange) {
      // Hold distance or strafe slightly
      const strafeAngle = enemy.angle + Math.PI * 0.5;
      enemy.x += Math.cos(strafeAngle) * enemy.speed * 0.55 * dt;
      enemy.y += Math.sin(strafeAngle) * enemy.speed * 0.55 * dt;
    } else {
      enemy.x += (dx / dist) * enemy.speed * dt;
      enemy.y += (dy / dist) * enemy.speed * dt;
    }

    // Clamp inside arena bounds
    enemy.x = Math.max(ARENA_CONFIG.margin, Math.min(ARENA_CONFIG.width - ARENA_CONFIG.margin, enemy.x));
    enemy.y = Math.max(
      ARENA_CONFIG.hudTopHeight + 26,
      Math.min(ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight - 26, enemy.y),
    );

    enemy.cooldown -= dt;
    if (enemy.cooldown <= 0 && (preferredRange === 0 ? dist < 135 : dist < preferredRange + 95)) {
      enemy.telegraphTimer = spec.telegraphDuration;
      enemy.telegraphMax = spec.telegraphDuration;
      enemy.telegraphKind = spec.behavior;
      enemy.targetX = goalX;
      enemy.targetY = goalY;
    }

    // Check direct collision with Bastion Core
    if (distToCore <= core.radius + enemy.radius) {
      core.hp = Math.max(0, core.hp - enemy.damage * dt * 1.4);
      core.hitFlash = 0.2;
    }
  }
}

export function damageEnemyUnit(worldState, random, audio, enemy, amount, isCritical = false, sourceLabel = '') {
  const dealt = Math.max(1, Math.round(amount));
  enemy.hp -= dealt;
  enemy.hitFlash = 0.14;

  const textStr = isCritical ? `-${dealt} CRIT!` : sourceLabel ? `${sourceLabel} -${dealt}` : `-${dealt}`;
  const textColor = isCritical ? '#facc15' : sourceLabel ? '#22d3ee' : '#f8fafc';
  spawnFloatingCombatText(
    worldState.effects,
    enemy.x + randomRange(random, -12, 12),
    enemy.y - enemy.radius - 6,
    textStr,
    textColor,
    isCritical ? 19 : 16,
  );

  if (enemy.hp <= 0) {
    const idx = worldState.enemies.indexOf(enemy);
    if (idx !== -1) worldState.enemies.splice(idx, 1);

    const player = worldState.player;
    player.combo = Math.min(9.9, +(player.combo + 0.25 * player.comboGainMult).toFixed(2));
    player.comboTimer = PLAYER_STATS.comboDecayTime;
    player.maxCombo = Math.max(player.maxCombo, player.combo);

    const gainedScore = Math.round(enemy.score * player.combo);
    worldState.score += gainedScore;
    worldState.kills += 1;

    player.overdrive = Math.min(
      PLAYER_STATS.overdriveMax,
      player.overdrive + PLAYER_STATS.overdrivePerKill * player.overdriveGainMult,
    );

    spawnHitSparks(worldState.effects, random, enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 32 : 14, 1.25);
    spawnExplosionRing(worldState.effects, enemy.x, enemy.y, enemy.radius * 2.4, enemy.color, 0.32);
    triggerScreenShake(worldState.effects, enemy.kind === 'boss' ? 16 : 6, enemy.kind === 'boss' ? 0.06 : 0.015);
    if (audio) audio.playEnemyHitSound(true);
    return true;
  }

  spawnHitSparks(worldState.effects, random, enemy.x, enemy.y, enemy.accent, 5, 0.75);
  if (audio) audio.playEnemyHitSound(false);
  return false;
}
