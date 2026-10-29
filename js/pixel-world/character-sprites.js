const VERSION = "pixel-atlas-3";
const atlas = new Image();
atlas.src = new URL("../../assets/pixel-world/heroes.svg?v=" + VERSION, import.meta.url).href;
const spriteCanvases = new Map();
const ORDER = ["adventurer", "warrior", "archer", "mage", "classless"];
const DEFINITIONS = {
  adventurer: { name: "Странник", role: "Плащ путешественника, сумка и дорожное снаряжение" },
  warrior: { name: "Воин", role: "Стальная броня, щит и меч" },
  archer: { name: "Лучник", role: "Зелёный капюшон, лук и лёгкая броня" },
  mage: { name: "Маг", role: "Мантия, посох и светящийся кристалл" },
  classless: { name: "Без класса", role: "Простая одежда без классовой экипировки" }
};
function paint(type, canvas) {
  const index = Math.max(0, ORDER.indexOf(type));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (atlas.complete && atlas.naturalWidth) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, index * 32, 0, 32, 32, 0, 0, canvas.width, canvas.height);
  }
}
atlas.addEventListener("load", () => {
  for (const [type, canvases] of spriteCanvases) for (const canvas of canvases) paint(type, canvas);
});
export function createCharacterSprite(type, scale = 1) {
  const key = ORDER.includes(type) ? type : "adventurer";
  const size = Math.max(1, Math.round(56 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  if (!spriteCanvases.has(key)) spriteCanvases.set(key, new Set());
  spriteCanvases.get(key).add(canvas);
  paint(key, canvas);
  return canvas;
}
export function getCharacterDefinitions() {
  return ORDER.map(id => ({ id, ...DEFINITIONS[id] }));
}
