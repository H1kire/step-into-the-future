import { makePixelCanvas } from "./pixel-sprite.js";

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function createMonsterSprite(kind, scale = 1) {
  const size = kind === "slime" ? [24, 20] : kind === "wolf" ? [28, 22] : [24, 28];
  const { canvas, ctx } = makePixelCanvas(size[0], size[1], scale);
  ctx.imageSmoothingEnabled = false;

  if (kind === "slime") {
    rect(ctx, "#18352b", 3, 11, 18, 7);
    rect(ctx, "#246b36", 4, 8, 16, 9);
    rect(ctx, "#3f9e3b", 5, 5, 14, 11);
    rect(ctx, "#72d84f", 7, 4, 10, 10);
    rect(ctx, "#9bf56b", 8, 5, 6, 3);
    rect(ctx, "#caff91", 9, 5, 3, 1);
    rect(ctx, "#3f9e3b", 4, 12, 2, 4);
    rect(ctx, "#246b36", 18, 11, 2, 5);
    rect(ctx, "#f4ffe1", 7, 9, 4, 4);
    rect(ctx, "#f4ffe1", 14, 9, 4, 4);
    rect(ctx, "#20352b", 9, 10, 2, 3);
    rect(ctx, "#20352b", 15, 10, 2, 3);
    rect(ctx, "#b6ff79", 6, 7, 2, 2);
    rect(ctx, "#b6ff79", 17, 7, 2, 2);
    rect(ctx, "#18352b", 8, 16, 8, 1);
  } else if (kind === "goblin") {
    rect(ctx, "#20272b", 6, 2, 12, 6);
    rect(ctx, "#4f803d", 7, 2, 10, 6);
    rect(ctx, "#8fc35b", 8, 3, 7, 4);
    rect(ctx, "#b0d875", 9, 3, 4, 1);
    rect(ctx, "#4f803d", 3, 5, 6, 3);
    rect(ctx, "#4f803d", 15, 5, 6, 3);
    rect(ctx, "#20272b", 5, 7, 14, 7);
    rect(ctx, "#8fc35b", 7, 7, 10, 6);
    rect(ctx, "#d2e88d", 8, 8, 3, 2);
    rect(ctx, "#d2e88d", 14, 8, 3, 2);
    rect(ctx, "#1d2928", 9, 9, 2, 2);
    rect(ctx, "#1d2928", 14, 9, 2, 2);
    rect(ctx, "#e3c17d", 10, 12, 5, 2);
    rect(ctx, "#6b3e34", 8, 14, 8, 2);
    rect(ctx, "#352b29", 5, 15, 14, 8);
    rect(ctx, "#60402e", 7, 15, 10, 6);
    rect(ctx, "#8c6040", 8, 16, 3, 4);
    rect(ctx, "#352b29", 4, 16, 3, 5);
    rect(ctx, "#352b29", 17, 16, 3, 5);
    rect(ctx, "#20262b", 6, 22, 5, 3);
    rect(ctx, "#20262b", 14, 22, 5, 3);
    rect(ctx, "#b4b7a4", 8, 15, 2, 1);
    rect(ctx, "#b54d4d", 11, 15, 4, 1);
  } else if (kind === "wolf") {
    rect(ctx, "#17202b", 2, 8, 23, 11);
    rect(ctx, "#252d40", 4, 7, 19, 10);
    rect(ctx, "#3c495e", 6, 6, 14, 9);
    rect(ctx, "#697789", 8, 7, 10, 6);
    rect(ctx, "#a7c2d8", 8, 7, 5, 2);
    rect(ctx, "#252d40", 4, 3, 6, 7);
    rect(ctx, "#3c495e", 5, 4, 4, 4);
    rect(ctx, "#252d40", 17, 3, 6, 7);
    rect(ctx, "#3c495e", 18, 4, 4, 4);
    rect(ctx, "#697789", 18, 8, 8, 6);
    rect(ctx, "#3c495e", 22, 10, 5, 4);
    rect(ctx, "#eaf2ff", 20, 8, 2, 2);
    rect(ctx, "#17202b", 21, 9, 1, 1);
    rect(ctx, "#eaf2ff", 24, 8, 2, 2);
    rect(ctx, "#17202b", 25, 9, 1, 1);
    rect(ctx, "#c96d7d", 22, 13, 5, 2);
    rect(ctx, "#17202b", 25, 13, 2, 1);
    rect(ctx, "#252d40", 7, 15, 4, 5);
    rect(ctx, "#252d40", 16, 15, 4, 5);
    rect(ctx, "#3c495e", 7, 16, 2, 3);
    rect(ctx, "#3c495e", 16, 16, 2, 3);
    rect(ctx, "#17202b", 5, 19, 6, 2);
    rect(ctx, "#17202b", 15, 19, 6, 2);
    rect(ctx, "#3c495e", 2, 9, 5, 3);
    rect(ctx, "#252d40", 1, 8, 4, 2);
  } else {
    // Small golem: chiseled stone plates, cracks, and glowing amber core.
    rect(ctx, "#202b31", 4, 3, 16, 9);
    rect(ctx, "#657577", 5, 2, 14, 9);
    rect(ctx, "#9aa6a6", 7, 3, 10, 7);
    rect(ctx, "#d0d7c9", 8, 3, 5, 2);
    rect(ctx, "#657577", 5, 5, 2, 5);
    rect(ctx, "#3e4e53", 7, 8, 10, 2);
    rect(ctx, "#202b31", 8, 6, 3, 3);
    rect(ctx, "#202b31", 14, 6, 3, 3);
    rect(ctx, "#dcae62", 9, 7, 2, 2);
    rect(ctx, "#dcae62", 14, 7, 2, 2);
    rect(ctx, "#fff0b0", 9, 7, 1, 1);
    rect(ctx, "#fff0b0", 14, 7, 1, 1);
    rect(ctx, "#202b31", 9, 11, 6, 2);
    rect(ctx, "#3e4e53", 3, 12, 18, 9);
    rect(ctx, "#657577", 5, 12, 14, 7);
    rect(ctx, "#9aa6a6", 7, 13, 10, 5);
    rect(ctx, "#dcae62", 9, 14, 6, 4);
    rect(ctx, "#fff0b0", 10, 14, 4, 2);
    rect(ctx, "#926d3d", 11, 16, 2, 2);
    rect(ctx, "#202b31", 1, 13, 5, 7);
    rect(ctx, "#657577", 2, 13, 4, 5);
    rect(ctx, "#202b31", 18, 13, 5, 7);
    rect(ctx, "#657577", 18, 13, 4, 5);
    rect(ctx, "#202b31", 6, 20, 5, 6);
    rect(ctx, "#202b31", 14, 20, 5, 6);
    rect(ctx, "#657577", 7, 21, 3, 4);
    rect(ctx, "#657577", 15, 21, 3, 4);
    rect(ctx, "#3e4e53", 5, 25, 7, 2);
    rect(ctx, "#3e4e53", 13, 25, 7, 2);
    rect(ctx, "#d0d7c9", 7, 12, 3, 1);
    rect(ctx, "#d0d7c9", 15, 12, 3, 1);
  }
  return canvas;
}

