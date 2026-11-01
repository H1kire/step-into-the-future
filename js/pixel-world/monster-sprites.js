const VERSION = "poster-monsters-1";
const monsterAtlas = new Image();
monsterAtlas.src = new URL("../../assets/pixel-world/monsters-poster.webp?v=" + VERSION, import.meta.url).href;
const legacyAtlas = new Image();
legacyAtlas.src = new URL("../../assets/pixel-world/monsters.svg?v=" + VERSION, import.meta.url).href;
const npcAtlas = new Image();
npcAtlas.src = new URL("../../assets/pixel-world/npcs.svg?v=" + VERSION, import.meta.url).href;
const POSTER_MONSTERS = ["slime","skeleton","goblin","wolf","spider","zombie","orc","goblin-archer","lizard","spider-warrior","rat","ratman","spider-boss","skeleton-mage","ghost","demon","golem","slime-king","necromancer","dragonling"];
const LEGACY_MONSTERS = ["bat","mushroom","bandit","wisp"];
const MONSTERS = [...POSTER_MONSTERS, ...LEGACY_MONSTERS];
const NPCS = ["merchant", "priest", "blacksmith", "doctor", "traveler"];
const caches = new Map();

function paint(canvas, kind, npc = false) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (npc) {
    const index = NPCS.indexOf(kind);
    if (index >= 0 && npcAtlas.complete && npcAtlas.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(npcAtlas, index * 32, 0, 32, 32, 0, 0, canvas.width, canvas.height);
    }
    return;
  }
  const posterIndex = POSTER_MONSTERS.indexOf(kind);
  if (posterIndex >= 0 && monsterAtlas.complete && monsterAtlas.naturalWidth) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(monsterAtlas, (posterIndex % 5) * 24, Math.floor(posterIndex / 5) * 24, 24, 24, 0, 0, canvas.width, canvas.height);
    return;
  }
  const legacyIndex = LEGACY_MONSTERS.indexOf(kind);
  if (legacyIndex >= 0 && legacyAtlas.complete && legacyAtlas.naturalWidth) {
    const oldIndex = ["slime","goblin","wolf","golem","skeleton","bat","mushroom","bandit","wisp","spider","zombie","orc"].indexOf(kind);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(legacyAtlas, oldIndex * 32, 0, 32, 32, 0, 0, canvas.width, canvas.height);
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
function repaintAtlas(atlas, kinds, npc = false) {
  for (const kind of kinds) for (const canvas of caches.get((npc ? "npc:" : "monster:") + kind) || []) paint(canvas, kind, npc);
}
monsterAtlas.addEventListener("load", () => repaintAtlas(monsterAtlas, POSTER_MONSTERS));
legacyAtlas.addEventListener("load", () => repaintAtlas(legacyAtlas, LEGACY_MONSTERS));
npcAtlas.addEventListener("load", () => repaintAtlas(npcAtlas, NPCS, true));
export function createMonsterSprite(kind, scale = 1) { return create(kind, scale, false); }
export function createNpcSprite(kind, scale = 1) { return create(kind, scale, true); }
export function getMonsterDefinitions() {
  return [
  {
    "id": "slime",
    "name": "Лесной слизень",
    "width": 32,
    "height": 32,
    "threat": "Низкая"
  },
  {
    "id": "skeleton",
    "name": "Скелет-страж",
    "width": 32,
    "height": 32,
    "threat": "Средняя"
  },
  {
    "id": "goblin",
    "name": "Лесной гоблин",
    "width": 32,
    "height": 32,
    "threat": "Низкая"
  },
  {
    "id": "wolf",
    "name": "Теневой волк",
    "width": 32,
    "height": 32,
    "threat": "Средняя"
  },
  {
    "id": "spider",
    "name": "Пещерный паук",
    "width": 32,
    "height": 32,
    "threat": "Средняя"
  },
  {
    "id": "zombie",
    "name": "Лесной зомби",
    "width": 32,
    "height": 32,
    "threat": "Средняя"
  },
  {
    "id": "orc",
    "name": "Орк-воин",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  },
  {
    "id": "goblin-archer",
    "name": "Гоблин-лучник",
    "width": 32,
    "height": 32,
    "threat": "Средняя"
  },
  {
    "id": "lizard",
    "name": "Ящер",
    "width": 32,
    "height": 32,
    "threat": "Средняя"
  },
  {
    "id": "spider-warrior",
    "name": "Паук-воин",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  },
  {
    "id": "rat",
    "name": "Крыса",
    "width": 32,
    "height": 32,
    "threat": "Низкая"
  },
  {
    "id": "ratman",
    "name": "Крысолюд",
    "width": 32,
    "height": 32,
    "threat": "Средняя"
  },
  {
    "id": "spider-boss",
    "name": "Паук-босс",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  },
  {
    "id": "skeleton-mage",
    "name": "Скелет-маг",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  },
  {
    "id": "ghost",
    "name": "Призрак",
    "width": 32,
    "height": 32,
    "threat": "Средняя"
  },
  {
    "id": "demon",
    "name": "Демон",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  },
  {
    "id": "golem",
    "name": "Каменный голем",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  },
  {
    "id": "slime-king",
    "name": "Слизневый король",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  },
  {
    "id": "necromancer",
    "name": "Некромант",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  },
  {
    "id": "dragonling",
    "name": "Дракончик",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  },
  {
    "id": "bat",
    "name": "Пещерная летучая мышь",
    "width": 32,
    "height": 32,
    "threat": "Низкая"
  },
  {
    "id": "mushroom",
    "name": "Грибной страж",
    "width": 32,
    "height": 32,
    "threat": "Средняя"
  },
  {
    "id": "bandit",
    "name": "Дорожный разбойник",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  },
  {
    "id": "wisp",
    "name": "Светляк-дух",
    "width": 32,
    "height": 32,
    "threat": "Высокая"
  }
];
}
