import { createCharacterSprite } from "./character-sprites.js";

export const WORLD_SIZE = 100_000;
export const TILE_SIZE = 16;
export const CHUNK_TILES = 16;
export const CHUNK_SIZE = TILE_SIZE * CHUNK_TILES;
const PALETTE = {
  grass: ["#4d7c48", "#56864d", "#628f53", "#3f6d43", "#71985b"],
  forest: ["#244c39", "#2d5a3e", "#376543", "#1e4235"],
  sand: ["#b99b5d", "#c9ad70", "#d5bb7d", "#a9894f"],
  water: ["#326d8a", "#397b98", "#2e607e", "#478ba3"],
  stone: ["#747f7b", "#858f88", "#626e6d", "#a0a49a"]
};

function hash2(x, y, seed) {
  let n = Math.imul(x ^ seed, 0x45d9f3b) ^ Math.imul(y + seed, 0x119de1f3);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x, y, seed, scale) {
  const gx = Math.floor(x / scale), gy = Math.floor(y / scale);
  const fx = (x / scale) - gx, fy = (y / scale) - gy;
  const fade = t => t * t * (3 - 2 * t);
  const a = hash2(gx, gy, seed), b = hash2(gx + 1, gy, seed);
  const c = hash2(gx, gy + 1, seed), d = hash2(gx + 1, gy + 1, seed);
  const top = a + (b - a) * fade(fx), bottom = c + (d - c) * fade(fx);
  return top + (bottom - top) * fade(fy);
}

function terrainAt(tx, ty, seed) {
  const broad = smoothNoise(tx, ty, seed, 42);
  const detail = smoothNoise(tx, ty, seed ^ 0x5f3759df, 13);
  const fine = hash2(tx, ty, seed ^ 0x1234567);
  const elevation = broad * 0.72 + detail * 0.28;
  if (elevation < 0.27) return "water";
  if (elevation < 0.33) return "sand";
  if (elevation > 0.72 && fine > 0.48) return "stone";
  if (detail > 0.67 || (broad > 0.56 && fine > 0.35)) return "forest";
  return "grass";
}

function drawTile(ctx, tx, ty, seed) {
  const terrain = terrainAt(tx, ty, seed);
  const colors = PALETTE[terrain];
  const base = colors[Math.floor(hash2(tx, ty, seed + 7) * colors.length)];
  const x = tx * TILE_SIZE, y = ty * TILE_SIZE;
  ctx.fillStyle = base; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Small clusters of single-pixel color accents make the surface read as pixel art.
  const r = hash2(tx, ty, seed + 19);
  ctx.fillStyle = colors[(Math.floor(r * 11) + 1) % colors.length];
  if (terrain === "grass") {
    ctx.fillRect(x + 3, y + 4, 2, 1); ctx.fillRect(x + 10, y + 11, 1, 2);
    if (r > 0.6) { ctx.fillRect(x + 7, y + 2, 1, 1); ctx.fillRect(x + 13, y + 6, 1, 1); }
  } else if (terrain === "forest") {
    ctx.fillRect(x + 3, y + 3, 8, 2); ctx.fillRect(x + 5, y + 5, 5, 5);
    ctx.fillStyle = "#18382f"; ctx.fillRect(x + 7, y + 10, 2, 4);
  } else if (terrain === "water") {
    ctx.fillRect(x + 2, y + 5, 5, 1); ctx.fillRect(x + 9, y + 11, 4, 1);
    if (r > 0.7) { ctx.fillStyle = "#7cb4c0"; ctx.fillRect(x + 4, y + 9, 3, 1); }
  } else if (terrain === "sand") {
    ctx.fillRect(x + 4, y + 3, 1, 1); ctx.fillRect(x + 11, y + 9, 2, 1);
  } else {
    ctx.fillRect(x + 3, y + 5, 8, 3); ctx.fillStyle = "#515d60"; ctx.fillRect(x + 6, y + 8, 5, 3);
  }
}

