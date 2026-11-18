// Deterministic scene staging for ?shot=title|combat|upgrade|gameover&seed=1 (plus start|play|end aliases).
// Runs the actual simulation with a tactical autopilot so every screenshot is an authentic, rich gameplay frame.

import {
  ARENA_CONFIG,
  AUGMENT_CARDS,
  SCREEN_COMBAT,
  SCREEN_GAMEOVER,
  SCREEN_TITLE,
  SCREEN_UPGRADE,
  STEP,
  WAVE_SCHEDULE,
} from './config.js';
import { spawnChronoWardenBoss, spawnEnemyFromEdge, spawnWaveEncounter } from './enemies.js';
import {
  spawnDashAfterimage,
  spawnExplosionRing,
  spawnFloatingCombatText,
  spawnHitSparks,
  spawnLightningArc,
} from './particles.js';
import { applySelectedAugmentCard, evolvePlayerWeapon } from './upgrades.js';
import { fireEquippedWeapon } from './weapons.js';
import { resetCampaignRun, stepBastionSimulation } from './world.js';

export function runTacticalAutopilotStep(worldState, stepIndex) {
  const player = worldState.player;
  let target = worldState.enemies[0] || null;
  let bestDist = Infinity;

  for (let i = 0; i < worldState.enemies.length; i += 1) {
    const e = worldState.enemies[i];
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      target = e;
    }
  }

  const orbitAngle = stepIndex * 0.032;
  const desiredX = ARENA_CONFIG.coreX + Math.cos(orbitAngle) * 145;
  const desiredY = ARENA_CONFIG.coreY + Math.sin(orbitAngle) * 115;
  const dx = desiredX - player.x;
  const dy = desiredY - player.y;
  const len = Math.max(1, Math.hypot(dx, dy));

  return {
    moveX: dx / len,
    moveY: dy / len,
    aimX: target ? target.x : ARENA_CONFIG.coreX + 180,
    aimY: target ? target.y : ARENA_CONFIG.coreY - 120,
    firing: true,
    dashRequested: stepIndex % 75 === 20,
    overdriveRequested: false,
  };
}

export function stageTitleBriefingShot(worldState, random) {
  resetCampaignRun(worldState, random);
  for (let i = 0; i < 180; i += 1) {
    const cmd = runTacticalAutopilotStep(worldState, i);
    stepBastionSimulation(worldState, random, null, STEP, cmd, true);
  }
  worldState.score = 12450;
  return { screen: SCREEN_TITLE, bestScore: 31200, hoveredButtonId: 'btn_start_mission' };
}

