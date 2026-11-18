// Sprinter Bastion: Overdrive Protocol — Entry point, state transitions, and deterministic ?shot= runner.

import { createSynthAudioEngine } from './audio.js';
import {
  BEST_STORAGE_KEY,
  SCREEN_COMBAT,
  SCREEN_GAMEOVER,
  SCREEN_PAUSED,
  SCREEN_TITLE,
  SCREEN_UPGRADE,
  STEP,
} from './config.js';
import {
  CMD_CARD_1,
  CMD_CARD_2,
  CMD_CARD_3,
  CMD_DASH_PARRY,
  CMD_MUTE_TOGGLE,
  CMD_OVERDRIVE_NOVA,
  CMD_PAUSE_TOGGLE,
  CMD_RESTART_RUN,
  CMD_START_OR_CONFIRM,
  createInputController,
} from './input.js';
import { createSeededRandom } from './random.js';
import { createBastionRenderer } from './render.js';
import { stageDeterministicShotScene } from './shots.js';
import { applySelectedAugmentCard } from './upgrades.js';
import {
  advanceToNextWave,
  createBastionWorld,
  EVENT_RUN_DEFEAT,
  EVENT_RUN_VICTORY,
  EVENT_WAVE_CLEARED,
  stepBastionSimulation,
} from './world.js';

const MAX_FRAME_DELTA = 0.25;
const DEFAULT_DETERMINISTIC_SEED = 20261118;

function readSavedBestScore() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_STORAGE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function writeSavedBestScore(score) {
  try {
    window.localStorage.setItem(BEST_STORAGE_KEY, String(score));
  } catch {
    // Ignore storage errors in private/sandboxed browsing
  }
}

export function runDeterministicScreenshotMode(shotName, seed, canvas, statusEl) {
  const random = createSeededRandom(seed);
  const world = createBastionWorld(random);
  const renderer = createBastionRenderer(canvas);
  const scene = stageDeterministicShotScene(shotName, world.state, random);

  if (statusEl) {
    statusEl.textContent = `Sprinter Bastion scene: ${scene.screen} (Score ${world.state.score})`;
  }

  let framesPainted = 0;
  function paintShotFrame() {
    renderer.draw(world.state, scene.screen, scene.bestScore, false, scene.hoveredButtonId);
    framesPainted += 1;
    if (framesPainted < 2) {
      requestAnimationFrame(paintShotFrame);
    } else {
      window.__shotReady = true;
    }
  }
  requestAnimationFrame(paintShotFrame);
}

export function handleScreenTransitions(
  commands,
  currentScreen,
  world,
  random,
  audio,
  bestScoreRef,
  announce,
) {
  let screen = currentScreen;

  if (commands & CMD_MUTE_TOGGLE) {
    const muted = audio.toggleAudioMute();
    announce(muted ? 'Audio muted.' : 'Audio enabled.');
  }

  if (commands & CMD_RESTART_RUN) {
    world.reset();
    screen = SCREEN_COMBAT;
    announce('Campaign restarted. Wave 1 active.');
    return screen;
  }

  if (screen === SCREEN_TITLE) {
    if (commands & CMD_START_OR_CONFIRM) {
      world.reset();
      screen = SCREEN_COMBAT;
      announce('Mission started. Defend the Aegis Bastion Core.');
    }
    return screen;
  }

  if (screen === SCREEN_GAMEOVER) {
    if (commands & (CMD_START_OR_CONFIRM | CMD_RESTART_RUN)) {
      world.reset();
      screen = SCREEN_COMBAT;
      announce('New campaign started.');
    }
    return screen;
  }

  if (screen === SCREEN_PAUSED) {
    if (commands & (CMD_PAUSE_TOGGLE | CMD_START_OR_CONFIRM)) {
      screen = SCREEN_COMBAT;
      announce('Mission resumed.');
    }
    return screen;
  }

  if (screen === SCREEN_UPGRADE) {
    let pickedIndex = -1;
    if (commands & CMD_CARD_1) pickedIndex = 0;
    else if (commands & CMD_CARD_2) pickedIndex = 1;
    else if (commands & CMD_CARD_3) pickedIndex = 2;
    else if (commands & CMD_START_OR_CONFIRM) pickedIndex = world.state.selectedCardIndex || 0;

    if (pickedIndex !== -1) {
      const card = applySelectedAugmentCard(world.state, pickedIndex);
      advanceToNextWave(world.state, random);
      screen = SCREEN_COMBAT;
      announce(`Equipped ${card ? card.title : 'Augment'}. Entering Wave ${world.state.wave}.`);
    }
    return screen;
  }

  if (screen === SCREEN_COMBAT && commands & CMD_PAUSE_TOGGLE) {
    screen = SCREEN_PAUSED;
    announce('Mission paused.');
  }

  return screen;
}

