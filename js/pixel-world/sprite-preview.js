import { createCharacterSprite, getCharacterDefinitions } from "./character-sprites.js?v=pixel-atlas-2";
import { createMonsterSprite, createNpcSprite, getMonsterDefinitions } from "./monster-sprites.js?v=pixel-atlas-2";
import { PixelWorldRenderer, WORLD_SIZE } from "./world-renderer.js?v=pixel-atlas-2";

function addSpriteCard(container, name, description, sprite, kind = "character") {
  const card = document.createElement("article");
  card.className = "character-card";
  const stage = document.createElement("div");
  stage.className = "sprite-stage";
  const image = document.createElement("div");
  image.className = "sprite-image";
  image.append(sprite);
  sprite.style.width = kind === "character" ? "96px" : "84px";
  sprite.style.height = "auto";
  sprite.style.imageRendering = "pixelated";
  sprite.setAttribute("role", "img");
  sprite.setAttribute("aria-label", name);
  stage.append(image);
  const title = document.createElement("h3");
  title.textContent = name;
  const detail = document.createElement("p");
  detail.textContent = description;
  card.append(stage, title, detail);
  container.append(card);
}

const characterGallery = document.querySelector("#characterGallery");
for (const character of getCharacterDefinitions()) {
  addSpriteCard(characterGallery, character.name, character.role, createCharacterSprite(character.id));
}

const monsterGallery = document.querySelector("#monsterGallery");
for (const monster of getMonsterDefinitions()) {
  addSpriteCard(monsterGallery, monster.name, `Угроза: ${monster.threat}`, createMonsterSprite(monster.id), "monster");
}

const npcGallery = document.querySelector("#npcGallery");
for (const npc of [
  { id: "merchant", name: "Торговец", role: "Товары, снаряжение и припасы" },
  { id: "priest", name: "Священник", role: "Поддержка и восстановление" },
  { id: "blacksmith", name: "Кузнец", role: "Ремонт и улучшение экипировки" }
]) {
  addSpriteCard(npcGallery, npc.name, npc.role, createNpcSprite(npc.id), "npc");
}

const selector = document.querySelector("#characterSelect");
const zoomSelector = document.querySelector("#zoomSelect");
const canvas = document.querySelector("#worldCanvas");
const chunkStatus = document.querySelector("#chunkStatus");
const coords = document.querySelector("#worldCoords");
const seedLabel = document.querySelector("#worldSeed");
const world = new PixelWorldRenderer(canvas);
world.setZoom(zoomSelector.value);
seedLabel.textContent = `Seed: ${world.seed}`;
selector.addEventListener("change", () => world.setCharacter(selector.value));
zoomSelector.addEventListener("change", () => world.setZoom(zoomSelector.value));
document.querySelector("#centerWorld").addEventListener("click", () => world.centerOnPlayer());
document.querySelector("#regenWorld").addEventListener("click", () => {
  world.newSeed();
  seedLabel.textContent = `Seed: ${world.seed}`;
});
function updateReadout() {
  const x = Number(canvas.dataset.worldX || WORLD_SIZE / 2);
  const y = Number(canvas.dataset.worldY || WORLD_SIZE / 2);
  coords.textContent = `X: ${x.toLocaleString("ru-RU")} · Y: ${y.toLocaleString("ru-RU")}`;
  chunkStatus.textContent = `Видно: ${canvas.dataset.visibleChunks || 0} · в кэше: ${canvas.dataset.cachedChunks || 0}`;
  requestAnimationFrame(updateReadout);
}
requestAnimationFrame(updateReadout);
