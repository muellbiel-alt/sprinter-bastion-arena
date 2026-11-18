# Sprinter Bastion: Overdrive Protocol

[![make.fun best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/muellbiel-alt/sprinter-bastion-arena/rank.svg)](https://make.fun/c/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/muellbiel-alt/sprinter-bastion-arena/reward.svg)](https://make.fun/c/best-game-01)

**Sprinter Bastion** is an original tactical roguelite arena action game built for the [make.fun `best-game-01` competition](https://make.fun/c/best-game-01).

## Core Gameplay & Features

- **Dual-Control Tactical Combat**: Responsive Keyboard (`WASD` / Arrow keys to move, `Space` / `Shift` to Phase-Dash & Parry projectiles, `E` / `Q` to unleash Overdrive Nova, `1` / `2` / `3` to pick augments, `P` to pause, `R` to restart, `M` to mute) + Full Mouse control (360° precision reticle aiming, Left-Click primary weapon fire, Right-Click Phase-Dash / Parry, and interactive clickable UI cards & buttons).
- **Risk-Reward Overdrive & Parry System**: Timing a Phase-Dash through enemy laser telegraphs or incoming plasma orbs triggers a **Bastion Parry**, reflecting damage back, extending the score multiplier combo, and rapidly charging the **Overdrive Core**.
- **Escalating Waves, Distinct Enemy Archetypes & Boss Fight**:
  - *Vanguard Swarmer*: Fast melee pursuer with lunge telegraph.
  - *Aegis Sniper*: Long-range railgun unit that locks on with a visible laser sight before firing high-velocity beams.
  - *Pulse Mortar*: Area-denial artillery launching lobbed plasma shells with ground impact hazard rings.
  - *Phalanx Bruiser*: Heavily armored shield unit that charges across the bastion floor.
  - *Chrono Warden (Boss)*: Multi-phase dreadnought core featuring radial bullet-hell patterns, rotating laser sweeps, and summon pylons.
- **Modular Weapon Evolutions & Tactical Augments**: Between waves, choose from 3 procedural augment cards (Twin Rail-Repeater, Prism Scatter-Cannon, Arc Chain-Lance, Phase Nova Capacitor, Reactive Nanite Plating, Chrono-Siphon Core) that visibly evolve your weapon behavior and tactical build.
- **100% Procedural Canvas 2D Visuals & Web Audio Synth**: Zero external assets or network requests. Features hit-stop micro-freezes, directional screen shake, dynamic lighting & bloom, particle trails, floating combat text, and a multi-track procedural Web Audio API synthesizer soundtrack + sound effects.

## Running Locally

```bash
node serve.ts
# Open http://localhost:8080 in desktop Chrome
```

## Building Submission Output

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
