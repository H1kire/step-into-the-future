const VERSION = "sprite-sheet-3";
const wolfSprite = new Image();
wolfSprite.src = new URL("../../assets/pixel-world/wolf-generated.png?v=1", import.meta.url).href;
const monsterAtlas = new Image();
monsterAtlas.src = new URL("../../assets/pixel-world/monsters.svg?v=" + VERSION, import.meta.url).href;
const npcAtlas = new Image();
npcAtlas.src = new URL("../../assets/pixel-world/npcs.svg?v=" + VERSION, import.meta.url).href;
const MONSTERS = ["slime", "goblin", "wolf", "golem", "skeleton", "bat", "mushroom", "bandit", "wisp", "spider", "zombie", "orc"];
const NPCS = ["merchant", "priest", "blacksmith", "doctor", "traveler"];
const caches = new Map();
function paint(canvas, kind, npc = false) {
  const atlas = npc ? npcAtlas : monsterAtlas;
  const index = (npc ? NPCS : MONSTERS).indexOf(kind);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!npc && kind === "wolf") {
    if (wolfSprite.complete && wolfSprite.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(wolfSprite, 0, 0, canvas.width, canvas.height);
    }
    return;
  }
  if (index >= 0 && atlas.complete && atlas.naturalWidth) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, index * 32, 0, 32, 32, 0, 0, canvas.width, canvas.height);
  }
}
function create(kind, scale, npc = false) {
  const keys = npc ? NPCS : MONSTERS;
  const safeKind = keys.includes(kind) ? kind : keys[0];
  const size = Math.max(1, Math.round(56 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const cacheKey = (npc ? "npc:" : "monster:") + safeKind;
  if (!caches.has(cacheKey)) caches.set(cacheKey, new Set());
  caches.get(cacheKey).add(canvas);
  paint(canvas, safeKind, npc);
  return canvas;
}
wolfSprite.addEventListener("load", () => {
  for (const canvas of caches.get("monster:wolf") || []) paint(canvas, "wolf");
});
monsterAtlas.addEventListener("load", () => {
  for (const kind of MONSTERS) for (const canvas of caches.get("monster:" + kind) || []) paint(canvas, kind);
});
npcAtlas.addEventListener("load", () => {
  for (const kind of NPCS) for (const canvas of caches.get("npc:" + kind) || []) paint(canvas, kind, true);
});
export function createMonsterSprite(kind, scale = 1) { return create(kind, scale, false); }
export function createNpcSprite(kind, scale = 1) { return create(kind, scale, true); }
export function getMonsterDefinitions() {
  return [
    { id: "slime", name: "Лесной слизень", width: 32, height: 32, threat: "Низкая" },
    { id: "goblin", name: "Лесной гоблин", width: 32, height: 32, threat: "Низкая" },
    { id: "wolf", name: "Теневой волк", width: 32, height: 32, threat: "Средняя" },
    { id: "golem", name: "Каменный голем", width: 32, height: 32, threat: "Высокая" },
    { id: "skeleton", name: "Скелет-страж", width: 32, height: 32, threat: "Средняя" },
    { id: "bat", name: "Пещерная летучая мышь", width: 32, height: 32, threat: "Низкая" },
    { id: "mushroom", name: "Грибной страж", width: 32, height: 32, threat: "Средняя" },
    { id: "bandit", name: "Дорожный разбойник", width: 32, height: 32, threat: "Высокая" },
    { id: "wisp", name: "Светляк-дух", width: 32, height: 32, threat: "Высокая" },
    { id: "spider", name: "Пещерный паук", width: 32, height: 32, threat: "Средняя" },
    { id: "zombie", name: "Лесной зомби", width: 32, height: 32, threat: "Средняя" },
    { id: "orc", name: "Орк-воин", width: 32, height: 32, threat: "Высокая" }
  ];
}
