import { createCharacterSprite, getCharacterDefinitions } from "./character-sprites.js?v=pixel-polish-3";
import { PixelWorldRenderer, WORLD_SIZE } from "./world-renderer.js?v=pixel-polish-3";

const gallery = document.querySelector("#characterGallery");
const selector = document.querySelector("#characterSelect");
const zoomSelector = document.querySelector("#zoomSelect");
const canvas = document.querySelector("#worldCanvas");
const chunkStatus = document.querySelector("#chunkStatus");
const coords = document.querySelector("#worldCoords");
const seedLabel = document.querySelector("#worldSeed");

for (const character of getCharacterDefinitions()) {
  const card = document.createElement("article");
  card.className = "character-card";
  const stage = document.createElement("div");
  stage.className = "sprite-stage";
  const sprite = createCharacterSprite(character.id);
  // Enlarge the 24×28 sprite without smoothing for a crisp preview.
  sprite.style.width = "96px";
  sprite.style.height = "112px";
  sprite.setAttribute("role", "img");
  sprite.setAttribute("aria-label", character.name);
  stage.append(sprite);
  const title = document.createElement("h3");
  title.textContent = character.name;
  const description = document.createElement("p");
  description.textContent = character.role;
  card.append(stage, title, description);
  gallery.append(card);
}

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