export class PixelWorldRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.seed = options.seed ?? Math.floor(Math.random() * 0x7fffffff);
    this.camera = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
    this.zoom = 1.5;
    this.player = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
    this.character = "adventurer";
    this.visibleChunks = new Set();
    this.chunkCache = new Map();
    this.maxCachedChunks = 160;
    this.keys = new Set();
    this.destination = null;
    this.lastTime = 0;
    this.sprite = createCharacterSprite(this.character);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.bindInput();
    this.frame = requestAnimationFrame(time => this.tick(time));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.imageSmoothingEnabled = false;
    this.dpr = dpr;
  }

  setCharacter(type) {
    this.character = type;
    this.sprite = createCharacterSprite(type);
  }

  setZoom(value) { this.zoom = Math.max(0.7, Math.min(3.5, Number(value) || 1.5)); }

  newSeed() {
    this.seed = Math.floor(Math.random() * 0x7fffffff);
    this.chunkCache.clear();
  }

  centerOnPlayer() { this.camera.x = this.player.x; this.camera.y = this.player.y; }

  bindInput() {
    this.canvas.addEventListener("click", event => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = (event.clientX - rect.left) * this.dpr;
      const sy = (event.clientY - rect.top) * this.dpr;
      this.destination = {
        x: this.clampWorld(this.camera.x + (sx - this.canvas.width / 2) / (this.zoom * this.dpr)),
        y: this.clampWorld(this.camera.y + (sy - this.canvas.height / 2) / (this.zoom * this.dpr))
      };
    });
    this.canvas.addEventListener("wheel", event => {
      event.preventDefault();
      this.setZoom(this.zoom * (event.deltaY < 0 ? 1.12 : 0.89));
    }, { passive: false });
    window.addEventListener("keydown", event => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"].includes(event.key)) {
        if (!event.target.closest("input,select,textarea,button")) event.preventDefault();
        this.keys.add(event.key.toLowerCase());
      }
    });
    window.addEventListener("keyup", event => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener("blur", () => this.keys.clear());
  }

  clampWorld(value) { return Math.max(0, Math.min(WORLD_SIZE - 1, value)); }

  chunkCanvas(cx, cy) {
    const key = `${cx},${cy},${this.seed}`;
    if (this.chunkCache.has(key)) {
      const canvas = this.chunkCache.get(key);
      this.chunkCache.delete(key); this.chunkCache.set(key, canvas);
      return canvas;
    }
    const canvas = document.createElement("canvas");
    canvas.width = CHUNK_SIZE; canvas.height = CHUNK_SIZE;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        drawTile(ctx, cx * CHUNK_TILES + tx, cy * CHUNK_TILES + ty, this.seed);
      }
    }
    this.chunkCache.set(key, canvas);
    while (this.chunkCache.size > this.maxCachedChunks) this.chunkCache.delete(this.chunkCache.keys().next().value);
    return canvas;
  }

  tick(time) {
    const dt = Math.min(0.05, (time - (this.lastTime || time)) / 1000);
    this.lastTime = time;
    this.update(dt);
    this.render();
    this.frame = requestAnimationFrame(next => this.tick(next));
  }

  update(dt) {
    const speed = 180;
    let dx = 0, dy = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) dx -= 1;
    if (this.keys.has("arrowright") || this.keys.has("d")) dx += 1;
    if (this.keys.has("arrowup") || this.keys.has("w")) dy -= 1;
    if (this.keys.has("arrowdown") || this.keys.has("s")) dy += 1;
    if (dx || dy) {
      const length = Math.hypot(dx, dy) || 1;
      this.player.x = this.clampWorld(this.player.x + dx / length * speed * dt);
      this.player.y = this.clampWorld(this.player.y + dy / length * speed * dt);
      this.destination = null;
    } else if (this.destination) {
      const vx = this.destination.x - this.player.x, vy = this.destination.y - this.player.y;
      const distance = Math.hypot(vx, vy);
      if (distance < 3) this.destination = null;
      else {
        const step = Math.min(distance, speed * dt);
        this.player.x = this.clampWorld(this.player.x + vx / distance * step);
        this.player.y = this.clampWorld(this.player.y + vy / distance * step);
      }
    }
    this.camera.x += (this.player.x - this.camera.x) * Math.min(1, dt * 8);
    this.camera.y += (this.player.y - this.camera.y) * Math.min(1, dt * 8);
  }

  render() {
    const ctx = this.ctx, dpr = this.dpr, zoom = this.zoom * dpr;
    const width = this.canvas.width, height = this.canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#244b3e"; ctx.fillRect(0, 0, width, height);
    const viewW = width / zoom, viewH = height / zoom;
    const left = this.camera.x - viewW / 2, top = this.camera.y - viewH / 2;
    const minCx = Math.max(0, Math.floor(left / CHUNK_SIZE));
    const maxCx = Math.min(Math.ceil(WORLD_SIZE / CHUNK_SIZE) - 1, Math.floor((left + viewW) / CHUNK_SIZE));
    const minCy = Math.max(0, Math.floor(top / CHUNK_SIZE));
    const maxCy = Math.min(Math.ceil(WORLD_SIZE / CHUNK_SIZE) - 1, Math.floor((top + viewH) / CHUNK_SIZE));
    this.visibleChunks.clear();
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = `${cx},${cy}`;
        this.visibleChunks.add(key);
        const chunk = this.chunkCanvas(cx, cy);
        const sx = (cx * CHUNK_SIZE - left) * zoom;
        const sy = (cy * CHUNK_SIZE - top) * zoom;
        ctx.drawImage(chunk, Math.round(sx), Math.round(sy), Math.ceil(CHUNK_SIZE * zoom), Math.ceil(CHUNK_SIZE * zoom));
      }
    }
    const px = (this.player.x - left) * zoom, py = (this.player.y - top) * zoom;
    // Hard-edged pixel shadow, sprite and ground-facing highlight.
    ctx.fillStyle = "#17211c"; ctx.fillRect(Math.round(px - 6 * zoom), Math.round(py + 7 * zoom), Math.ceil(12 * zoom), Math.ceil(3 * zoom));
    const sw = SPRITE_DRAW_SIZE * zoom, sh = SPRITE_DRAW_HEIGHT * zoom;
    ctx.drawImage(this.sprite, Math.round(px - sw / 2), Math.round(py - sh / 2), Math.round(sw), Math.round(sh));
    if (this.destination) {
      ctx.strokeStyle = "#fff0a3"; ctx.lineWidth = Math.max(1, zoom * 0.7);
      ctx.strokeRect(Math.round((this.destination.x - left) * zoom - 4 * zoom), Math.round((this.destination.y - top) * zoom - 4 * zoom), Math.round(8 * zoom), Math.round(8 * zoom));
    }
    this.canvas.dataset.visibleChunks = String(this.visibleChunks.size);
    this.canvas.dataset.cachedChunks = String(this.chunkCache.size);
    this.canvas.dataset.worldX = String(Math.round(this.player.x));
    this.canvas.dataset.worldY = String(Math.round(this.player.y));
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
  }
}

const SPRITE_DRAW_SIZE = 16;
const SPRITE_DRAW_HEIGHT = 20;
