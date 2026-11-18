// Character art: the Bastion Vanguard, five enemy hulls (clockwork hound, rail-sniper, mortar drone,
// phalanx bruiser, Chrono Warden) and the Aegis Core obelisk. Everything is vector-drawn in a 3/4
// view with a dark ink outline, a contact shadow on the floor and a facing flip, so each silhouette
// reads at a glance on the bright arenas. Animation comes from the simulation clock only.

import { TAU, glowDot, verticalGradient } from './draw-utils.js';

const INK = '#151a2c';
const WHITE = '#ffffff';
let flashing = false;

function tint(color) {
  return flashing ? WHITE : color;
}

function polygon(ctx, points, fill, lineWidth = 2.2) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function oval(ctx, x, y, rx, ry, fill, lineWidth = 2.2, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function contactShadow(ctx, x, y, rx, ry, alpha) {
  ctx.fillStyle = `rgba(24,12,30,${(alpha * 0.55).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 1.15, ry * 1.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `rgba(24,12,30,${alpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function gear(ctx, x, y, radius, teeth, rotation, fill) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  for (let k = 0; k < teeth; k += 1) {
    ctx.fillRect(-radius * 0.2, -radius * 1.32, radius * 0.4, radius * 0.42);
    ctx.strokeRect(-radius * 0.2, -radius * 1.32, radius * 0.4, radius * 0.42);
    ctx.rotate(TAU / teeth);
  }
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.38, 0, TAU);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}

/** The angle, in a body drawn facing +x and mirrored by `facing`, that points at a world angle. */
function localAim(worldAngle, facing) {
  return Math.atan2(Math.sin(worldAngle), facing * Math.cos(worldAngle));
}

export function drawBastionVanguard(ctx, player, time) {
  flashing = false;
  const facing = Math.cos(player.angle) >= 0 ? 1 : -1;
  const unit = player.radius / 18;
  const moving = player.moving === true;
  const swing = moving ? Math.sin(time * 16) : 0;
  const bob = moving ? Math.abs(Math.sin(time * 16)) * -2.2 : Math.sin(time * 3) * 0.8;
  const interval = player.weapon.fireInterval / player.fireRateMult;
  const sinceShot = interval - player.fireCooldown;
  const recoil = player.fireCooldown > 0 ? Math.max(0, 1 - sinceShot / 0.1) * 5 : 0;
  const muzzleFlash = player.fireCooldown > 0 && sinceShot < 0.06;
  const parrying = player.parryTimer > 0;

  contactShadow(ctx, player.x, player.y + player.radius * 0.95, player.radius * 1.35, player.radius * 0.5, 0.36);
  ctx.save();
  ctx.translate(player.x, player.y + player.radius * 0.6);
  ctx.scale(facing * unit, unit);
  ctx.translate(0, bob);

  if (player.dashTimer > 0) ctx.rotate(0.22);

  // Scarf, trailing behind the shoulders.
  const lag = moving || player.dashTimer > 0 ? 7 : 3;
  const scarf = [];
  for (let k = 0; k < 7; k += 1) {
    scarf.push([-4 - k * lag * 0.9, -40 + Math.sin(time * 7 + k * 0.9) * 3.2 * (k / 6) + k * 1.4]);
  }
  for (const [width, color] of [[9, INK], [6, '#ff6b35']]) {
    ctx.beginPath();
    ctx.moveTo(scarf[0][0], scarf[0][1]);
    for (let k = 1; k < scarf.length; k += 1) ctx.lineTo(scarf[k][0], scarf[k][1]);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // Far shoulder cannon.
  const novaReady = player.overdrive >= 100;
  polygon(ctx, [-15, -52, 9, -55, 10, -47, -14, -44], '#5a6b8c');
  polygon(ctx, [6, -55, 14, -54, 14, -48, 7, -47], novaReady ? '#ffd45a' : '#ff8c3a', 1.8);
  if (novaReady) glowDot(ctx, 14, -51, 18, '255,212,90', 0.7);

  // Boots.
  polygon(ctx, [-9 - swing * 3, -11, -1 - swing * 3, -11, 1 - swing * 3, 0, -11 - swing * 3, 0], '#26314d');
  polygon(ctx, [2 + swing * 3, -11, 10 + swing * 3, -11, 13 + swing * 3, 0, 1 + swing * 3, 0], '#33406a');

  // Tabard and breastplate.
  polygon(ctx, [-10, -26, 10, -26, 13, -8, -13, -8], '#c0392b');
  polygon(ctx, [-13, -11, 13, -11, 13, -8, -13, -8], '#f2c14e', 1.4);
  polygon(ctx, [-12, -44, 12, -44, 14, -27, 8, -22, -8, -22, -14, -27], tint('#cfdcf0'));
  polygon(ctx, [-12, -44, 12, -44, 13, -38, -13, -38], '#f2c14e', 1.4);
  oval(ctx, 0, -32, 4, 4, '#3fe3ff', 1.6);
  glowDot(ctx, 0, -32, 12, '63,227,255', 0.55);

  // Energy buckler on the near arm.
  const shieldGlow = parrying ? 1 : 0.55;
  polygon(ctx, [-18, -38, -9, -42, -3, -35, -3, -24, -9, -19, -18, -24], parrying ? '#ffd45a' : '#2bb8d8');
  glowDot(ctx, -10, -31, parrying ? 26 : 16, parrying ? '255,212,90' : '63,227,255', shieldGlow);

  // Helmet and crest.
  oval(ctx, 0, -54, 9.5, 9.5, tint('#e3ecf8'));
  polygon(ctx, [1, -57, 10, -56, 10, -51, 1, -51], '#1a2440', 1.6);
  polygon(ctx, [1.5, -55, 9, -54.6, 9, -53, 1.5, -53.4], '#3fe3ff', 0);
  polygon(ctx, [-3, -63, 4, -62, -6 - lag, -56, -11 - lag, -50 + Math.sin(time * 6) * 2], '#ff6b35', 1.8);

  // Weapon arm and carbine, aimed at the reticle.
  ctx.save();
  ctx.translate(6, -38);
  ctx.rotate(localAim(player.angle, facing));
  ctx.translate(-recoil, 0);
  oval(ctx, 0, 0, 5.5, 5.5, '#9db4d6', 2);
  polygon(ctx, [0, -4, 25, -4, 31, -2, 31, 3, 0, 5], '#3a4666');
  polygon(ctx, [4, -2, 24, -2, 24, 1, 4, 2], player.weapon.color, 0);
  if (player.weapon.projectilesPerShot > 1) polygon(ctx, [8, 4, 29, 4, 31, 7, 8, 8], '#3a4666', 1.6);
  oval(ctx, 11, 3, 3.6, 3.6, '#e3ecf8', 1.6);
  if (muzzleFlash) {
    glowDot(ctx, 34, 0, 20, '255,236,150', 0.9);
    polygon(ctx, [31, -1, 41, -6, 37, 0, 41, 6, 31, 2], '#fff4b8', 0);
  }
  ctx.restore();

  ctx.restore();

  if (parrying) {
    ctx.save();
    ctx.translate(player.x, player.y - 14);
    ctx.strokeStyle = 'rgba(255,212,90,0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let k = 0; k < 6; k += 1) {
      const angle = (k * TAU) / 6 + time * 4;
      const px = Math.cos(angle) * 34;
      const py = Math.sin(angle) * 34;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    glowDot(ctx, 0, 0, 44, '255,212,90', 0.35);
    ctx.restore();
  } else if (player.shield > 0) {
    ctx.save();
    ctx.translate(player.x, player.y - 14);
    ctx.strokeStyle = 'rgba(63,227,255,0.55)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 36, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawClockworkHound(ctx, enemy, time, facing, warn) {
  const unit = enemy.radius / 15;
  const stride = Math.sin(time * 18 + enemy.id) * 4;
  contactShadow(ctx, enemy.x, enemy.y + enemy.radius * 0.75, enemy.radius * 1.5, enemy.radius * 0.5, 0.34);
  ctx.save();
  ctx.translate(enemy.x, enemy.y + enemy.radius * 0.7);
  ctx.scale(facing * unit, unit);
  ctx.beginPath();
  ctx.moveTo(-16, -12);
  ctx.bezierCurveTo(-27, -20, -21, -31, -31, -26);
  ctx.lineCap = 'round';
  ctx.lineWidth = 4.8;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = tint('#e0a64b');
  ctx.stroke();
  for (const [x, swing] of [[-12, -stride], [-5, stride], [7, -stride], [14, stride]]) {
    polygon(ctx, [x - 2, -10, x + 3, -10, x + 3 + swing, 0, x - 3 + swing, 0], tint('#2c2431'), 1.8);
  }
  polygon(ctx, [-17, -12, -9, -20, 8, -21, 17, -14, 19, -6, 12, -4, -12, -4], tint('#4a3b35'));
  polygon(ctx, [-10, -19, 7, -20, 13, -14, -12, -13], tint('#c4833c'), 1.5);
  gear(ctx, -3, -22, 6, 8, time * 3 + enemy.id, tint('#e8b255'));
  polygon(ctx, [14, -18, 25, -16, 30, -9, 24, -4, 14, -6], tint('#3a2d2a'));
  polygon(ctx, [18, -6, 28, -6, 24, -2], '#f6e8c4', 1.2);
  polygon(ctx, [16, -19, 19, -27, 23, -18], tint('#c4833c'), 1.6);
  glowDot(ctx, 23, -12, 9 + warn * 8, '255,70,56', 0.6 + warn * 0.4);
  oval(ctx, 23, -12, 2.6, 2.6, warn > 0.5 ? '#fff3b0' : '#ff4338', 0);
  ctx.restore();
}

function drawRailSniper(ctx, enemy, time, facing, warn) {
  const unit = enemy.radius / 17;
  const aim = localAim(enemy.angle, facing);
  contactShadow(ctx, enemy.x, enemy.y + enemy.radius * 0.8, enemy.radius * 1.2, enemy.radius * 0.45, 0.34);
  ctx.save();
  ctx.translate(enemy.x, enemy.y + enemy.radius * 0.75);
  ctx.scale(facing * unit, unit);
  ctx.translate(0, Math.sin(time * 2.4 + enemy.id) * 0.8);
  polygon(ctx, [-10, -36, 10, -36, 17, 0, -17, 0], flashing ? WHITE : verticalGradient(ctx, -36, 0, '#4b4766', '#1f2033'));
  polygon(ctx, [-17, -5, 17, -5, 17, 0, -17, 0], tint('#ee8a2e'), 1.6);
  polygon(ctx, [-4, -36, 4, -36, 3, -6, -3, -6], tint('#ee8a2e'), 0);
  polygon(ctx, [-11, -37, -7, -53, 3, -60, 11, -49, 10, -37], tint('#2c2a42'));
  polygon(ctx, [0, -51, 9, -48, 9, -41, 0, -41], '#0b0c16', 1.4);
  glowDot(ctx, 5, -45, 10 + warn * 8, '255,150,40', 0.7 + warn * 0.3);
  oval(ctx, 5, -45, 2.6, 2.6, warn > 0.5 ? '#ffffff' : '#ffb35a', 0);
  polygon(ctx, [-15, -40, -4, -42, -3, -34, -16, -31], tint('#ee8a2e'), 1.6);
  ctx.save();
  ctx.translate(4, -31);
  ctx.rotate(aim);
  polygon(ctx, [-6, -3, 46, -3, 50, -1, 50, 2, -6, 4], tint('#5b5f7a'));
  polygon(ctx, [0, -1.5, 44, -1.5, 44, 0.5, 0, 1], '#ee8a2e', 0);
  oval(ctx, 20, -6, 3.6, 3, '#ffb35a', 1.4);
  if (warn > 0) glowDot(ctx, 50, 0, 18, '255,200,90', 0.5 + warn * 0.5);
  ctx.restore();
  ctx.restore();
}

function drawMortarDrone(ctx, enemy, time, facing, warn) {
  const unit = enemy.radius / 20;
  const aim = localAim(enemy.angle, facing);
  const hover = Math.sin(time * 3 + enemy.id) * 3;
  contactShadow(ctx, enemy.x, enemy.y + enemy.radius * 1.5, enemy.radius * 1.1 - hover * 0.2, enemy.radius * 0.4, 0.3);
  ctx.save();
  ctx.translate(enemy.x, enemy.y - 8 + hover);
  ctx.scale(facing * unit, unit);
  for (const side of [-1, 1]) {
    const blur = 3 + Math.abs(Math.sin(time * 30 + side)) * 3;
    oval(ctx, side * 22, -20, 14, blur, 'rgba(240,230,255,0.75)', 1.4);
    polygon(ctx, [side * 18 - 2, -20, side * 18 + 2, -20, side * 8 + 1, -8, side * 8 - 1, -8], tint('#6a5a7a'), 1.4);
  }
  for (const x of [-9, 0, 9]) polygon(ctx, [x - 1.5, 10, x + 1.5, 10, x + 3 * Math.sign(x), 22, x + 1 * Math.sign(x) - 1, 22], tint('#5a4a62'), 1.4);
  ctx.beginPath();
  ctx.arc(0, 2, 21, Math.PI, 0);
  ctx.quadraticCurveTo(14, 18, 0, 19);
  ctx.quadraticCurveTo(-14, 18, -21, 2);
  ctx.closePath();
  const dome = ctx.createRadialGradient(-7, -10, 2, 0, 2, 26);
  dome.addColorStop(0, '#f2cf84');
  dome.addColorStop(1, '#8a5b2a');
  ctx.fillStyle = flashing ? WHITE : dome;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  for (const x of [-12, -4, 4, 12]) oval(ctx, x, 3, 1.6, 1.6, '#5a3a1a', 0);
  polygon(ctx, [-17, 8, 17, 8, 14, 13, -14, 13], tint('#7a4f26'), 1.6);
  glowDot(ctx, 0, 11, 14 + warn * 8, '200,120,255', 0.8);
  polygon(ctx, [0, 6, 5, 11, 0, 16, -5, 11], warn > 0.5 ? '#ffffff' : '#c78bff', 1.4);
  ctx.save();
  ctx.translate(0, -12);
  ctx.rotate(aim);
  polygon(ctx, [0, -6, 26, -8, 26, 7, 0, 7], tint('#5a4a62'));
  polygon(ctx, [22, -10, 31, -10, 31, 9, 22, 9], tint('#d1a257'), 1.8);
  if (warn > 0) glowDot(ctx, 33, 0, 16, '210,130,255', 0.4 + warn * 0.5);
  ctx.restore();
  ctx.restore();
}

function drawPhalanxBruiser(ctx, enemy, time, facing, warn) {
  const unit = enemy.radius / 25;
  const stride = Math.sin(time * 9 + enemy.id) * 3;
  contactShadow(ctx, enemy.x, enemy.y + enemy.radius * 0.85, enemy.radius * 1.5, enemy.radius * 0.5, 0.36);
  ctx.save();
  ctx.translate(enemy.x, enemy.y + enemy.radius * 0.8);
  ctx.scale(facing * unit, unit);
  ctx.beginPath();
  ctx.moveTo(-14, -34);
  ctx.lineTo(-26, -70);
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#8a6a44';
  ctx.stroke();
  polygon(ctx, [-34, -78, -18, -82, -16, -64, -32, -60], tint('#5b5f7a'));
  polygon(ctx, [-12 - stride, -20, -2 - stride, -20, 0 - stride, 0, -14 - stride, 0], tint('#33384f'));
  polygon(ctx, [3 + stride, -20, 13 + stride, -20, 16 + stride, 0, 2 + stride, 0], tint('#3d4360'));
  polygon(ctx, [-18, -52, 18, -52, 23, -28, 14, -17, -14, -17, -23, -28], tint('#555b74'));
  polygon(ctx, [-6, -46, 6, -46, 9, -32, 0, -26, -9, -32], tint('#b0233b'), 1.8);
  oval(ctx, -19, -48, 11, 8, tint('#9b2237'));
  oval(ctx, 19, -48, 11, 8, tint('#9b2237'));
  polygon(ctx, [-10, -66, 10, -66, 12, -52, -12, -52], tint('#757b95'));
  polygon(ctx, [-12, -66, -20, -78, -14, -80, -8, -68], '#e8dcc0', 1.6);
  polygon(ctx, [12, -66, 20, -78, 14, -80, 8, -68], '#e8dcc0', 1.6);
  polygon(ctx, [-6, -70, 6, -70, 3, -82, -3, -82], '#c0213a', 1.6);
  polygon(ctx, [-8, -61, 8, -61, 8, -57, -8, -57], '#0b0c16', 1.2);
  glowDot(ctx, 0, -59, 10, '255,150,40', 0.6 + warn * 0.4);
  polygon(ctx, [12, -58, 34, -52, 34, -10, 22, 0, 12, -10], flashing ? WHITE : verticalGradient(ctx, -58, 0, '#9ba1b8', '#4a4f66'));
  ctx.lineWidth = 3;
  ctx.strokeStyle = warn > 0.5 ? '#ff9a3a' : '#f2c14e';
  ctx.stroke();
  oval(ctx, 23, -32, 7, 9, warn > 0.5 ? '#ffb35a' : '#f2c14e', 1.8);
  glowDot(ctx, 23, -32, 14 + warn * 10, '255,170,70', 0.5 + warn * 0.4);
  ctx.restore();
}

function drawChronoWarden(ctx, enemy, time, facing, warn) {
  const unit = enemy.radius / 44;
  const phase = enemy.bossPhase || 1;
  const coreRgb = phase === 3 ? '255,70,56' : phase === 2 ? '255,150,40' : '255,214,90';
  const coreHex = phase === 3 ? '#ff4638' : phase === 2 ? '#ff9628' : '#ffd65a';
  contactShadow(ctx, enemy.x, enemy.y + enemy.radius * 1.25, enemy.radius * 1.7, enemy.radius * 0.55, 0.38);
  ctx.save();
  ctx.translate(enemy.x, enemy.y + enemy.radius * 1.15);
  ctx.scale(unit, unit);

  glowDot(ctx, 0, -78, 120 + warn * 40, coreRgb, 0.28 + (phase - 1) * 0.08);
  ctx.save();
  ctx.translate(0, -78);
  ctx.lineWidth = 9;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, 66, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = tint('#e9c14a');
  ctx.stroke();
  for (let k = 0; k < 12; k += 1) {
    const angle = (k * TAU) / 12;
    ctx.lineWidth = k % 3 === 0 ? 4 : 2;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 56, Math.sin(angle) * 56);
    ctx.lineTo(Math.cos(angle) * 66, Math.sin(angle) * 66);
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  for (const [length, speed, width] of [[50, 0.5, 5], [34, 6, 3.5]]) {
    const angle = time * speed;
    ctx.lineWidth = width + 3;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    ctx.stroke();
    ctx.lineWidth = width;
    ctx.strokeStyle = coreHex;
    ctx.stroke();
  }
  ctx.restore();

  for (let k = 0; k < 4; k += 1) {
    const angle = time * 1.2 + (k * Math.PI) / 2;
    const ox = Math.cos(angle) * 84;
    const oy = -78 + Math.sin(angle) * 26;
    if (Math.sin(angle) < 0) gear(ctx, ox, oy, 9, 8, time * 2 + k, tint('#e9c14a'));
  }

  polygon(ctx, [-36, -100, 36, -100, 48, -52, 38, -8, -38, -8, -48, -52], flashing ? WHITE : verticalGradient(ctx, -100, -8, '#f0cb5e', '#8c6a22'), 2.8);
  polygon(ctx, [-22, -96, 22, -96, 28, -50, 16, -16, -16, -16, -28, -50], tint('#2f2514'), 2);
  polygon(ctx, [-36, -12, 36, -12, 42, 0, -42, 0], tint('#c79b2e'), 2);
  glowDot(ctx, 0, -62, 30 + warn * 14, coreRgb, 0.9);
  oval(ctx, 0, -62, 14, 14, coreHex, 2.4);
  oval(ctx, 0, -62, 6, 6, '#fff7d6', 0);
  for (const side of [-1, 1]) {
    polygon(ctx, [side * 34, -104, side * 62, -100, side * 66, -78, side * 40, -72], tint('#d8aa38'), 2.4);
    polygon(ctx, [side * 52, -102, side * 58, -126, side * 62, -100], tint('#f4d36c'), 2);
  }
  oval(ctx, 0, -112, 17, 18, tint('#d8aa38'), 2.6);
  polygon(ctx, [-12, -118, 12, -118, 12, -110, -12, -110], '#120d06', 1.6);
  glowDot(ctx, -5, -114, 9, coreRgb, 0.9);
  glowDot(ctx, 5, -114, 9, coreRgb, 0.9);
  polygon(ctx, [-18, -122, -12, -142, -6, -126, 0, -148, 6, -126, 12, -142, 18, -122], tint('#f4d36c'), 2.2);
  for (const side of [-1, 1]) {
    const bob = Math.sin(time * 2.4 + side) * 5;
    oval(ctx, side * 70, -48 + bob, 13, 15, tint('#e9c14a'), 2.4);
    oval(ctx, side * 70, -48 + bob, 6, 6, coreHex, 0);
  }
  for (let k = 0; k < 4; k += 1) {
    const angle = time * 1.2 + (k * Math.PI) / 2;
    const ox = Math.cos(angle) * 84;
    const oy = -78 + Math.sin(angle) * 26;
    if (Math.sin(angle) >= 0) gear(ctx, ox, oy, 9, 8, time * 2 + k, tint('#e9c14a'));
  }
  ctx.restore();
  void facing;
}

export function drawEnemySprite(ctx, enemy, time) {
  flashing = enemy.hitFlash > 0;
  const facing = Math.cos(enemy.angle) >= 0 ? 1 : -1;
  const warn = enemy.telegraphTimer > 0 ? 0.5 + 0.5 * Math.sin(time * 28) : 0;
  if (enemy.stunTimer > 0) ctx.globalAlpha = 0.75 + 0.25 * Math.sin(time * 40);
  if (enemy.kind === 'sniper') drawRailSniper(ctx, enemy, time, facing, warn);
  else if (enemy.kind === 'mortar') drawMortarDrone(ctx, enemy, time, facing, warn);
  else if (enemy.kind === 'bruiser') drawPhalanxBruiser(ctx, enemy, time, facing, warn);
  else if (enemy.kind === 'boss') drawChronoWarden(ctx, enemy, time, facing, warn);
  else drawClockworkHound(ctx, enemy, time, facing, warn);
  ctx.globalAlpha = 1;
  flashing = false;
}

/** The Aegis Core: a rune-lit obelisk on the dais, crowned by a floating crystal in a ring of shield arcs. */
export function drawAegisObelisk(ctx, core, time) {
  const ratio = core.hp / core.maxHp;
  const rgb = ratio > 0.5 ? '63,227,255' : ratio > 0.25 ? '255,190,60' : '255,70,80';
  const hex = ratio > 0.5 ? '#3fe3ff' : ratio > 0.25 ? '#ffbe3c' : '#ff4650';
  const hit = core.hitFlash > 0;
  contactShadow(ctx, core.x + 8, core.y + 34, 56, 18, 0.32);
  ctx.save();
  ctx.translate(core.x, core.y + 30);

  polygon(ctx, [-44, 0, 44, 0, 38, -16, -38, -16], '#8d8da6', 2.6);
  polygon(ctx, [-34, -16, 34, -16, 28, -30, -28, -30], '#b4b4cc', 2.4);
  const shaft = ctx.createLinearGradient(-24, 0, 24, 0);
  shaft.addColorStop(0, '#d9d9ee');
  shaft.addColorStop(0.6, '#a9a9c6');
  shaft.addColorStop(1, '#6b6b8c');
  polygon(ctx, [-24, -30, 24, -30, 15, -118, -15, -118], shaft, 2.8);
  for (let k = 0; k < 4; k += 1) {
    const y = -46 - k * 18;
    const pulse = 0.5 + 0.5 * Math.sin(time * 3 - k * 0.8);
    ctx.fillStyle = `rgba(${rgb},${(0.5 + pulse * 0.5).toFixed(2)})`;
    ctx.fillRect(-7, y, 14, 4);
    glowDot(ctx, 0, y + 2, 14, rgb, 0.3 * pulse);
  }
  polygon(ctx, [-18, -118, 18, -118, 12, -126, -12, -126], '#c4c4de', 2.2);

  const bob = Math.sin(time * 2) * 4;
  glowDot(ctx, 0, -150 + bob, 70, rgb, hit ? 0.9 : 0.5);
  ctx.save();
  ctx.translate(0, -150 + bob);
  ctx.scale(1, 1);
  const spin = Math.cos(time * 2.2);
  polygon(ctx, [0, -26, 16 * spin, 0, 0, 26, -16 * spin, 0], hit ? '#ffffff' : hex, 2.6);
  polygon(ctx, [0, -26, 6 * spin, 0, 0, 26, -6 * spin, 0], 'rgba(255,255,255,0.7)', 0);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  for (let k = 0; k < 6; k += 1) {
    const start = time * 1.4 + (k * TAU) / 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 56, 17, 0, start, start + 0.7);
    ctx.stroke();
  }
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = hex;
  for (let k = 0; k < 6; k += 1) {
    const start = time * 1.4 + (k * TAU) / 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 56, 17, 0, start, start + 0.7);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}