export function runInteractiveGameLoop(seed, canvas, statusEl) {
  const random = createSeededRandom(seed);
  const world = createBastionWorld(random);
  const renderer = createBastionRenderer(canvas);
  const audio = createSynthAudioEngine();
  const input = createInputController(
    canvas,
    renderer.getViewportTransform,
    renderer.getInteractiveButtons,
  );

  let screen = SCREEN_TITLE;
  const bestScoreRef = { value: Math.max(31200, readSavedBestScore()) };
  let accumulator = 0;
  let lastTimestamp = performance.now();

  function announce(message) {
    if (statusEl) statusEl.textContent = message;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_COMBAT) {
      screen = SCREEN_PAUSED;
      announce('Mission paused.');
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    const frameDelta = Math.min((now - lastTimestamp) / 1000, MAX_FRAME_DELTA);
    lastTimestamp = now;
    accumulator += frameDelta;

    const polled = input.poll();
    screen = handleScreenTransitions(
      polled.commands,
      screen,
      world,
      random,
      audio,
      bestScoreRef,
      announce,
    );

    const controlPacket = {
      moveX: polled.moveX,
      moveY: polled.moveY,
      aimX: polled.aimX,
      aimY: polled.aimY,
      firing: polled.firing,
      dashRequested: Boolean(polled.commands & CMD_DASH_PARRY),
      overdriveRequested: Boolean(polled.commands & CMD_OVERDRIVE_NOVA),
    };

    if (screen === SCREEN_TITLE || screen === SCREEN_COMBAT) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_COMBAT)) {
        if (screen === SCREEN_TITLE) {
          stepBastionSimulation(world.state, random, null, STEP, controlPacket, true);
        } else {
          const events = stepBastionSimulation(world.state, random, audio, STEP, controlPacket, false);
          const bossActive = world.state.enemies.some((e) => e.kind === 'boss');
          audio.stepProceduralSoundtrack(STEP, true, bossActive);

          if (events & EVENT_WAVE_CLEARED) {
            screen = SCREEN_UPGRADE;
            announce(`Wave ${world.state.wave} cleared! Choose an augment card.`);
          } else if (events & (EVENT_RUN_VICTORY | EVENT_RUN_DEFEAT)) {
            screen = SCREEN_GAMEOVER;
            if (world.state.score > bestScoreRef.value) {
              bestScoreRef.value = world.state.score;
              writeSavedBestScore(bestScoreRef.value);
            }
            announce(
              `${world.state.victory ? 'Victory!' : 'Game over.'} Final score ${world.state.score}.`,
            );
          }
        }
        controlPacket.dashRequested = false;
        controlPacket.overdriveRequested = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }

    renderer.draw(
      world.state,
      screen,
      bestScoreRef.value,
      audio.isMuted(),
      polled.hoveredButtonId,
    );
  }

  announce('Sprinter Bastion ready. Click Start Mission or press Space.');
  requestAnimationFrame(frame);
}

export function bootSprinterBastion() {
  const params = new URLSearchParams(window.location.search);
  const shotName = params.get('shot');
  const parsedSeed = Number.parseInt(params.get('seed') ?? '', 10);
  const seed = Number.isInteger(parsedSeed) && parsedSeed > 0 ? parsedSeed : DEFAULT_DETERMINISTIC_SEED;

  const canvas = document.getElementById('game');
  const statusEl = document.getElementById('status');

  if (shotName) {
    runDeterministicScreenshotMode(shotName, seed, canvas, statusEl);
  } else {
    runInteractiveGameLoop(seed, canvas, statusEl);
  }
}

bootSprinterBastion();
