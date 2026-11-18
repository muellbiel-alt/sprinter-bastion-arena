// Dual Keyboard + Mouse input controller with logical 1280x800 reticle mapping and UI hit-testing.
// Supports WASD/Arrows, Space/Shift/RightClick Dash-Parry, E/Q Overdrive, 1/2/3 Cards, P Pause, R Restart, M Mute.

import { ARENA_CONFIG } from './config.js';

export const CMD_START_OR_CONFIRM = 1 << 0;
export const CMD_DASH_PARRY = 1 << 1;
export const CMD_OVERDRIVE_NOVA = 1 << 2;
export const CMD_PAUSE_TOGGLE = 1 << 3;
export const CMD_RESTART_RUN = 1 << 4;
export const CMD_MUTE_TOGGLE = 1 << 5;
export const CMD_CARD_1 = 1 << 6;
export const CMD_CARD_2 = 1 << 7;
export const CMD_CARD_3 = 1 << 8;

export function hitTestMenuButtons(buttons, x, y) {
  for (let i = 0; i < buttons.length; i += 1) {
    const b = buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      return b;
    }
  }
  return null;
}

export function bindKeyboardControls(state) {
  window.addEventListener('keydown', (event) => {
    const code = event.code;
    if (code === 'KeyW' || code === 'ArrowUp') state.up = true;
    else if (code === 'KeyS' || code === 'ArrowDown') state.down = true;
    else if (code === 'KeyA' || code === 'ArrowLeft') state.left = true;
    else if (code === 'KeyD' || code === 'ArrowRight') state.right = true;
    else if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') {
      if (!event.repeat) state.commands |= CMD_DASH_PARRY | CMD_START_OR_CONFIRM;
    } else if (code === 'Enter') {
      if (!event.repeat) state.commands |= CMD_START_OR_CONFIRM;
    } else if (code === 'KeyE' || code === 'KeyQ') {
      if (!event.repeat) state.commands |= CMD_OVERDRIVE_NOVA;
    } else if (code === 'KeyP' || code === 'Escape') {
      if (!event.repeat) state.commands |= CMD_PAUSE_TOGGLE;
    } else if (code === 'KeyR') {
      if (!event.repeat) state.commands |= CMD_RESTART_RUN;
    } else if (code === 'KeyM') {
      if (!event.repeat) state.commands |= CMD_MUTE_TOGGLE;
    } else if (code === 'Digit1' || code === 'Numpad1') {
      if (!event.repeat) state.commands |= CMD_CARD_1;
    } else if (code === 'Digit2' || code === 'Numpad2') {
      if (!event.repeat) state.commands |= CMD_CARD_2;
    } else if (code === 'Digit3' || code === 'Numpad3') {
      if (!event.repeat) state.commands |= CMD_CARD_3;
    } else {
      return;
    }
    event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    const code = event.code;
    if (code === 'KeyW' || code === 'ArrowUp') state.up = false;
    else if (code === 'KeyS' || code === 'ArrowDown') state.down = false;
    else if (code === 'KeyA' || code === 'ArrowLeft') state.left = false;
    else if (code === 'KeyD' || code === 'ArrowRight') state.right = false;
  });

  window.addEventListener('blur', () => {
    state.up = false;
    state.down = false;
    state.left = false;
    state.right = false;
    state.firing = false;
  });
}

export function bindPointerReticle(canvas, state, getViewportTransform, getInteractiveButtons) {
  function toArenaCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const canvasX = (clientX - rect.left) * ratio;
    const canvasY = (clientY - rect.top) * ratio;
    const view = getViewportTransform();
    const ax = (canvasX - view.x) / view.scale;
    const ay = (canvasY - view.y) / view.scale;
    return {
      x: Math.max(0, Math.min(ARENA_CONFIG.width, ax)),
      y: Math.max(0, Math.min(ARENA_CONFIG.height, ay)),
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const pt = toArenaCoords(event.clientX, event.clientY);
    state.aimX = pt.x;
    state.aimY = pt.y;
    const hovered = hitTestMenuButtons(getInteractiveButtons(), pt.x, pt.y);
    state.hoveredButtonId = hovered ? hovered.id : null;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const pt = toArenaCoords(event.clientX, event.clientY);
    state.aimX = pt.x;
    state.aimY = pt.y;

    const clickedButton = hitTestMenuButtons(getInteractiveButtons(), pt.x, pt.y);
    if (clickedButton) {
      state.commands |= clickedButton.command;
      event.preventDefault();
      return;
    }

    if (event.button === 2) {
      state.commands |= CMD_DASH_PARRY;
    } else if (event.button === 1) {
      state.commands |= CMD_OVERDRIVE_NOVA;
    } else {
      state.firing = true;
    }
    event.preventDefault();
  });

  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) state.firing = false;
  });

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
}

export function pollPlayerCommands(state) {
  let moveX = (state.right ? 1 : 0) - (state.left ? 1 : 0);
  let moveY = (state.down ? 1 : 0) - (state.up ? 1 : 0);
  if (moveX !== 0 && moveY !== 0) {
    const inv = 1 / Math.hypot(moveX, moveY);
    moveX *= inv;
    moveY *= inv;
  }
  const commands = state.commands;
  state.commands = 0;
  return {
    moveX,
    moveY,
    aimX: state.aimX,
    aimY: state.aimY,
    firing: state.firing,
    hoveredButtonId: state.hoveredButtonId,
    commands,
  };
}

export function createInputController(canvas, getViewportTransform, getInteractiveButtons) {
  const state = {
    up: false,
    down: false,
    left: false,
    right: false,
    firing: false,
    aimX: ARENA_CONFIG.coreX + 180,
    aimY: ARENA_CONFIG.coreY - 90,
    hoveredButtonId: null,
    commands: 0,
  };

  bindKeyboardControls(state);
  bindPointerReticle(canvas, state, getViewportTransform, getInteractiveButtons);

  return {
    state,
    poll: () => pollPlayerCommands(state),
  };
}
