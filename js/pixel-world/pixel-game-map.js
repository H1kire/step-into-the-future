import { PixelWorldRenderer } from "./world-renderer.js";
import { createCharacterSprite } from "./character-sprites.js";
import { createMonsterSprite, createNpcSprite } from "./monster-sprites.js";

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
    const key = entity.type === "monster" ? `monster:${entity.imageKey}` : `npc:${entity.type}`;
    if (!spriteCache.has(key)) {
      spriteCache.set(key, entity.type === "monster"
        ? createMonsterSprite(entity.imageKey)
        : createNpcSprite(entity.type));
    }
    return spriteCache.get(key);
  }

  function refresh() {
    const api = window.GamePixelAPI;
    if (!api) { requestAnimationFrame(refresh); return; }
    const snapshot = api.getSnapshot();
    const classId = snapshot.character || "classless";
    if (classId !== activeCharacter) {
      activeCharacter = classId;
      world.setCharacter(classId);
    }
    const entities = (snapshot.monsters || []).map(monster => ({
      ...monster, type: "monster", sprite: spriteFor({ ...monster, type: "monster" }), width: 16, height: 20
    }));
    if (snapshot.merchant) entities.push({ ...snapshot.merchant, type: "merchant", sprite: spriteFor({ type: "merchant" }), width: 16, height: 20 });
    if (snapshot.priest) entities.push({ ...snapshot.priest, type: "priest", sprite: spriteFor({ type: "priest" }), width: 16, height: 20 });
    world.setEntities(entities, entity => {
      if (entity.type === "monster") api.selectMonster(entity.id);
      else api.selectActor(entity.type);
    });
    requestAnimationFrame(refresh);
  }

  const initial = () => {
    const api = window.GamePixelAPI;
    if (api) {
      const snapshot = api.getSnapshot();
      world.setPosition(snapshot.player.x, snapshot.player.y);
      world.setCharacter(snapshot.character || "classless");
    }
    refresh();
  };
  initial();
  window.addEventListener("resize", () => world.resize());
  window.addEventListener("pagehide", () => world.destroy(), { once: true });
  window.pixelGameWorld = world;
}
