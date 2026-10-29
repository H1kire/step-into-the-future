import { makePixelCanvas } from "./pixel-sprite.js";

const OUTLINE = "#17212c";
const PALETTES = {
  slime: { base:"#43a83d", light:"#9bfa63", mid:"#65d94a", dark:"#246632", eye:"#f5ffe0", pupil:"#19352b", accent:"#d1ff9d" },
  goblin: { base:"#6f9d3e", light:"#c5e66a", mid:"#91c84a", dark:"#354d2d", eye:"#fff3bc", pupil:"#252c25", accent:"#b65d45" },
  wolf: { base:"#46546e", light:"#9fb8d0", mid:"#687f9b", dark:"#252b40", eye:"#ff5d79", pupil:"#fff0e4", accent:"#b7d9e7" },
  golem: { base:"#818b8c", light:"#d3d6c9", mid:"#a7b2ad", dark:"#414e55", eye:"#ffd56e", pupil:"#fff4b2", accent:"#a7e5e2" },
  skeleton: { base:"#c4c7b4", light:"#fff1cf", mid:"#e0ddc7", dark:"#646d70", eye:"#ff6a62", pupil:"#351e2a", accent:"#9a7657" },
  bat: { base:"#6b527d", light:"#d5a7ef", mid:"#9670ad", dark:"#30273f", eye:"#ff535f", pupil:"#fff0c4", accent:"#bb4269" },
  mushroom: { base:"#b85a54", light:"#ffb477", mid:"#d97b65", dark:"#65364c", eye:"#fff0c4", pupil:"#392638", accent:"#7bcf72" },
  bandit: { base:"#8c684b", light:"#d7b16c", mid:"#b58a57", dark:"#42333b", eye:"#f4e6c8", pupil:"#20252d", accent:"#cf594f" },
  wisp: { base:"#3b9fb0", light:"#c4fff4", mid:"#69d6d9", dark:"#24536f", eye:"#fff8cb", pupil:"#fff8cb", accent:"#8bfff0" }
};

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function px(ctx, palette, key, x, y, w = 1, h = 1) {
  rect(ctx, palette[key] || key, x, y, w, h);
}

