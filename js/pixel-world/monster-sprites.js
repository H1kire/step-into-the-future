const VERSION = "pixel-atlas-1";
const monsterAtlas = new Image();
monsterAtlas.src = new URL("../../assets/pixel-world/monsters.png?v=" + VERSION, import.meta.url).href;
const npcAtlas = new Image();
npcAtlas.src = new URL("../../assets/pixel-world/npcs.png?v=" + VERSION, import.meta.url).href;
const MONSTERS = ["slime", "goblin", "wolf", "golem", "skeleton", "bat", "mushroom", "bandit", "wisp"];
const NPCS = ["merchant", "priest", "blacksmith"];
const caches = new Map();
function paint(canvas, kind, npc = false) {
  const atlas = npc ? npcAtlas : monsterAtlas;
  const index = (npc ? NPCS : MONSTERS).indexOf(kind);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (index >= 0 && atlas.complete && atlas.naturalWidth) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, index * 64, 0, 64, 64, 0, 0, canvas.width, canvas.height);
  }
}
function create(kind, scale, npc = false) {
  const keys = npc ? NPCS : MONSTERS;
  const safeKind = keys.includes(kind) ? kind : keys[0];
  const size = Math.max(1, Math.round(32 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const cacheKey = (npc ? "npc:" : "monster:") + safeKind;
  if (!caches.has(cacheKey)) caches.set(cacheKey, new Set());
  caches.get(cacheKey).add(canvas);
  paint(canvas, safeKind, npc);
  return canvas;
}
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
    { id: "wisp", name: "Светляк-дух", width: 32, height: 32, threat: "Высокая" }
  ];
}
