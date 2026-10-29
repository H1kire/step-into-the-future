import { makePixelCanvas } from "./pixel-sprite.js";

const DEFINITIONS = {
  adventurer: { name: "Странник", cloak:"#667d57", cloakLight:"#9eae76", cloakDark:"#354a3a", trim:"#e5bd65", metal:"#b5b9a4", hood:"#7b9367", hoodLight:"#b0c38b", accessory:"satchel" },
  warrior: { name: "Воин", cloak:"#7b8995", cloakLight:"#c7d1d5", cloakDark:"#3e4a5b", trim:"#e3bd68", metal:"#d6e0e3", hood:"#9eafb7", hoodLight:"#e6ece9", accessory:"shield" },
  archer: { name: "Лучник", cloak:"#426f4d", cloakLight:"#82ad65", cloakDark:"#244b3b", trim:"#c99a54", metal:"#aab99b", hood:"#5c9158", hoodLight:"#a7ca79", accessory:"bow" },
  mage: { name: "Маг", cloak:"#65539a", cloakLight:"#b6a1e8", cloakDark:"#372e65", trim:"#f3d879", metal:"#a6b5dc", hood:"#8570bd", hoodLight:"#d0bdf8", accessory:"staff" },
  classless: { name: "Без класса", cloak:"#49677c", cloakLight:"#83a5b9", cloakDark:"#2d4355", trim:"#c9c6b4", metal:"#aab8bd", hood:"#63879a", hoodLight:"#a8c7d2", accessory:"none" }
};