function createCreature(kind, scale = 1) {
  const size = kind === "wolf" ? [28, 22] : kind === "slime" || kind === "bat" || kind === "wisp" ? [24, 20] : [24, 28];
  const { canvas, ctx } = makePixelCanvas(size[0], size[1], scale);
  ctx.imageSmoothingEnabled = false;
  const p = PALETTES[kind] || PALETTES.slime;

  // A small ground shadow gives the sprite the same crisp, top-down RPG read.
  rect(ctx, "rgba(9,17,23,.42)", 4, size[1] - 5, size[0] - 8, 3);

  if (kind === "slime") {
    rect(ctx, p.dark, 3, 10, 18, 8); rect(ctx, p.base, 4, 8, 16, 9);
    rect(ctx, p.mid, 5, 5, 14, 10); rect(ctx, p.light, 7, 4, 10, 7);
    rect(ctx, p.accent, 8, 5, 4, 2); rect(ctx, p.mid, 5, 13, 14, 3);
    rect(ctx, p.dark, 5, 15, 4, 2); rect(ctx, p.dark, 16, 15, 3, 2);
    rect(ctx, p.eye, 7, 9, 4, 4); rect(ctx, p.eye, 14, 9, 4, 4);
    rect(ctx, p.pupil, 9, 10, 2, 3); rect(ctx, p.pupil, 15, 10, 2, 3);
    rect(ctx, p.light, 6, 7, 2, 2);
  } else if (kind === "wolf") {
    rect(ctx, p.dark, 2, 8, 23, 11); rect(ctx, p.base, 5, 7, 18, 10);
    rect(ctx, p.mid, 7, 6, 13, 8); rect(ctx, p.light, 8, 7, 6, 3);
    rect(ctx, p.dark, 4, 3, 6, 7); rect(ctx, p.mid, 5, 4, 4, 4);
    rect(ctx, p.dark, 17, 3, 6, 7); rect(ctx, p.mid, 18, 4, 4, 4);
    rect(ctx, p.base, 18, 8, 8, 6); rect(ctx, p.mid, 22, 10, 5, 4);
    rect(ctx, p.eye, 20, 8, 2, 2); rect(ctx, p.eye, 24, 8, 2, 2);
    rect(ctx, p.pupil, 21, 9, 1, 1); rect(ctx, p.pupil, 25, 9, 1, 1);
    rect(ctx, p.accent, 22, 12, 3, 1); rect(ctx, p.dark, 7, 15, 4, 5);
    rect(ctx, p.dark, 16, 15, 4, 5); rect(ctx, p.mid, 7, 16, 2, 3);
    rect(ctx, p.mid, 16, 16, 2, 3); rect(ctx, p.dark, 5, 19, 6, 2);
    rect(ctx, p.dark, 15, 19, 6, 2); rect(ctx, p.base, 1, 9, 5, 3);
  } else if (kind === "bat") {
    rect(ctx, p.dark, 1, 7, 10, 8); rect(ctx, p.dark, 13, 7, 10, 8);
    rect(ctx, p.mid, 2, 8, 8, 5); rect(ctx, p.mid, 14, 8, 8, 5);
    rect(ctx, p.light, 3, 8, 4, 2); rect(ctx, p.light, 15, 8, 4, 2);
    rect(ctx, p.dark, 8, 6, 9, 11); rect(ctx, p.base, 9, 5, 7, 10);
    rect(ctx, p.light, 10, 6, 4, 3); rect(ctx, p.dark, 8, 3, 4, 5);
    rect(ctx, p.dark, 14, 3, 4, 5); rect(ctx, p.eye, 10, 9, 2, 2);
    rect(ctx, p.eye, 14, 9, 2, 2); rect(ctx, p.pupil, 11, 9, 1, 2);
    rect(ctx, p.pupil, 14, 9, 1, 2); rect(ctx, p.accent, 11, 13, 4, 2);
  } else if (kind === "wisp") {
    rect(ctx, p.dark, 6, 5, 12, 12); rect(ctx, p.base, 7, 4, 10, 12);
    rect(ctx, p.mid, 8, 3, 8, 11); rect(ctx, p.light, 9, 4, 5, 5);
    rect(ctx, p.accent, 10, 5, 3, 3); rect(ctx, p.dark, 5, 10, 3, 5);
    rect(ctx, p.dark, 16, 10, 3, 5); rect(ctx, p.eye, 8, 9, 3, 3);
    rect(ctx, p.eye, 13, 9, 3, 3); rect(ctx, p.pupil, 9, 10, 1, 2);
    rect(ctx, p.pupil, 14, 10, 1, 2); rect(ctx, p.mid, 9, 16, 2, 3);
    rect(ctx, p.light, 13, 15, 2, 4);
  } else if (kind === "mushroom") {
    rect(ctx, p.dark, 7, 9, 10, 14); rect(ctx, "#e8c89c", 8, 10, 8, 12);
    rect(ctx, "#b99572", 9, 12, 2, 8); rect(ctx, p.dark, 3, 4, 18, 8);
    rect(ctx, p.base, 4, 2, 16, 8); rect(ctx, p.mid, 5, 2, 13, 5);
    rect(ctx, p.light, 6, 3, 6, 2); rect(ctx, "#fff0c8", 6, 5, 3, 2);
    rect(ctx, "#fff0c8", 15, 4, 3, 2); rect(ctx, p.eye, 8, 12, 3, 3);
    rect(ctx, p.eye, 13, 12, 3, 3); rect(ctx, p.pupil, 9, 13, 1, 2);
    rect(ctx, p.pupil, 14, 13, 1, 2); rect(ctx, p.accent, 10, 17, 4, 2);
    rect(ctx, p.dark, 6, 21, 5, 3); rect(ctx, p.dark, 13, 21, 5, 3);
  } else if (kind === "skeleton") {
    rect(ctx, p.dark, 6, 2, 12, 11); rect(ctx, p.mid, 7, 2, 10, 9);
    rect(ctx, p.light, 8, 3, 7, 5); rect(ctx, p.dark, 8, 6, 3, 3);
    rect(ctx, p.dark, 13, 6, 3, 3); rect(ctx, p.eye, 9, 7, 2, 2);
    rect(ctx, p.eye, 14, 7, 2, 2); rect(ctx, p.pupil, 10, 7, 1, 1);
    rect(ctx, p.pupil, 14, 7, 1, 1); rect(ctx, p.dark, 10, 10, 5, 2);
    rect(ctx, p.mid, 5, 12, 14, 8); rect(ctx, p.light, 7, 12, 10, 5);
    rect(ctx, p.dark, 9, 13, 2, 5); rect(ctx, p.dark, 13, 13, 2, 5);
    rect(ctx, p.accent, 10, 15, 4, 2); rect(ctx, p.dark, 6, 19, 5, 6);
    rect(ctx, p.dark, 13, 19, 5, 6); rect(ctx, p.mid, 7, 20, 3, 3);
    rect(ctx, p.mid, 14, 20, 3, 3); rect(ctx, p.dark, 4, 24, 7, 2);
    rect(ctx, p.dark, 13, 24, 7, 2); rect(ctx, p.light, 3, 12, 4, 6);
    rect(ctx, p.dark, 2, 13, 3, 7);
  } else if (kind === "bandit") {
    rect(ctx, p.dark, 6, 2, 12, 9); rect(ctx, p.base, 7, 2, 10, 7);
    rect(ctx, p.light, 8, 3, 6, 2); rect(ctx, "#eac19a", 8, 6, 8, 5);
    rect(ctx, p.dark, 7, 7, 10, 3); rect(ctx, p.eye, 9, 7, 2, 2);
    rect(ctx, p.eye, 14, 7, 2, 2); rect(ctx, p.pupil, 10, 8, 1, 1);
    rect(ctx, p.pupil, 14, 8, 1, 1); rect(ctx, p.dark, 5, 11, 14, 11);
    rect(ctx, p.base, 7, 12, 10, 8); rect(ctx, p.light, 8, 12, 3, 4);
    rect(ctx, p.accent, 11, 15, 4, 2); rect(ctx, p.dark, 6, 21, 5, 4);
    rect(ctx, p.dark, 13, 21, 5, 4); rect(ctx, p.mid, 3, 12, 4, 7);
    rect(ctx, p.mid, 17, 12, 4, 7); rect(ctx, p.dark, 20, 6, 2, 16);
    rect(ctx, "#d6dbe1", 20, 5, 2, 9); rect(ctx, "#e8c16e", 19, 12, 4, 2);
  } else if (kind === "goblin") {
    rect(ctx, p.dark, 6, 2, 12, 6); rect(ctx, p.base, 7, 2, 10, 6);
    rect(ctx, p.light, 8, 3, 7, 2); rect(ctx, p.dark, 3, 5, 6, 3);
    rect(ctx, p.dark, 15, 5, 6, 3); rect(ctx, p.dark, 5, 7, 14, 7);
    rect(ctx, p.mid, 7, 7, 10, 6); rect(ctx, p.light, 8, 8, 3, 2);
    rect(ctx, p.light, 14, 8, 3, 2); rect(ctx, p.pupil, 9, 9, 2, 2);
    rect(ctx, p.pupil, 14, 9, 2, 2); rect(ctx, "#e5bc77", 10, 12, 5, 2);
    rect(ctx, p.dark, 5, 15, 14, 8); rect(ctx, p.base, 7, 15, 10, 6);
    rect(ctx, p.light, 8, 16, 3, 3); rect(ctx, p.accent, 11, 15, 4, 1);
    rect(ctx, p.dark, 4, 16, 3, 5); rect(ctx, p.dark, 17, 16, 3, 5);
    rect(ctx, p.dark, 6, 22, 5, 3); rect(ctx, p.dark, 14, 22, 5, 3);
  } else {
    // Stone golem: chunky silhouette, carved plates, luminous core.
    rect(ctx, p.dark, 4, 3, 16, 9); rect(ctx, p.base, 5, 2, 14, 9);
    rect(ctx, p.mid, 7, 3, 10, 7); rect(ctx, p.light, 8, 3, 5, 2);
    rect(ctx, p.dark, 7, 6, 3, 3); rect(ctx, p.dark, 14, 6, 3, 3);
    rect(ctx, p.eye, 8, 7, 2, 2); rect(ctx, p.eye, 14, 7, 2, 2);
    rect(ctx, p.pupil, 8, 7, 1, 1); rect(ctx, p.pupil, 14, 7, 1, 1);
    rect(ctx, p.dark, 3, 12, 18, 9); rect(ctx, p.base, 5, 12, 14, 7);
    rect(ctx, p.mid, 7, 13, 10, 5); rect(ctx, p.eye, 9, 14, 6, 4);
    rect(ctx, p.pupil, 10, 15, 4, 2); rect(ctx, p.dark, 1, 13, 5, 7);
    rect(ctx, p.mid, 2, 13, 4, 5); rect(ctx, p.dark, 18, 13, 5, 7);
    rect(ctx, p.mid, 18, 13, 4, 5); rect(ctx, p.dark, 6, 20, 5, 6);
    rect(ctx, p.dark, 14, 20, 5, 6); rect(ctx, p.mid, 7, 21, 3, 4);
    rect(ctx, p.mid, 15, 21, 3, 4); rect(ctx, p.light, 7, 12, 3, 1);
  }
  return canvas;
}

