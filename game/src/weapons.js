// Player weapon firing, projectile physics, chain-lightning arcs, Phase-Dash Parry, and Overdrive Nova.

import { ARENA_CONFIG, PLAYER_STATS } from './config.js';
import { damageEnemyUnit } from './enemies.js';
import {
  spawnDashAfterimage,
  spawnExplosionRing,
  spawnFloatingCombatText,
  spawnHitSparks,
  spawnLightningArc,
  triggerScreenShake,
} from './particles.js';

export function spawnProjectileBolt(worldState, x, y, angle, weapon, damage, isCrit) {
  worldState.playerProjectiles.push({
    x,
    y,
    vx: Math.cos(angle) * weapon.projectileSpeed,
    vy: Math.sin(angle) * weapon.projectileSpeed,
    radius: isCrit ? 6.5 : 5,
    damage,
    isCrit,
    pierceLeft: weapon.pierce,
    chainTargets: weapon.chainTargets,
    color: isCrit ? '#facc15' : weapon.color,
    hitIds: new Set(),
    life: 1.35,
  });
}

export function fireEquippedWeapon(worldState, random, audio) {
  const player = worldState.player;
  const weapon = player.weapon;
  if (player.fireCooldown > 0) return false;

  const baseAngle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
  const count = weapon.projectilesPerShot;
  const spread = weapon.spreadAngle;
  const isCrit = random() < player.critChance;
  const damage = weapon.damage * player.damageMult * (isCrit ? 1.55 : 1.0);

  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
    const muzzleX = player.x + Math.cos(baseAngle + offset) * (player.radius + 8);
    const muzzleY = player.y + Math.sin(baseAngle + offset) * (player.radius + 8);
    spawnProjectileBolt(worldState, muzzleX, muzzleY, baseAngle + offset, weapon, damage, isCrit);
  }

  player.fireCooldown = weapon.fireInterval / player.fireRateMult;
  if (audio) audio.playWeaponFireSound(weapon.id);
  return true;
}

export function triggerPhaseDashParry(worldState, random, audio, moveX, moveY) {
  const player = worldState.player;
  if (player.dashCooldown > 0 || player.dashTimer > 0) return false;

  let dirX = moveX;
  let dirY = moveY;
  if (dirX === 0 && dirY === 0) {
    const aimAngle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
    dirX = Math.cos(aimAngle);
    dirY = Math.sin(aimAngle);
  }

  player.dashDirX = dirX;
  player.dashDirY = dirY;
  player.dashTimer = PLAYER_STATS.dashDuration;
  player.parryTimer = PLAYER_STATS.parryWindow;
  player.dashCooldown = PLAYER_STATS.dashCooldown * player.dashCooldownMult;
  player.invulnerable = Math.max(player.invulnerable, PLAYER_STATS.parryWindow + 0.08);

  spawnDashAfterimage(worldState.effects, player.x, player.y, player.angle, player.radius, '#22d3ee');
  spawnExplosionRing(worldState.effects, player.x, player.y, 64, '#22d3ee', 0.25);

  // Check immediate parry of nearby enemy projectiles or active telegraphs
  executeParrySweep(worldState, random, audio);
  return true;
}

