import { makePixelCanvas, pixels, SPRITE_WIDTH, SPRITE_HEIGHT } from "./pixel-sprite.js";

const COMMON = {
  ".": null,
  k: "#252b35", K: "#111820",
  s: "#f1c49a", S: "#c98766",
  e: "#f6ead0", E: "#31303a",
  b: "#573b2c", B: "#382a29",
  g: "#d9d7c8", G: "#9ca9a8",
  h: "#e9c75e", H: "#a87535",
  w: "#648ba7", W: "#345c7d",
  r: "#c56e62", R: "#873f4b",
  l: "#6fa56c", L: "#3b704e",
  p: "#a88bd2", P: "#7056a0",
  c: "#d5a95f", C: "#8e633a",
  n: "#d7e0e5", N: "#748894"
};

const BODY_ROWS = [
  "......bbbb......",
  ".....bssssb.....",
  ".....sseess.....",
  ".....sseess.....",
  "......ssss......",
  ".....kkkkkk.....",
  "....kkwwwwkk....",
  "....kwweewwk....",
  "....kkkkkkkk....",
  ".....kKKKk......",
  "....kk...kk.....",
  "....kk...kk.....",
  "....kk...kk.....",
  "....kk...kk.....",
  "....kk...kk.....",
  "....kk...kk.....",
  "....kk...kk.....",
  "...kk.....kk....",
  "...kk.....kk....",
  "...KK.....KK...."
];

const DEFINITIONS = {
  adventurer: { name: "Странник", role: "Универсальный путешественник", cloak: "g", trim: "h", extra: "satchel" },
  warrior: { name: "Воин", role: "Тяжёлая броня и щит", cloak: "G", trim: "n", extra: "shield" },
  archer: { name: "Лучник", role: "Зелёный плащ и лук", cloak: "l", trim: "c", extra: "bow" },
  mage: { name: "Маг", role: "Мантия и посох с кристаллом", cloak: "p", trim: "h", extra: "staff" },
  classless: { name: "Без класса", role: "Простая одежда без знаков класса", cloak: "w", trim: "g", extra: "none" }
};

function drawCharacter(type, scale = 1) {
  const def = DEFINITIONS[type] || DEFINITIONS.adventurer;
  const { canvas, ctx } = makePixelCanvas(SPRITE_WIDTH, SPRITE_HEIGHT, scale);
  const palette = { ...COMMON, a: COMMON[def.cloak], A: COMMON[def.trim] };
  // Main silhouette is a literal pixel matrix; class details are individual pixels.
  pixels(ctx, BODY_ROWS, palette);
  pixels(ctx, [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    ".....aaaaaa.....",
    "....aAAAAAAa....",
    "....aAAAAAAa....",
    ".....aaaaaa.....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................"
  ], palette);
  // Hood/helmet and shoulder accents give each class a distinct silhouette.
  if (type === "warrior") {
    pixels(ctx, ["......nnnn......",".....nNNNNn.....",".....n....n.....","......nnnn......"], palette, 0, 0);
    pixels(ctx, ["...GG...........","..GGG...........","..GGG...........","...GG..........."], palette, 0, 8);
    pixels(ctx, [".............n..","............nn..","............n...","...........nn..."], palette, 0, 7);
  } else if (type === "archer") {
    pixels(ctx, ["......llll......",".....lLLLLl.....",".....l....l.....","......llll......"], palette, 0, 0);
    pixels(ctx, [".............c..","............c.c.","...........c..c.","............c.c.",".............c.."], palette, 0, 8);
    pixels(ctx, ["...l............","..ll............","...l............"], palette, 0, 10);
  } else if (type === "mage") {
    pixels(ctx, [".......p........","......ppp.......",".....ppppp......","....ppppppp.....","...ppppppppp...."], palette, 0, 0);
    pixels(ctx, [".............h..","............hhh.",".............h..",".............h..",".............h.."], palette, 0, 7);
    pixels(ctx, ["....p.......p...","...pp.......pp..","....p.......p..."], palette, 0, 12);
  } else if (type === "adventurer") {
    pixels(ctx, ["......gggg......",".....gGGGGg.....",".....g....g.....","......gggg......"], palette, 0, 0);
    pixels(ctx, ["....cc..........","...cCc..........","....cc.........."], palette, 0, 12);
    pixels(ctx, ["............cc..","...........cCc..","............cc.."], palette, 0, 13);
  } else {
    pixels(ctx, ["......wwww......",".....wWWWWw.....",".....w....w.....","......wwww......"], palette, 0, 0);
  }
  // Face pixels remain visible beneath the class headgear.
  pixels(ctx, ["......ss.ss......","......sEEs.......","......ssss......."], palette, 0, 2);
  // Tiny highlights and shadows are still pixels, not blur or lighting effects.
  ctx.fillStyle = "#fff0c8"; ctx.fillRect(6, 6, 1, 1);
  ctx.fillStyle = "#26323b"; ctx.fillRect(9, 6, 1, 1);
  return canvas;
}

export function createCharacterSprite(type, scale = 1) {
  return drawCharacter(type, scale);
}

export function getCharacterDefinitions() {
  return Object.entries(DEFINITIONS).map(([id, value]) => ({ id, ...value }));
}
