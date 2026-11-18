// Deterministic scene staging for ?shot=title|combat|upgrade|gameover&seed=1 (plus start|play|end aliases).
// Stages each of the 4 wave themes with lively, high-readability combat compositions.

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
  worldState.wave = 1; // Sunlit Bastion Courtyard
  evolvePlayerWeapon(worldState.player, 'prismScatter');

  for (let i = 0; i < 90; i += 1) {
    const cmd = runTacticalAutopilotStep(worldState, i);
    stepBastionSimulation(worldState, random, null, STEP, cmd, true);
  }

  // Place a crisp, dramatic attract battle scene right in the sunlit courtyard center!
  worldState.enemies = [];
  worldState.playerProjectiles = [];
  worldState.enemyProjectiles = [];
  worldState.hazardZones = [];

  const player = worldState.player;
  player.x = 465;
  player.y = 435;
  player.moving = true;
  player.parryTimer = 0.2;
  player.aimX = 835;
  player.aimY = 390;
  player.angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
  player.overdrive = 100;

  const houndA = spawnEnemyFromEdge(worldState, random, 'swarmer', { x: 265, y: 370 });
  const houndB = spawnEnemyFromEdge(worldState, random, 'swarmer', { x: 855, y: 495 });
  const sniper = spawnEnemyFromEdge(worldState, random, 'sniper', { x: 965, y: 345 });
  const bruiser = spawnEnemyFromEdge(worldState, random, 'bruiser', { x: 820, y: 350 });
  const mortar = spawnEnemyFromEdge(worldState, random, 'mortar', { x: 285, y: 510 });

  houndA.angle = Math.atan2(player.y - houndA.y, player.x - houndA.x);
  houndB.angle = Math.atan2(worldState.core.y - houndB.y, worldState.core.x - houndB.x);
  sniper.angle = Math.atan2(player.y - sniper.y, player.x - sniper.x);
  sniper.telegraphTimer = 0.35;
  sniper.telegraphMax = 0.85;
  sniper.targetX = player.x;
  sniper.targetY = player.y;
  bruiser.angle = Math.atan2(player.y - bruiser.y, player.x - bruiser.x);
  mortar.angle = Math.atan2(worldState.core.y - mortar.y, worldState.core.x - mortar.x);

  player.fireCooldown = 0;
  fireEquippedWeapon(worldState, random, null);
  for (let i = 0; i < 4; i += 1) {
    stepBastionSimulation(worldState, random, null, STEP, null, true);
  }
  player.fireCooldown = 0;
  fireEquippedWeapon(worldState, random, null);

  worldState.enemyProjectiles.push(
    { x: 560, y: 410, vx: -280, vy: 20, radius: 7, damage: 18, color: '#fb923c', parryable: true },
    { x: 750, y: 455, vx: -240, vy: -35, radius: 7, damage: 18, color: '#fb923c', parryable: true },
  );

  spawnDashAfterimage(worldState.effects, player.x - 42, player.y + 14, player.angle, player.radius, '#38bdf8');
  spawnDashAfterimage(worldState.effects, player.x - 22, player.y + 7, player.angle, player.radius, '#67e8f9');
  spawnExplosionRing(worldState.effects, player.x, player.y - 10, 76, '#facc15', 0.35);
  spawnHitSparks(worldState.effects, random, bruiser.x - 16, bruiser.y - 18, '#fb923c', 14, 1.1);
  spawnFloatingCombatText(worldState.effects, player.x, player.y - 54, 'PARRY!', '#fde047', 21);

  worldState.score = 12450;
  return { screen: SCREEN_TITLE, bestScore: 31200, hoveredButtonId: 'btn_start_mission' };
}