export function executeParrySweep(worldState, random, audio) {
  const player = worldState.player;
  const parryRadius = 86;
  let parriedAny = false;

  // Reflect enemy projectiles within parry radius
  for (let i = worldState.enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const orb = worldState.enemyProjectiles[i];
    const dist = Math.hypot(orb.x - player.x, orb.y - player.y);
    if (dist <= parryRadius) {
      worldState.enemyProjectiles.splice(i, 1);
      parriedAny = true;
      const reflectAngle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
      spawnProjectileBolt(
        worldState,
        orb.x,
        orb.y,
        reflectAngle,
        player.weapon,
        (45 + player.parryDamageBonus) * player.damageMult,
        true,
      );
    }
  }

  // Interrupt and counter-shock enemies with active telegraph near player
  for (let i = worldState.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = worldState.enemies[i];
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (enemy.telegraphTimer > 0 && dist <= parryRadius + enemy.radius + 35) {
      enemy.telegraphTimer = 0;
      enemy.stunTimer = 0.9;
      parriedAny = true;
      damageEnemyUnit(
        worldState,
        random,
        audio,
        enemy,
        (52 + player.parryDamageBonus) * player.damageMult,
        true,
        'PARRY',
      );
    }
  }

  if (parriedAny) {
    worldState.parries += 1;
    worldState.score += Math.round(250 * player.combo);
    player.combo = Math.min(9.9, +(player.combo + 0.5 * player.comboGainMult).toFixed(2));
    player.comboTimer = PLAYER_STATS.comboDecayTime;
    player.maxCombo = Math.max(player.maxCombo, player.combo);
    player.overdrive = Math.min(
      PLAYER_STATS.overdriveMax,
      player.overdrive + PLAYER_STATS.overdrivePerParry * player.overdriveGainMult,
    );
    player.shield = Math.min(player.maxShield, player.shield + 12);

    spawnExplosionRing(worldState.effects, player.x, player.y, 125, '#facc15', 0.35);
    spawnFloatingCombatText(worldState.effects, player.x, player.y - 34, 'BASTION PARRY +250!', '#facc15', 20);
    triggerScreenShake(worldState.effects, 9, 0.035);
    if (audio) audio.playParryReflectSound();
  }
}

export function triggerOverdriveNova(worldState, random, audio) {
  const player = worldState.player;
  if (player.overdrive < PLAYER_STATS.overdriveMax) return false;

  player.overdrive = 0;
  player.invulnerable = Math.max(player.invulnerable, 0.9);
  worldState.enemyProjectiles.length = 0;
  worldState.hazardZones.length = 0;

  spawnExplosionRing(worldState.effects, player.x, player.y, 380, '#22d3ee', 0.55);
  spawnExplosionRing(worldState.effects, ARENA_CONFIG.coreX, ARENA_CONFIG.coreY, 280, '#facc15', 0.5);
  spawnFloatingCombatText(worldState.effects, player.x, player.y - 42, 'OVERDRIVE NOVA UNLEASHED!', '#22d3ee', 22);
  triggerScreenShake(worldState.effects, 15, 0.055);
  if (audio) audio.playOverdriveNovaSound();

  const novaDamage = 115 * player.damageMult * player.novaDamageMult;
  for (let i = worldState.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = worldState.enemies[i];
    enemy.stunTimer = 1.25;
    enemy.telegraphTimer = 0;
    damageEnemyUnit(worldState, random, audio, enemy, novaDamage, true, 'NOVA');
  }

  worldState.core.hp = Math.min(worldState.core.maxHp, worldState.core.hp + 45);
  return true;
}