function block(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawCharacter(type, scale = 1) {
  const def = DEFINITIONS[type] || DEFINITIONS.adventurer;
  const { canvas, ctx } = makePixelCanvas(24, 28, scale);
  ctx.imageSmoothingEnabled = false;

  // Hood silhouette, dark outline and layered fabric highlights.
  block(ctx, "#18242b", 6, 1, 12, 9);
  block(ctx, def.cloakDark, 5, 2, 14, 8);
  block(ctx, def.hood, 7, 1, 10, 7);
  block(ctx, def.hoodLight, 8, 2, 7, 2);
  block(ctx, def.cloakDark, 6, 6, 12, 4);
  block(ctx, "#edc49b", 8, 5, 8, 5);
  block(ctx, "#c98a68", 8, 8, 8, 2);
  block(ctx, "#fff0d0", 9, 5, 3, 2);
  block(ctx, "#fff0d0", 13, 5, 3, 2);
  block(ctx, "#29313b", 10, 6, 1, 2);
  block(ctx, "#29313b", 14, 6, 1, 2);
  block(ctx, "#e2aa80", 11, 8, 2, 1);

  // Shoulders, torso, cloth folds and a dark outline.
  block(ctx, "#18242b", 4, 10, 16, 10);
  block(ctx, def.cloakDark, 5, 10, 14, 9);
  block(ctx, def.cloak, 6, 10, 12, 8);
  block(ctx, def.cloakLight, 7, 11, 3, 5);
  block(ctx, def.cloakDark, 15, 12, 2, 6);
  block(ctx, def.trim, 10, 12, 4, 2);
  block(ctx, "#f4d879", 11, 12, 2, 1);
  block(ctx, "#26313a", 6, 17, 12, 3);
  block(ctx, "#d8c49a", 7, 17, 10, 1);
  block(ctx, "#25313a", 10, 17, 4, 2);

  // Sleeves and gloves.
  block(ctx, "#18242b", 3, 11, 5, 8);
  block(ctx, def.cloakDark, 4, 11, 3, 6);
  block(ctx, def.cloakLight, 4, 12, 1, 3);
  block(ctx, "#18242b", 16, 11, 5, 8);
  block(ctx, def.cloak, 17, 11, 3, 6);
  block(ctx, def.cloakLight, 18, 12, 1, 2);
  block(ctx, "#dca77e", 4, 17, 3, 2);
  block(ctx, "#dca77e", 17, 17, 3, 2);

  // Legs and boots have separate shadow planes.
  block(ctx, "#18242b", 7, 19, 5, 6);
  block(ctx, "#18242b", 13, 19, 5, 6);
  block(ctx, def.cloakDark, 8, 20, 3, 4);
  block(ctx, def.cloak, 14, 20, 3, 4);
  block(ctx, "#151d26", 6, 24, 6, 3);
  block(ctx, "#151d26", 13, 24, 6, 3);
  block(ctx, "#7c8b8c", 7, 24, 4, 1);
  block(ctx, "#7c8b8c", 14, 24, 4, 1);

  // Class silhouettes and signature equipment.
  if (type === "warrior") {
    block(ctx, "#18242b", 6, 0, 12, 5);
    block(ctx, def.metal, 7, 0, 10, 4);
    block(ctx, "#f1f0db", 9, 1, 5, 1);
    block(ctx, "#5a6672", 8, 3, 8, 1);
    block(ctx, "#cbd5d8", 3, 10, 5, 4);
    block(ctx, "#6c7c88", 4, 11, 3, 2);
    block(ctx, "#e4c56e", 5, 12, 1, 1);
    block(ctx, "#18242b", 19, 8, 2, 12);
    block(ctx, "#d7e2e2", 20, 8, 2, 10);
    block(ctx, "#7c8c98", 20, 10, 1, 5);
    block(ctx, "#e4c56e", 20, 12, 1, 2);
  } else if (type === "archer") {
    block(ctx, "#18242b", 6, 1, 12, 7);
    block(ctx, def.hood, 7, 1, 10, 6);
    block(ctx, def.hoodLight, 8, 2, 6, 2);
    block(ctx, "#18242b", 19, 7, 2, 13);
    block(ctx, "#c99a54", 20, 7, 1, 12);
    block(ctx, "#f0d89b", 20, 8, 1, 2);
    block(ctx, "#c99a54", 18, 12, 4, 1);
    block(ctx, "#c99a54", 19, 10, 1, 5);
    block(ctx, "#c99a54", 21, 10, 1, 5);
    block(ctx, "#9d6d3f", 5, 14, 3, 3);
  } else if (type === "mage") {
    block(ctx, "#241e48", 4, 0, 16, 7);
    block(ctx, def.hood, 5, 0, 14, 5);
    block(ctx, def.hoodLight, 7, 1, 9, 2);
    block(ctx, "#f4d879", 10, 4, 4, 1);
    block(ctx, "#18242b", 20, 5, 2, 22);
    block(ctx, "#a98de5", 20, 6, 1, 19);
    block(ctx, "#f8e6a2", 19, 3, 4, 4);
    block(ctx, "#fff6d4", 20, 2, 2, 2);
    block(ctx, "#d9c2ff", 18, 4, 1, 2);
    block(ctx, "#d9c2ff", 23, 4, 1, 2);
    block(ctx, "#f4d879", 10, 13, 4, 4);
    block(ctx, "#fff0b2", 11, 14, 2, 2);
    block(ctx, def.cloakDark, 7, 21, 10, 2);
  } else if (type === "adventurer") {
    block(ctx, "#5c3e2b", 3, 14, 4, 5);
    block(ctx, "#c58e4e", 4, 14, 2, 3);
    block(ctx, "#f1d29a", 4, 15, 1, 1);
    block(ctx, "#8a5d36", 16, 15, 3, 3);
    block(ctx, "#e1c181", 17, 15, 1, 2);
    block(ctx, "#d9c9a1", 11, 18, 2, 2);
  } else {
    block(ctx, "#b4c6ce", 10, 12, 4, 1);
    block(ctx, "#8da5b2", 11, 13, 2, 3);
  }

  // Fine rim light and fabric seams.
  block(ctx, "#f0d6a2", 7, 10, 2, 1);
  block(ctx, "#fff0c8", 8, 11, 1, 2);
  block(ctx, def.cloakDark, 15, 14, 1, 3);
  block(ctx, def.trim, 10, 18, 4, 1);
  return canvas;
}

export function createCharacterSprite(type, scale = 1) {
  return drawCharacter(type, scale);
}

export function getCharacterDefinitions() {
  return Object.entries(DEFINITIONS).map(([id, value]) => ({ id, ...value }));
}
