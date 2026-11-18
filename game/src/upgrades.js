// Roguelite tactical augment deck, weapon evolution switching, and stat modifier aggregation.

import { AUGMENT_CARDS, WEAPON_EVOLUTIONS } from './config.js';
import { deterministicShuffle } from './random.js';

export function computePlayerCombatModifiers(player) {
  return {
    damageMult: player.damageMult,
    fireRateMult: player.fireRateMult,
    speedMult: player.speedMult,
    dashCooldownMult: player.dashCooldownMult,
    critChance: player.critChance,
    parryDamageBonus: player.parryDamageBonus,
    overdriveGainMult: player.overdriveGainMult,
    novaDamageMult: player.novaDamageMult,
    comboGainMult: player.comboGainMult,
  };
}

export function evolvePlayerWeapon(player, weaponId) {
  if (WEAPON_EVOLUTIONS[weaponId]) {
    player.weaponId = weaponId;
    player.weapon = WEAPON_EVOLUTIONS[weaponId];
  }
}

export function rollTacticalAugmentChoices(random, acquiredIds = []) {
  const unpicked = AUGMENT_CARDS.filter((card) => !acquiredIds.includes(card.id));
  const pool = unpicked.length >= 3 ? unpicked : AUGMENT_CARDS;
  const shuffled = deterministicShuffle(random, pool);
  return shuffled.slice(0, 3);
}

export function applySelectedAugmentCard(worldState, cardIndex) {
  const choices = worldState.augmentChoices;
  if (!choices || choices.length === 0) return null;
  const chosen = choices[Math.max(0, Math.min(choices.length - 1, cardIndex))];
  if (!chosen) return null;

  const player = worldState.player;
  const core = worldState.core;

  worldState.acquiredAugments.push(chosen);
  worldState.acquiredAugmentIds.push(chosen.id);

  if (chosen.weaponEvolution) {
    evolvePlayerWeapon(player, chosen.weaponEvolution);
  }
  if (chosen.damageMult) player.damageMult *= chosen.damageMult;
  if (chosen.fireRateMult) player.fireRateMult *= chosen.fireRateMult;
  if (chosen.speedMult) player.speedMult *= chosen.speedMult;
  if (chosen.dashCooldownMult) player.dashCooldownMult *= chosen.dashCooldownMult;
  if (chosen.critBonus) player.critChance = Math.min(0.75, player.critChance + chosen.critBonus);
  if (chosen.parryDamageBonus) player.parryDamageBonus += chosen.parryDamageBonus;
  if (chosen.overdriveGainMult) player.overdriveGainMult *= chosen.overdriveGainMult;
  if (chosen.novaDamageMult) player.novaDamageMult *= chosen.novaDamageMult;
  if (chosen.comboGainMult) player.comboGainMult *= chosen.comboGainMult;

  if (chosen.maxShieldBonus) {
    player.maxShield += chosen.maxShieldBonus;
    player.shield = Math.min(player.maxShield, player.shield + chosen.maxShieldBonus);
  }
  if (chosen.healPlayer) {
    player.hp = Math.min(player.maxHp, player.hp + chosen.healPlayer);
  }
  if (chosen.healCore) {
    core.hp = Math.min(core.maxHp, core.hp + chosen.healCore);
  }

  return chosen;
}
