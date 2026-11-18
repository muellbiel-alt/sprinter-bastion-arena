// Core Bastion simulation loop: player physics, core shield regeneration, wave progression,
// enemy spawning, combat collisions, and victory/defeat evaluation.

import { ARENA_CONFIG, PLAYER_STATS, WAVE_SCHEDULE, WEAPON_EVOLUTIONS } from './config.js';
import { spawnEnemyFromEdge, spawnWaveEncounter, stepEnemyAIAndTelegraphs } from './enemies.js';
import { createEffectsPool, spawnDashAfterimage, stepVisualEffects } from './particles.js';
import { rollTacticalAugmentChoices } from './upgrades.js';
import {
  applyDamageToPlayer,
  executeParrySweep,
  fireEquippedWeapon,
  stepProjectilesAndBeams,
  triggerOverdriveNova,
  triggerPhaseDashParry,
} from './weapons.js';

export const EVENT_WAVE_CLEARED = 1 << 0;
export const EVENT_RUN_VICTORY = 1 << 1;
export const EVENT_RUN_DEFEAT = 1 << 2;

export function createInitialPlayerState() {
  return {
    x: ARENA_CONFIG.coreX,
    y: ARENA_CONFIG.coreY + 120,
    vx: 0,
    vy: 0,
    radius: PLAYER_STATS.radius,
    hp: PLAYER_STATS.maxHp,
    maxHp: PLAYER_STATS.maxHp,
    shield: PLAYER_STATS.maxShield,
    maxShield: PLAYER_STATS.maxShield,
    overdrive: 35,
    combo: 1.0,
    maxCombo: 1.0,
    comboTimer: 0,
    angle: -Math.PI / 2,
    aimX: ARENA_CONFIG.coreX + 160,
    aimY: ARENA_CONFIG.coreY - 110,
    fireCooldown: 0,
    dashTimer: 0,
    dashCooldown: 0,
    parryTimer: 0,
    dashDirX: 0,
    dashDirY: -1,
    afterimageTick: 0,
    invulnerable: 0,
    moving: false,
    weaponId: 'pulseCarbine',
    weapon: WEAPON_EVOLUTIONS.pulseCarbine,
    damageMult: 1.0,
    fireRateMult: 1.0,
    speedMult: 1.0,
    dashCooldownMult: 1.0,
    critChance: 0.14,
    parryDamageBonus: 0,
    overdriveGainMult: 1.0,
    novaDamageMult: 1.0,
    comboGainMult: 1.0,
  };
}

export function resetCampaignRun(worldState, random) {
  worldState.player = createInitialPlayerState();
  worldState.core = {
    x: ARENA_CONFIG.coreX,
    y: ARENA_CONFIG.coreY,
    radius: ARENA_CONFIG.coreRadius,
    hp: ARENA_CONFIG.coreMaxHp,
    maxHp: ARENA_CONFIG.coreMaxHp,
    hitFlash: 0,
    pulseAngle: 0,
  };
  worldState.enemies = [];
  worldState.playerProjectiles = [];
  worldState.enemyProjectiles = [];
  worldState.hazardZones = [];
  worldState.effects = createEffectsPool();
  worldState.wave = 1;
  worldState.totalWaves = ARENA_CONFIG.totalWaves;
  worldState.score = 0;
  worldState.kills = 0;
  worldState.parries = 0;
  worldState.elapsed = 0;
  worldState.victory = false;
  worldState.defeatReason = '';
  worldState.acquiredAugments = [];
  worldState.acquiredAugmentIds = [];
  worldState.augmentChoices = [];
  worldState.selectedCardIndex = 1;
  worldState.nextEntityId = 1;

  spawnWaveEncounter(worldState, random, WAVE_SCHEDULE[0]);
}

export function advanceToNextWave(worldState, random) {
  worldState.wave = Math.min(WAVE_SCHEDULE.length, worldState.wave + 1);
  const spec = WAVE_SCHEDULE[worldState.wave - 1];
  spawnWaveEncounter(worldState, random, spec);
}

export function checkVictoryOrDefeat(worldState) {
  if (worldState.player.hp <= 0) {
    worldState.victory = false;
    worldState.defeatReason = 'SPRINTER RIG DESTROYED IN COMBAT';
    return EVENT_RUN_DEFEAT;
  }
  if (worldState.core.hp <= 0) {
    worldState.victory = false;
    worldState.defeatReason = 'AEGIS BASTION CORE COLLAPSED';
    return EVENT_RUN_DEFEAT;
  }
  return 0;
}

