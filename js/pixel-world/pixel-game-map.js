import { PixelWorldRenderer } from "./world-renderer.js?v=poster-terrain-1";
import { createCharacterSprite } from "./character-sprites.js?v=pixel-atlas-9";
import { createMonsterSprite, createNpcSprite } from "./monster-sprites.js?v=poster-monsters-1";

window.PixelSprites = { createCharacterSprite, createMonsterSprite, createNpcSprite };

const canvas = document.querySelector("#pixelGameCanvas");
if (canvas) {
  const world = new PixelWorldRenderer(canvas, {
    worldSize: 2400,
    speed: 85,
    seed: 284731,
    onMove: (x, y) => {
      const now = performance.now();
      if (now - lastMoveSent < 100) return;
      lastMoveSent = now;
      window.GamePixelAPI?.moveToWorld(x, y);
    }
  });
  let lastMoveSent = 0;
  let activeCharacter = "";
  const spriteCache = new Map();

  function spriteFor(entity) {
    const key = entity.type === "monster" ? `monster:${entity.imageKey}` : entity.type === "player" ? `player:${entity.classId}` : `npc:${entity.type}`;
    if (!spriteCache.has(key)) {
      spriteCache.set(key, entity.type === "monster"
        ? createMonsterSprite(entity.imageKey)
        : entity.type === "player" ? createCharacterSprite(entity.classId || "adventurer") : createNpcSprite(entity.type));
    }
    return spriteCache.get(key);
  }

  let lastEntitySignature = '';
  function refreshEntities() {
    const api = window.GamePixelAPI;
    if (!api) return;
    const snapshot = api.getSnapshot();
    const classId = snapshot.character || "classless";
    if (classId !== activeCharacter) { activeCharacter = classId; world.setCharacter(classId); }
    const monsters = snapshot.monsters || [];
    const signature = [classId,
      ...monsters.map(monster => `${monster.id}:${monster.x}:${monster.y}:${monster.imageKey}:${monster.elite ? 1 : 0}:${monster.eliteKey || 'common'}`),
      ...(snapshot.players||[]).map(player => `player:${player.id}:${player.x}:${player.y}:${player.classId}`),
      snapshot.merchant ? `merchant:${snapshot.merchant.x}:${snapshot.merchant.y}` : '',
      snapshot.priest ? `priest:${snapshot.priest.x}:${snapshot.priest.y}` : ''
    ].join('|');
    if (signature === lastEntitySignature) return;
    lastEntitySignature = signature;
    const entities = monsters.map(monster => ({ ...monster, type: "monster", elite: !!monster.elite, eliteKey: monster.eliteKey || "common", sprite: spriteFor({ imageKey: monster.imageKey, type: "monster" }), width: 16, height: 20 }));
    for (const player of snapshot.players || []) entities.push({ ...player, type: "player", sprite: spriteFor({ type: "player", classId: player.classId }), width: 16, height: 20 });
    if (snapshot.merchant) entities.push({ ...snapshot.merchant, type: "merchant", sprite: spriteFor({ type: "merchant" }), width: 16, height: 20 });
    if (snapshot.priest) entities.push({ ...snapshot.priest, type: "priest", sprite: spriteFor({ type: "priest" }), width: 16, height: 20 });
    world.setEntities(entities, entity => {
      if (entity.type === "monster") api.selectMonster(entity.id);
      else api.selectActor(entity.type);
    });
  }

  const initial = () => {
    const api = window.GamePixelAPI;
    if (api) {
      const snapshot = api.getSnapshot();
      world.setPosition(snapshot.player.x, snapshot.player.y);
      world.setCharacter(snapshot.character || "classless");
    }
    refreshEntities();
  };
  initial();
  const entityRefreshTimer = window.setInterval(refreshEntities, 250);
  window.addEventListener("resize", () => world.resize());
  window.addEventListener("pagehide", () => { window.clearInterval(entityRefreshTimer); world.destroy(); }, { once: true });
  window.pixelGameWorld = world;
}