function createNpcSprite(kind, scale = 1) {
  const { canvas, ctx } = makePixelCanvas(24, 28, scale);
  ctx.imageSmoothingEnabled = false;
  const priest = kind === "priest";
  const smith = kind === "blacksmith";
  const colors = priest
    ? { robe:"#6e5bb0", light:"#c4adff", dark:"#302747", accent:"#ffe08a", skin:"#f0c49d" }
    : smith
      ? { robe:"#6d5140", light:"#c59a6b", dark:"#2e2a2d", accent:"#f08a45", skin:"#e9b38a" }
      : { robe:"#72533c", light:"#d6a45f", dark:"#332a29", accent:"#f3cf7b", skin:"#efbd93" };

  // Short top-down fantasy-town silhouettes: dark outline, bright upper-left rim.
  rect(ctx, "rgba(9,17,23,.42)", 5, 24, 14, 3);
  rect(ctx, OUTLINE, 6, 2, 12, 10);
  rect(ctx, colors.robe, 7, 2, 10, 8);
  rect(ctx, colors.light, 8, 3, 6, 2);
  rect(ctx, colors.dark, 7, 6, 10, 6);
  rect(ctx, colors.skin, 8, 6, 8, 6);
  rect(ctx, "#fff0ce", 9, 7, 2, 2); rect(ctx, "#fff0ce", 13, 7, 2, 2);
  rect(ctx, OUTLINE, 10, 8, 1, 2); rect(ctx, OUTLINE, 14, 8, 1, 2);
  rect(ctx, OUTLINE, 4, 12, 16, 12); rect(ctx, colors.dark, 5, 12, 14, 11);
  rect(ctx, colors.robe, 7, 12, 10, 9); rect(ctx, colors.light, 8, 13, 3, 6);
  rect(ctx, colors.accent, 10, 15, 4, 3); rect(ctx, "#fff0b0", 11, 15, 2, 1);
  rect(ctx, OUTLINE, 7, 22, 5, 4); rect(ctx, OUTLINE, 13, 22, 5, 4);
  rect(ctx, "#8b9da5", 8, 23, 3, 1); rect(ctx, "#8b9da5", 14, 23, 3, 1);

  if (priest) {
    rect(ctx, colors.dark, 4, 1, 16, 4); rect(ctx, colors.robe, 6, 0, 12, 4);
    rect(ctx, colors.light, 7, 1, 7, 1); rect(ctx, colors.accent, 10, 0, 4, 2);
    rect(ctx, OUTLINE, 20, 4, 2, 22); rect(ctx, "#a88df0", 20, 5, 1, 20);
    rect(ctx, colors.accent, 18, 3, 5, 4); rect(ctx, "#fff6d4", 19, 2, 3, 2);
  } else if (smith) {
    rect(ctx, OUTLINE, 3, 3, 18, 4); rect(ctx, "#6c7077", 4, 2, 16, 3);
    rect(ctx, "#c9d0d4", 6, 2, 8, 1); rect(ctx, colors.dark, 3, 14, 3, 8);
    rect(ctx, colors.dark, 18, 14, 3, 8); rect(ctx, colors.accent, 17, 9, 5, 4);
    rect(ctx, "#ffcf75", 18, 10, 2, 2);
  } else {
    rect(ctx, OUTLINE, 3, 3, 18, 3); rect(ctx, "#9f733f", 4, 2, 16, 2);
    rect(ctx, "#f3d99a", 6, 2, 8, 1); rect(ctx, colors.dark, 3, 15, 3, 7);
    rect(ctx, colors.dark, 18, 15, 3, 7); rect(ctx, colors.light, 5, 16, 2, 4);
    rect(ctx, colors.light, 17, 16, 2, 4);
  }
  return canvas;
}

export function createMonsterSprite(kind, scale = 1) {
  return createCreature(kind, scale);
}
export { createNpcSprite };

export function getMonsterDefinitions() {
  return [
    { id:"slime", name:"Лесной слизень", width:24, height:20, threat:"Низкая" },
    { id:"goblin", name:"Лесной гоблин", width:24, height:28, threat:"Низкая" },
    { id:"wolf", name:"Теневой волк", width:28, height:22, threat:"Средняя" },
    { id:"golem", name:"Каменный голем", width:24, height:28, threat:"Высокая" },
    { id:"skeleton", name:"Скелет-страж", width:24, height:28, threat:"Средняя" },
    { id:"bat", name:"Пещерная летучая мышь", width:24, height:20, threat:"Низкая" },
    { id:"mushroom", name:"Грибной страж", width:24, height:28, threat:"Средняя" },
    { id:"bandit", name:"Дорожный разбойник", width:24, height:28, threat:"Средняя" },
    { id:"wisp", name:"Светляк-дух", width:24, height:20, threat:"Высокая" }
  ];
}