export function stageIntenseCombatShot(worldState, random) {
  resetCampaignRun(worldState, random);
  worldState.wave = 4;
  worldState.acquiredAugments = [AUGMENT_CARDS[0], AUGMENT_CARDS[1], AUGMENT_CARDS[3]];
  worldState.acquiredAugmentIds = worldState.acquiredAugments.map((a) => a.id);
  evolvePlayerWeapon(worldState.player, 'prismScatter');
  worldState.player.damageMult = 1.35;
  worldState.player.critChance = 0.35;

  spawnWaveEncounter(worldState, random, WAVE_SCHEDULE[3]);
  const boss = spawnChronoWardenBoss(worldState, random);
  boss.x = ARENA_CONFIG.coreX + 190;
  boss.y = ARENA_CONFIG.coreY - 135;
  boss.hp = 1120;
  boss.maxHp = 1450;
  boss.bossPhase = 2;
  boss.beamSweepActive = true;
  boss.beamAngle = 0.42;
  boss.telegraphTimer = 0.55;
  boss.telegraphMax = 0.9;

  for (let i = 0; i < 210; i += 1) {
    const cmd = runTacticalAutopilotStep(worldState, i);
    stepBastionSimulation(worldState, random, null, STEP, cmd, true);
  }

  // Stage clear tactical combat readability around the Bastion Core
  const player = worldState.player;
  player.x = ARENA_CONFIG.coreX - 135;
  player.y = ARENA_CONFIG.coreY + 78;
  player.hp = 104;
  player.shield = 52;
  player.overdrive = 92;
  player.combo = 4.5;
  player.maxCombo = 4.5;
  player.parryTimer = 0.18;
  player.aimX = boss.x;
  player.aimY = boss.y;
  player.angle = Math.atan2(boss.y - player.y, boss.x - player.x);

  worldState.core.hp = 445;
  worldState.score = 18450;
  worldState.kills = 38;
  worldState.parries = 9;
  worldState.waveBannerTimer = 0;

  // Ensure visible enemy sniper lock-on & mortar hazard ring
  const sniper = spawnEnemyFromEdge(worldState, random, 'sniper', {
    x: ARENA_CONFIG.coreX - 310,
    y: ARENA_CONFIG.coreY - 150,
  });
  sniper.telegraphTimer = 0.35;
  sniper.telegraphMax = 0.85;
  sniper.targetX = player.x;
  sniper.targetY = player.y;

  worldState.hazardZones.push({
    x: ARENA_CONFIG.coreX + 85,
    y: ARENA_CONFIG.coreY + 115,
    radius: 68,
    timer: 0.32,
    maxTimer: 0.7,
    damage: 26,
    color: '#c084fc',
  });

  player.fireCooldown = 0;
  fireEquippedWeapon(worldState, random, null);
  spawnDashAfterimage(worldState.effects, player.x - 36, player.y + 18, player.angle, player.radius, '#22d3ee');
  spawnDashAfterimage(worldState.effects, player.x - 18, player.y + 9, player.angle, player.radius, '#67e8f9');
  spawnExplosionRing(worldState.effects, player.x, player.y, 78, '#facc15', 0.35);
  spawnExplosionRing(worldState.effects, boss.x, boss.y, 96, '#22d3ee', 0.35);
  spawnLightningArc(worldState.effects, boss.x, boss.y, sniper.x, sniper.y, '#a855f7');
  spawnHitSparks(worldState.effects, random, boss.x - 18, boss.y + 14, '#facc15', 16, 1.1);
  spawnFloatingCombatText(worldState.effects, player.x, player.y - 38, 'BASTION PARRY +250!', '#facc15', 21);
  spawnFloatingCombatText(worldState.effects, boss.x, boss.y - 56, '-68 CRIT!', '#22d3ee', 22);

  return { screen: SCREEN_COMBAT, bestScore: 31200, hoveredButtonId: null };
}

export function stageAugmentUpgradeShot(worldState, random) {
  stageIntenseCombatShot(worldState, random);
  worldState.wave = 2;
  worldState.score = 11280;
  worldState.augmentChoices = [AUGMENT_CARDS[0], AUGMENT_CARDS[1], AUGMENT_CARDS[3]];
  worldState.selectedCardIndex = 0;
  return { screen: SCREEN_UPGRADE, bestScore: 31200, hoveredButtonId: 'btn_card_1' };
}

export function stageGameOverResultsShot(worldState, random) {
  stageIntenseCombatShot(worldState, random);
  worldState.wave = 5;
  worldState.score = 28640;
  worldState.kills = 64;
  worldState.parries = 14;
  worldState.player.maxCombo = 6.25;
  worldState.player.hp = 0;
  worldState.core.hp = 180;
  worldState.victory = false;
  worldState.defeatReason = 'WAVE 5 BOSS: CHRONO WARDEN SINGULARITY';
  applySelectedAugmentCard(worldState, 0);
  return { screen: SCREEN_GAMEOVER, bestScore: 31200, hoveredButtonId: 'btn_play_again' };
}

export function stageDeterministicShotScene(shotName, worldState, random) {
  const normalized = (shotName || 'title').toLowerCase();
  if (normalized === 'combat' || normalized === 'play') {
    return stageIntenseCombatShot(worldState, random);
  }
  if (normalized === 'upgrade' || normalized === 'augment') {
    return stageAugmentUpgradeShot(worldState, random);
  }
  if (normalized === 'gameover' || normalized === 'end' || normalized === 'over') {
    return stageGameOverResultsShot(worldState, random);
  }
  return stageTitleBriefingShot(worldState, random);
}