export function evaluateWaveProgression(worldState, random, audio, dt) {
  const waveSpec = WAVE_SCHEDULE[worldState.wave - 1] || WAVE_SCHEDULE[0];

  if (worldState.spawnQueue.length > 0) {
    worldState.spawnTimer -= dt;
    if (worldState.spawnTimer <= 0) {
      const nextKind = worldState.spawnQueue.shift();
      spawnEnemyFromEdge(worldState, random, nextKind);
      worldState.spawnTimer = waveSpec.spawnInterval;
    }
    return 0;
  }

  if (worldState.enemies.length === 0) {
    if (worldState.wave >= WAVE_SCHEDULE.length) {
      worldState.victory = true;
      worldState.defeatReason = 'CHRONO WARDEN DEFEATED — AEGIS CORE SECURED!';
      worldState.score += 3500;
      if (audio) audio.playWaveClearFanfare();
      return EVENT_RUN_VICTORY;
    }
    worldState.augmentChoices = rollTacticalAugmentChoices(random, worldState.acquiredAugmentIds);
    worldState.selectedCardIndex = 1;
    if (audio) audio.playWaveClearFanfare();
    return EVENT_WAVE_CLEARED;
  }

  return 0;
}

export function stepBastionSimulation(worldState, random, audio, dt, controlInput, harmlessDemo = false) {
  stepVisualEffects(worldState.effects, random, dt);
  if (worldState.effects.hitStopTimer > 0 && !harmlessDemo) {
    return 0;
  }

  worldState.elapsed += dt;
  if (worldState.waveBannerTimer > 0) {
    worldState.waveBannerTimer = Math.max(0, worldState.waveBannerTimer - dt);
  }

  const player = worldState.player;
  const core = worldState.core;
  core.pulseAngle += dt * 1.6;
  if (core.hitFlash > 0) core.hitFlash = Math.max(0, core.hitFlash - dt);

  if (controlInput) {
    player.aimX = controlInput.aimX;
    player.aimY = controlInput.aimY;
    player.angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);

    if (controlInput.dashRequested) {
      triggerPhaseDashParry(worldState, random, audio, controlInput.moveX, controlInput.moveY);
    }
    if (controlInput.overdriveRequested) {
      triggerOverdriveNova(worldState, random, audio);
    }
  }

  if (player.fireCooldown > 0) player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  if (player.parryTimer > 0) {
    player.parryTimer = Math.max(0, player.parryTimer - dt);
    executeParrySweep(worldState, random, audio);
  }
  if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

  if (player.comboTimer > 0) {
    player.comboTimer -= dt;
    if (player.comboTimer <= 0) {
      player.combo = Math.max(1.0, +(player.combo - 0.35).toFixed(2));
      if (player.combo > 1.0) player.comboTimer = 1.2;
    }
  }

  // Passive shield regeneration
  player.shield = Math.min(player.maxShield, player.shield + ARENA_CONFIG.coreShieldRegen * dt);

  // Movement / Phase-Dash physics
  player.moving = Boolean(
    player.dashTimer > 0 || (controlInput && (controlInput.moveX !== 0 || controlInput.moveY !== 0)),
  );
  if (player.dashTimer > 0) {
    player.dashTimer = Math.max(0, player.dashTimer - dt);
    player.x += player.dashDirX * PLAYER_STATS.dashSpeed * dt;
    player.y += player.dashDirY * PLAYER_STATS.dashSpeed * dt;
    player.afterimageTick -= dt;
    if (player.afterimageTick <= 0) {
      player.afterimageTick = 0.04;
      spawnDashAfterimage(worldState.effects, player.x, player.y, player.angle, player.radius, '#67e8f9');
    }
  } else if (controlInput) {
    const moveSpeed = PLAYER_STATS.baseSpeed * player.speedMult;
    player.x += controlInput.moveX * moveSpeed * dt;
    player.y += controlInput.moveY * moveSpeed * dt;
  }

  // Keep player inside playable arena bounds
  const minY = ARENA_CONFIG.hudTopHeight + player.radius + 10;
  const maxY = ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight - player.radius - 10;
  player.x = Math.max(ARENA_CONFIG.margin, Math.min(ARENA_CONFIG.width - ARENA_CONFIG.margin, player.x));
  player.y = Math.max(minY, Math.min(maxY, player.y));

  if (controlInput && controlInput.firing) {
    fireEquippedWeapon(worldState, random, audio);
  }

  stepEnemyAIAndTelegraphs(worldState, random, dt);
  stepProjectilesAndBeams(worldState, random, audio, dt);

  // Enemy melee contact vs player
  if (!harmlessDemo) {
    for (let i = 0; i < worldState.enemies.length; i += 1) {
      const enemy = worldState.enemies[i];
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist <= enemy.radius + player.radius) {
        if (player.parryTimer > 0) {
          executeParrySweep(worldState, random, audio);
        } else {
          applyDamageToPlayer(worldState, random, enemy.damage * 0.65);
        }
      }
    }
  } else {
    player.hp = player.maxHp;
    core.hp = core.maxHp;
  }

  if (harmlessDemo) return 0;

  const outcome = checkVictoryOrDefeat(worldState);
  if (outcome !== 0) return outcome;

  return evaluateWaveProgression(worldState, random, audio, dt);
}

export function createBastionWorld(random) {
  const state = {};
  resetCampaignRun(state, random);
  return {
    state,
    reset: () => resetCampaignRun(state, random),
    nextWave: () => advanceToNextWave(state, random),
    step: (dt, controlInput, harmlessDemo = false) =>
      stepBastionSimulation(state, random, null, dt, controlInput, harmlessDemo),
  };
}