export function stepProjectilesAndBeams(worldState, random, audio, dt) {
  const player = worldState.player;
  const core = worldState.core;

  // Step player projectiles
  for (let i = worldState.playerProjectiles.length - 1; i >= 0; i -= 1) {
    const bolt = worldState.playerProjectiles[i];
    bolt.x += bolt.vx * dt;
    bolt.y += bolt.vy * dt;
    bolt.life -= dt;

    if (
      bolt.life <= 0 ||
      bolt.x < 0 ||
      bolt.x > ARENA_CONFIG.width ||
      bolt.y < ARENA_CONFIG.hudTopHeight ||
      bolt.y > ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight
    ) {
      worldState.playerProjectiles.splice(i, 1);
      continue;
    }

    let removed = false;
    for (let j = worldState.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = worldState.enemies[j];
      if (bolt.hitIds.has(enemy.id)) continue;
      const dist = Math.hypot(bolt.x - enemy.x, bolt.y - enemy.y);
      if (dist <= bolt.radius + enemy.radius) {
        bolt.hitIds.add(enemy.id);
        damageEnemyUnit(worldState, random, audio, enemy, bolt.damage, bolt.isCrit);

        // Chain lightning arcs if weapon supports it
        if (bolt.chainTargets > 0) {
          let chainsRemaining = bolt.chainTargets;
          for (let k = worldState.enemies.length - 1; k >= 0 && chainsRemaining > 0; k -= 1) {
            const other = worldState.enemies[k];
            if (other.id === enemy.id || bolt.hitIds.has(other.id)) continue;
            if (Math.hypot(other.x - enemy.x, other.y - enemy.y) <= 165) {
              chainsRemaining -= 1;
              spawnLightningArc(worldState.effects, enemy.x, enemy.y, other.x, other.y, '#a855f7');
              damageEnemyUnit(worldState, random, audio, other, bolt.damage * 0.62, false, 'ARC');
            }
          }
        }

        if (bolt.pierceLeft > 0) {
          bolt.pierceLeft -= 1;
        } else {
          worldState.playerProjectiles.splice(i, 1);
          removed = true;
          break;
        }
      }
    }
    if (removed) continue;
  }

  // Step enemy projectiles
  for (let i = worldState.enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const orb = worldState.enemyProjectiles[i];
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;

    if (
      orb.x < 0 ||
      orb.x > ARENA_CONFIG.width ||
      orb.y < ARENA_CONFIG.hudTopHeight ||
      orb.y > ARENA_CONFIG.height - ARENA_CONFIG.hudBottomHeight
    ) {
      worldState.enemyProjectiles.splice(i, 1);
      continue;
    }

    const distPlayer = Math.hypot(orb.x - player.x, orb.y - player.y);
    if (distPlayer <= orb.radius + player.radius) {
      if (player.parryTimer > 0) {
        executeParrySweep(worldState, random, audio);
      } else {
        worldState.enemyProjectiles.splice(i, 1);
        applyDamageToPlayer(worldState, random, orb.damage);
      }
      continue;
    }

    const distCore = Math.hypot(orb.x - core.x, orb.y - core.y);
    if (distCore <= orb.radius + core.radius) {
      worldState.enemyProjectiles.splice(i, 1);
      core.hp = Math.max(0, core.hp - orb.damage);
      core.hitFlash = 0.2;
      spawnHitSparks(worldState.effects, random, orb.x, orb.y, '#f43f5e', 6, 0.8);
    }
  }

  // Step mortar hazard zones
  for (let i = worldState.hazardZones.length - 1; i >= 0; i -= 1) {
    const hz = worldState.hazardZones[i];
    hz.timer -= dt;
    if (hz.timer <= 0) {
      spawnExplosionRing(worldState.effects, hz.x, hz.y, hz.radius, hz.color, 0.32);
      spawnHitSparks(worldState.effects, random, hz.x, hz.y, hz.color, 12, 1.1);
      const distP = Math.hypot(player.x - hz.x, player.y - hz.y);
      if (distP <= hz.radius + player.radius) {
        if (player.parryTimer > 0) {
          executeParrySweep(worldState, random, audio);
        } else {
          applyDamageToPlayer(worldState, random, hz.damage);
        }
      }
      const distC = Math.hypot(core.x - hz.x, core.y - hz.y);
      if (distC <= hz.radius + core.radius) {
        core.hp = Math.max(0, core.hp - hz.damage * 0.8);
        core.hitFlash = 0.22;
      }
      worldState.hazardZones.splice(i, 1);
    }
  }
}

export function applyDamageToPlayer(worldState, random, amount) {
  const player = worldState.player;
  if (player.invulnerable > 0) return;

  let remaining = amount;
  if (player.shield > 0) {
    const absorbed = Math.min(player.shield, remaining);
    player.shield -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0) {
    player.hp = Math.max(0, player.hp - remaining);
  }

  player.invulnerable = PLAYER_STATS.invulnerableAfterHit;
  player.combo = Math.max(1.0, +(player.combo * 0.65).toFixed(2));
  spawnHitSparks(worldState.effects, random, player.x, player.y, '#f43f5e', 12, 1.1);
  spawnFloatingCombatText(worldState.effects, player.x, player.y - 28, `-${Math.round(amount)} HULL`, '#f43f5e', 18);
  triggerScreenShake(worldState.effects, 10, 0.03);
}