function createNpcSprite(kind, scale = 1) {
  const { canvas, ctx } = makePixelCanvas(24, 28, scale);
  ctx.imageSmoothingEnabled = false;
  const priest = kind === "priest";
  const robe = priest ? "#7560a0" : "#76513a";
  const light = priest ? "#b8a2e5" : "#d5a45c";
  const dark = priest ? "#3e315e" : "#422d27";
  const skin = "#edbd94";

  // Head, hood/hat, face and shaded robe.
  rect(ctx, "#20272f", 6, 2, 12, 10);
  rect(ctx, priest ? "#7660a8" : "#5c402f", 7, 1, 10, 7);
  rect(ctx, light, 8, 2, 7, 2);
  rect(ctx, "#20272f", 7, 6, 10, 7);
  rect(ctx, skin, 8, 6, 8, 6);
  rect(ctx, "#d18d69", 8, 10, 8, 2);
  rect(ctx, "#fff0ce", 9, 7, 2, 2);
  rect(ctx, "#fff0ce", 13, 7, 2, 2);
  rect(ctx, "#28303a", 10, 8, 1, 2);
  rect(ctx, "#28303a", 14, 8, 1, 2);
  rect(ctx, "#20272f", 4, 12, 16, 12);
  rect(ctx, dark, 5, 12, 14, 11);
  rect(ctx, robe, 7, 12, 10, 9);
  rect(ctx, light, 8, 13, 3, 6);
  rect(ctx, dark, 14, 15, 3, 6);
  rect(ctx, "#e3c66c", 10, 15, 4, 3);
  rect(ctx, "#fff0b0", 11, 15, 2, 1);
  rect(ctx, "#20272f", 7, 22, 5, 4);
  rect(ctx, "#20272f", 13, 22, 5, 4);
  rect(ctx, "#707d83", 8, 23, 3, 1);
  rect(ctx, "#707d83", 14, 23, 3, 1);

  if (priest) {
    rect(ctx, "#f4d879", 10, 0, 4, 2);
    rect(ctx, "#fff1b2", 11, 0, 2, 1);
    rect(ctx, "#20272f", 20, 4, 2, 22);
    rect(ctx, "#9d83d3", 20, 5, 1, 20);
    rect(ctx, "#f4d879", 18, 3, 5, 4);
    rect(ctx, "#fff6d4", 19, 2, 3, 2);
    rect(ctx, "#e5d5ff", 18, 4, 1, 2);
    rect(ctx, "#e5d5ff", 23, 4, 1, 2);
  } else {
    rect(ctx, "#20272f", 3, 3, 18, 3);
    rect(ctx, "#a77a40", 4, 2, 16, 2);
    rect(ctx, "#f0d394", 6, 2, 8, 1);
    rect(ctx, "#422d27", 3, 4, 2, 4);
    rect(ctx, "#422d27", 19, 4, 2, 4);
    rect(ctx, "#422d27", 4, 15, 3, 7);
    rect(ctx, "#422d27", 17, 15, 3, 7);
    rect(ctx, "#d5a45c", 5, 16, 2, 4);
    rect(ctx, "#d5a45c", 17, 16, 2, 4);
  }
  return canvas;
}

export { createMonsterSprite, createNpcSprite };

export function getMonsterDefinitions() {
  return [
    { id: "slime", name: "Дикий слизень", width: 24, height: 20 },
    { id: "goblin", name: "Подворотный гоблин", width: 24, height: 28 },
    { id: "wolf", name: "Теневой волк", width: 28, height: 22 },
    { id: "golem", name: "Малый голем", width: 24, height: 28 }
  ];
}