export function stageIntenseCombatShot(worldState, random) {
  resetCampaignRun(worldState, random);
  worldState.wave = 3; // Crimson Citadel Roof
  worldState.acquiredAugments = [AUGMENT_CARDS[0], AUGMENT_CARDS[1]];
  worldState.acquiredAugmentIds = worldState.acquiredAugments.map((a) => a.id);
  evolvePlayerWeapon(worldState.player, 'prismScatter');
  worldState.player.damageMult = 1.35;
  worldState.player.critChance = 0.35;

  spawnWaveEncounter(worldState, random, WAVE_SCHEDULE[2]);
  worldState.enemies = [];
  worldState.playerProjectiles = [];
  worldState.enemyProjectiles = [];
  worldState.hazardZones = [];

  const player = worldState.player;
  player.x = 455;
  player.y = 472;
  player.moving = true;
  player.hp = 104;
  player.shield = 52;
  player.overdrive = 92;
  player.combo = 4.0;
  player.maxCombo = 4.5;
  player.parryTimer = 0.2;
  player.aimX = 835;
  player.aimY = 395;
  player.angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);

  worldState.core.hp = 445;
  worldState.score = 18450;
  worldState.kills = 38;
  worldState.parries = 9;
  worldState.waveBannerTimer = 0;

  // 7 diverse enemies in a clean, readable tactical formation
  const bruiser = spawnEnemyFromEdge(worldState, random, 'bruiser', { x: 835, y: 395 });
  bruiser.hp = 110;
  const sniperA = spawnEnemyFromEdge(worldState, random, 'sniper', { x: 1020, y: 265 });
  sniperA.telegraphTimer = 0.32;
  sniperA.telegraphMax = 0.85;
  sniperA.targetX = player.x;
  sniperA.targetY = player.y;
  const sniperB = spawnEnemyFromEdge(worldState, random, 'sniper', { x: 255, y: 270 });
  sniperB.hp = 44;
  const mortar = spawnEnemyFromEdge(worldState, random, 'mortar', { x: 965, y: 555 });
  mortar.hp = 68;
  const hound1 = spawnEnemyFromEdge(worldState, random, 'swarmer', { x: 290, y: 555 });
  const hound2 = spawnEnemyFromEdge(worldState, random, 'swarmer', { x: 750, y: 255 });
  const hound3 = spawnEnemyFromEdge(worldState, random, 'swarmer', { x: 780, y: 585 });

  for (const e of [bruiser, sniperA, sniperB, mortar, hound1, hound2, hound3]) {
    e.angle = Math.atan2(player.y - e.y, player.x - e.x);
  }
  bruiser.hitFlash = 0.08;

  worldState.hazardZones.push({
    x: 695,
    y: 545,
    radius: 66,
    timer: 0.3,
    maxTimer: 0.7,
    damage: 26,
    color: '#c084fc',
  });

  worldState.enemyProjectiles.push(
    { x: 560, y: 425, vx: -310, vy: 45, radius: 7, damage: 20, color: '#fb923c', parryable: true },
    { x: 355, y: 345, vx: 210, vy: 150, radius: 7, damage: 18, color: '#fb923c', parryable: true },
    { x: 740, y: 350, vx: -260, vy: 85, radius: 7, damage: 18, color: '#fb923c', parryable: true },
  );

  player.fireCooldown = 0;
  fireEquippedWeapon(worldState, random, null);
  for (let i = 0; i < 6; i += 1) {
    stepBastionSimulation(worldState, random, null, STEP, null, true);
  }
  player.fireCooldown = 0;
  fireEquippedWeapon(worldState, random, null);

  spawnDashAfterimage(worldState.effects, player.x - 42, player.y + 18, player.angle, player.radius, '#38bdf8');
  spawnDashAfterimage(worldState.effects, player.x - 20, player.y + 9, player.angle, player.radius, '#67e8f9');
  spawnExplosionRing(worldState.effects, player.x, player.y - 12, 82, '#facc15', 0.35);
  spawnExplosionRing(worldState.effects, bruiser.x, bruiser.y - 16, 92, '#38bdf8', 0.35);
  spawnLightningArc(worldState.effects, bruiser.x, bruiser.y, hound2.x, hound2.y, '#c084fc');
  spawnHitSparks(worldState.effects, random, bruiser.x - 14, bruiser.y - 16, '#fde047', 18, 1.15);
  spawnHitSparks(worldState.effects, random, sniperB.x + 12, sniperB.y - 12, '#38bdf8', 10, 0.9);
  spawnFloatingCombatText(worldState.effects, player.x, player.y - 58, 'PARRY +250!', '#fde047', 22);
  spawnFloatingCombatText(worldState.effects, bruiser.x, bruiser.y - 68, '-68 CRIT!', '#38bdf8', 22);

  return { screen: SCREEN_COMBAT, bestScore: 31200, hoveredButtonId: null };
}

export function stageAugmentUpgradeShot(worldState, random) {
  stageIntenseCombatShot(worldState, random);
  worldState.wave = 2; // Amber Clockwork Foundry visible beneath cards
  worldState.score = 11280;
  worldState.augmentChoices = [AUGMENT_CARDS[0], AUGMENT_CARDS[1], AUGMENT_CARDS[3]];
  worldState.selectedCardIndex = 0;
  return { screen: SCREEN_UPGRADE, bestScore: 31200, hoveredButtonId: 'btn_card_1' };
}

export function stageGameOverResultsShot(worldState, random) {
  resetCampaignRun(worldState, random);
  worldState.wave = 4; // Solar Eclipse Sanctum
  worldState.totalWaves = 5;
  const boss = spawnChronoWardenBoss(worldState, random);
  boss.x = 640;
  boss.y = 290;
  boss.bossPhase = 3;
  worldState.wave = 5;
  worldState.score = 28640;
  worldState.kills = 64;
  worldState.parries = 14;
  worldState.player.maxCombo = 6.2;
  worldState.player.hp = 0;
  worldState.core.hp = 180;
  worldState.victory = false;
  worldState.defeatReason = 'CHRONO WARDEN ENCOUNTER';
  worldState.augmentChoices = [AUGMENT_CARDS[0], AUGMENT_CARDS[1], AUGMENT_CARDS[3]];
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
