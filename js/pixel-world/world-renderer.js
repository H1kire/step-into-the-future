import { createCharacterSprite } from "./character-sprites.js?v=elite-map-10";
import { createAmbientSprite } from "./ambient-sprites.js?v=ambient-sheet-1";

export const WORLD_SIZE = 100_000;
export const TILE_SIZE = 32;
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

function drawTile(ctx, tx, ty, seed, atlas) {
  const terrain = terrainAt(tx, ty, seed);
  const r = hash2(tx, ty, seed + 19);
  const x = tx * TILE_SIZE, y = ty * TILE_SIZE;
  if (atlas && atlas.complete && atlas.naturalWidth) {
    const adjacentWater = terrain === "sand" && (
      terrainAt(tx + 1, ty, seed) === "water" || terrainAt(tx - 1, ty, seed) === "water" ||
      terrainAt(tx, ty + 1, seed) === "water" || terrainAt(tx, ty - 1, seed) === "water"
    );
    let index;
    if (adjacentWater) index = r > 0.5 ? 5 : 11;
    else if (terrain === "water") index = r > 0.75 ? 16 : (r > 0.45 ? 10 : (r > 0.2 ? 15 : 4));
    else if (terrain === "sand") index = r > 0.5 ? 6 : (r > 0.25 ? 17 : 2);
    else if (terrain === "stone") index = r > 0.65 ? 14 : (r > 0.3 ? 9 : 3);
    else if (terrain === "forest") index = r > 0.72 ? 8 : (r > 0.35 ? 13 : 1);
    else index = r > 0.8 ? 12 : (r > 0.4 ? 8 : 0);
    ctx.drawImage(atlas, (index % 6) * 24, Math.floor(index / 6) * 24, 24, 24, x, y, TILE_SIZE, TILE_SIZE);
    return;
  }
  const colors = PALETTE[terrain];
  const pick = n => colors[Math.floor(hash2(tx * 7 + n, ty * 11 - n, seed + 7) * colors.length)];
  ctx.fillStyle = pick(1); ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = "rgba(255,255,255,.055)"; ctx.fillRect(x, y, TILE_SIZE, 1); ctx.fillRect(x, y, 1, TILE_SIZE);
  ctx.fillStyle = "rgba(8,18,22,.12)"; ctx.fillRect(x, y + 15, TILE_SIZE, 1); ctx.fillRect(x + 15, y, 1, TILE_SIZE);
  if (terrain === "grass") {
    ctx.fillStyle = "#315c3d"; ctx.fillRect(x + 3, y + 11, 3, 2);
    ctx.fillStyle = "#86a967"; ctx.fillRect(x + 3, y + 4, 3, 1); ctx.fillRect(x + 11, y + 9, 2, 1);
    ctx.fillStyle = "#a3bd76"; ctx.fillRect(x + 4, y + 3, 1, 1); ctx.fillRect(x + 12, y + 8, 1, 1);
    ctx.fillStyle = "#3d7146"; ctx.fillRect(x + 8, y + 2, 1, 3); ctx.fillRect(x + 9, y + 4, 2, 1);
    if (r > .58) { const fx=x+2+Math.floor(r*10)%11, fy=y+3+Math.floor(r*7)%9; ctx.fillStyle=r>.82?"#f1d98a":"#e8e4cb"; ctx.fillRect(fx,fy,1,1); ctx.fillStyle="#4c8b4d"; ctx.fillRect(fx,fy+1,1,2); }
    if (r < .16) { ctx.fillStyle = "#b2c78a"; ctx.fillRect(x + 12, y + 3, 2, 1); }
  } else if (terrain === "forest") {
    ctx.fillStyle="#163c31";ctx.fillRect(x+2,y+4,12,10);ctx.fillStyle="#24543b";ctx.fillRect(x+3,y+2,10,10);
    ctx.fillStyle="#347044";ctx.fillRect(x+4,y+3,8,8);ctx.fillStyle="#477f4b";ctx.fillRect(x+5,y+3,5,4);
    ctx.fillStyle="#6b9856";ctx.fillRect(x+5,y+3,3,2);ctx.fillStyle="#8dad61";ctx.fillRect(x+6,y+3,2,1);
    ctx.fillStyle="#1b4635";ctx.fillRect(x+9,y+7,3,4);ctx.fillStyle="#2b5b3b";ctx.fillRect(x+4,y+11,8,3);
    ctx.fillStyle="#6e6040";ctx.fillRect(x+7,y+12,3,3);ctx.fillStyle="#4c4935";ctx.fillRect(x+8,y+12,1,3);
    if(r>.62){ctx.fillStyle="#9bb96d";ctx.fillRect(x+4,y+6,2,1);}
  } else if (terrain === "water") {
    ctx.fillStyle="#24536f";ctx.fillRect(x,y+12,16,4);ctx.fillStyle="#4386a0";ctx.fillRect(x+2,y+3,6,1);ctx.fillRect(x+9,y+8,5,1);
    ctx.fillStyle="#74b5c4";ctx.fillRect(x+3,y+2,4,1);ctx.fillRect(x+10,y+7,3,1);ctx.fillStyle="#2d6b88";ctx.fillRect(x+1,y+6,3,1);ctx.fillRect(x+7,y+13,5,1);
    if(r>.7){ctx.fillStyle="#b0d9d9";ctx.fillRect(x+5,y+9,2,1);}
    if(terrainAt(tx+1,ty,seed)==="sand"){ctx.fillStyle="#d5c18a";ctx.fillRect(x+14,y+1,2,14);}
    if(terrainAt(tx-1,ty,seed)==="sand"){ctx.fillStyle="#d5c18a";ctx.fillRect(x,y+2,1,12);}
  } else if (terrain === "sand") {
    ctx.fillStyle="#9e804b";ctx.fillRect(x+3,y+5,3,2);ctx.fillRect(x+10,y+11,2,1);ctx.fillStyle="#e0c78c";ctx.fillRect(x+2,y+3,2,1);ctx.fillRect(x+9,y+7,3,1);
    ctx.fillStyle="#f0dca2";ctx.fillRect(x+3,y+3,1,1);ctx.fillRect(x+10,y+6,1,1);ctx.fillStyle="#b59a60";ctx.fillRect(x+5,y+13,5,1);
    if(r>.78){ctx.fillStyle="#927747";ctx.fillRect(x+12,y+3,2,2);ctx.fillStyle="#d9bd7c";ctx.fillRect(x+12,y+3,1,1);}
  } else {
    ctx.fillStyle="#4d5b5c";ctx.fillRect(x+2,y+7,12,7);ctx.fillStyle="#626f6f";ctx.fillRect(x+4,y+4,9,8);
    ctx.fillStyle="#89968d";ctx.fillRect(x+5,y+4,6,4);ctx.fillStyle="#b0b8a5";ctx.fillRect(x+6,y+4,3,2);
    ctx.fillStyle="#77837d";ctx.fillRect(x+3,y+9,4,3);ctx.fillStyle="#3c4b50";ctx.fillRect(x+8,y+10,5,3);
    ctx.fillStyle="#d3c39a";ctx.fillRect(x+7,y+6,2,1);ctx.fillStyle="#4e5b5c";ctx.fillRect(x+6,y+13,7,1);
  }
}
export class PixelWorldRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
    this.seed = options.seed ?? Math.floor(Math.random() * 0x7fffffff);
    this.terrainAtlas = new Image();
    this.terrainAtlas.addEventListener("load", () => this.chunkCache.clear());
    this.terrainAtlas.src = new URL("../../assets/pixel-world/terrain-poster.webp?v=poster-terrain-1", import.meta.url).href;
    this.propsAtlas = new Image();
    this.propsAtlas.addEventListener("load", () => this.chunkCache.clear());
    this.propsAtlas.src = new URL("../../assets/pixel-world/props.svg?v=elite-map-10", import.meta.url).href;
    this.worldSize = options.worldSize ?? WORLD_SIZE;
    this.speed = options.speed ?? 180;
    this.onMove = options.onMove ?? null;
    this.onEntityClick = null;
    this.entities = [];
    this.camera = { x: this.worldSize / 2, y: this.worldSize / 2 };
    // Keep the player's chosen camera distance across reloads, including cloud-save reloads.
    let savedZoom = null;
    try {
      const storedZoom = localStorage.getItem("pixel-world-camera-zoom-v1");
      if (storedZoom !== null) savedZoom = Number(storedZoom);
    } catch {}
    this.zoom = Number.isFinite(savedZoom) && savedZoom > 0
      ? Math.max(0.42, Math.min(2.4, savedZoom))
      : 0.82;
    this.player = { x: this.worldSize / 2, y: this.worldSize / 2 };
    this.character = "adventurer";
    this.visibleChunkCount = 0;
    this.lastDebugStats = '';
    this.destroyed = false;
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
    this.onVisibilityChange = () => {
      if (document.hidden) { cancelAnimationFrame(this.frame); this.frame = 0; this.keys.clear(); this.lastTime = 0; }
      else if (!this.destroyed && !this.frame) { this.lastTime = 0; this.frame = requestAnimationFrame(time => this.tick(time)); }
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    if (!document.hidden) this.frame = requestAnimationFrame(time => this.tick(time));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (this.canvas.width === width && this.canvas.height === height && this.dpr === dpr) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
    this.dpr = dpr;
  }

  setCharacter(type) {
    this.character = type;
    this.sprite = createCharacterSprite(type);
  }

  setPosition(x, y) {
    this.player.x = this.clampWorld(Number(x));
    this.player.y = this.clampWorld(Number(y));
    this.centerOnPlayer();
  }

  setEntities(entities, onEntityClick = null) {
    this.entities = Array.isArray(entities) ? entities : [];
    this.onEntityClick = onEntityClick;
  }

  setZoom(value) {
    this.zoom = Math.max(0.42, Math.min(2.4, Number(value) || 0.82));
    try { localStorage.setItem("pixel-world-camera-zoom-v1", String(this.zoom)); } catch {}
  }

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
      const clickX = this.camera.x + (sx - this.canvas.width / 2) / (this.zoom * this.dpr);
      const clickY = this.camera.y + (sy - this.canvas.height / 2) / (this.zoom * this.dpr);
      const target = [...this.entities].reverse().find(entity => Math.abs(entity.x - clickX) <= 22 && Math.abs(entity.y - clickY) <= 24);
      if (target && this.onEntityClick) { this.onEntityClick(target); return; }
      this.destination = {
        x: this.clampWorld(this.camera.x + (sx - this.canvas.width / 2) / (this.zoom * this.dpr)),
        y: this.clampWorld(this.camera.y + (sy - this.canvas.height / 2) / (this.zoom * this.dpr))
      };
    });
    this.canvas.addEventListener("wheel", event => {
      event.preventDefault();
      this.setZoom(this.zoom * (event.deltaY < 0 ? 1.12 : 0.89));
    }, { passive: false });
    this.canvas.tabIndex = 0;
    this.canvas.addEventListener("pointerdown", () => this.canvas.focus({ preventScroll: true }));
    const movementKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);
    const isTypingTarget = target => target instanceof Element && !!target.closest("input,select,textarea,button,[contenteditable='true']");
    document.addEventListener("keydown", event => {
      const key = event.key.toLowerCase();
      if (!movementKeys.has(key) || isTypingTarget(event.target)) return;
      event.preventDefault();
      this.keys.add(key);
    }, true);
    document.addEventListener("keyup", event => this.keys.delete(event.key.toLowerCase()), true);
    window.addEventListener("blur", () => this.keys.clear());
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.keys.clear(); });
  }

  clampWorld(value) { return Math.max(0, Math.min(this.worldSize - 1, value)); }

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
        const wx = cx * CHUNK_TILES + tx, wy = cy * CHUNK_TILES + ty;
        drawTile(ctx, wx, wy, this.seed, this.terrainAtlas);
      }
    }
    for (let ty = 0; ty < CHUNK_TILES; ty++) {
      for (let tx = 0; tx < CHUNK_TILES; tx++) {
        const wx = cx * CHUNK_TILES + tx, wy = cy * CHUNK_TILES + ty;
        const terrain = terrainAt(wx, wy, this.seed);
        const roll = hash2(wx, wy, this.seed + 901);
        if (terrain === "water") continue;
        let kind = null;
        if (terrain === "grass" || terrain === "forest") {
          if (roll > .99975) kind = "fox";
          else if (roll > .9995) kind = "chicken";
          else if (roll > .9992) kind = "cow";
          else if (roll > .9985) kind = "shrine";
          else if (roll > .9978) kind = "banner";
          else if (roll > .997) kind = "wagon";
          else if (roll > .996) kind = "chest";
          else if (roll > .994) kind = "campfire";
          else if (roll > .992) kind = "lantern";
          else if (roll > .99) kind = "sign";
          else if (roll > .987) kind = "fence";
          else if (roll > .984) kind = "crystal";
          else if (roll > .978) kind = "mushroom";
          else if (roll > .97) kind = "flowerPink";
          else if (roll > .962) kind = "flowerBlue";
          else if (roll > .954) kind = "flowerYellow";
          else if (roll > .91) kind = terrain === "forest" ? (roll > .96 ? "pine" : "tree") : (roll > .95 ? "bush" : "tree");
          else if (terrain === "grass" && roll > .78) kind = roll > .88 ? "grass" : "flower";
          else if (terrain === "forest" && roll > .78) kind = roll > .87 ? "stump" : "bush";
        } else if (terrain === "sand" && roll > .97) kind = "log";
        else if (terrain === "stone" && roll > .76) kind = roll > .93 ? "crystal" : "rock";
        if (kind) {
          const px = wx * TILE_SIZE, py = wy * TILE_SIZE;
          ctx.drawImage(createAmbientSprite(kind), px, py - 2, TILE_SIZE, TILE_SIZE + 2);
        }
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
    if (!this.destroyed && !document.hidden) this.frame = requestAnimationFrame(next => this.tick(next));
  }

  update(dt) {
    const speed = this.speed;
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
    if (this.onMove && (dx || dy || this.destination)) this.onMove(this.player.x, this.player.y);
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
    const maxCx = Math.min(Math.ceil(this.worldSize / CHUNK_SIZE) - 1, Math.floor((left + viewW) / CHUNK_SIZE));
    const minCy = Math.max(0, Math.floor(top / CHUNK_SIZE));
    const maxCy = Math.min(Math.ceil(this.worldSize / CHUNK_SIZE) - 1, Math.floor((top + viewH) / CHUNK_SIZE));
    let visibleChunkCount = 0;
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        visibleChunkCount++;
        const chunk = this.chunkCanvas(cx, cy);
        const sx = (cx * CHUNK_SIZE - left) * zoom;
        const sy = (cy * CHUNK_SIZE - top) * zoom;
        ctx.drawImage(chunk, Math.round(sx), Math.round(sy), Math.ceil(CHUNK_SIZE * zoom), Math.ceil(CHUNK_SIZE * zoom));
      }
    }
    for (const entity of this.entities) {
      if (!entity.sprite) continue;
      const ex = (entity.x - left) * zoom, ey = (entity.y - top) * zoom;
      if (ex < -40 * zoom || ey < -40 * zoom || ex > width + 40 * zoom || ey > height + 40 * zoom) continue;
      const ew = (entity.sprite.width || entity.width || 16) * zoom, eh = (entity.sprite.height || entity.height || 20) * zoom;
      ctx.fillStyle = "#17211c"; ctx.fillRect(Math.round(ex - 6 * zoom), Math.round(ey + 6 * zoom), Math.ceil(12 * zoom), Math.ceil(3 * zoom));
      if (entity.type === "monster" && entity.elite) {
        const eliteColors = { common: "#d8e0e8", uncommon: "#57e68a", rare: "#55a9ff", epic: "#c16aff", legendary: "#ffb84d" };
        const color = eliteColors[entity.eliteKey] || eliteColors.common;
        const pulse = (Math.sin(Date.now() / 230) + 1) / 2;
        const radiusX = Math.max(12, ew * (.72 + pulse * .18));
        const radiusY = Math.max(10, eh * (.42 + pulse * .12));
        ctx.save(); ctx.globalAlpha = .58 + pulse * .38; ctx.shadowColor = color; ctx.shadowBlur = (18 + pulse * 30) * zoom;
        ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(Math.round(ex), Math.round(ey), radiusX, radiusY, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = .9; ctx.lineWidth = Math.max(2, 3.5 * zoom); ctx.strokeStyle = color;
        ctx.beginPath(); ctx.ellipse(Math.round(ex), Math.round(ey), radiusX * 1.12, radiusY * 1.12, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = (16 + pulse * 32) * zoom;
        ctx.filter = `saturate(${1.7 + pulse * .8}) brightness(${1.12 + pulse * .28})`;
        ctx.drawImage(entity.sprite, Math.round(ex - ew / 2), Math.round(ey - eh * 0.72), Math.round(ew), Math.round(eh)); ctx.restore();
      } else {
        ctx.drawImage(entity.sprite, Math.round(ex - ew / 2), Math.round(ey - eh * 0.72), Math.round(ew), Math.round(eh));
      }
      if (entity.type === "player" && entity.name) {
        const label = String(entity.name).slice(0, 24);
        const fontSize = Math.max(9, Math.min(13, 11 * zoom));
        ctx.save();
        ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const labelWidth = Math.min(ctx.measureText(label).width + 12 * zoom, 180 * zoom);
        const labelY = Math.round(ey - eh * 0.82 - 5 * zoom);
        ctx.fillStyle = "rgba(8, 15, 24, .88)";
        ctx.strokeStyle = "rgba(120, 210, 255, .8)";
        ctx.lineWidth = Math.max(1, zoom * .65);
        ctx.beginPath();
        ctx.roundRect(Math.round(ex - labelWidth / 2), labelY - fontSize - 3 * zoom, Math.round(labelWidth), fontSize + 6 * zoom, 4 * zoom);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#f2f8ff";
        ctx.fillText(label, Math.round(ex), labelY - 2 * zoom, 170 * zoom);
        ctx.restore();
      }
    }
    const px = (this.player.x - left) * zoom, py = (this.player.y - top) * zoom;
    // Hard-edged pixel shadow, sprite and ground-facing highlight.
    ctx.fillStyle = "#17211c"; ctx.fillRect(Math.round(px - 6 * zoom), Math.round(py + 7 * zoom), Math.ceil(12 * zoom), Math.ceil(3 * zoom));
    const sw = this.sprite.width * zoom, sh = this.sprite.height * zoom;
    ctx.drawImage(this.sprite, Math.round(px - sw / 2), Math.round(py - sh * 0.72), Math.round(sw), Math.round(sh));
    if (this.destination) {
      ctx.strokeStyle = "#fff0a3"; ctx.lineWidth = Math.max(1, zoom * 0.7);
      ctx.strokeRect(Math.round((this.destination.x - left) * zoom - 4 * zoom), Math.round((this.destination.y - top) * zoom - 4 * zoom), Math.round(8 * zoom), Math.round(8 * zoom));
    }
    const debugStats = `${visibleChunkCount}|${this.chunkCache.size}|${Math.round(this.player.x)}|${Math.round(this.player.y)}`;
    if (debugStats !== this.lastDebugStats) {
      this.lastDebugStats = debugStats;
      this.canvas.dataset.visibleChunks = String(visibleChunkCount);
      this.canvas.dataset.cachedChunks = String(this.chunkCache.size);
      this.canvas.dataset.worldX = String(Math.round(this.player.x));
      this.canvas.dataset.worldY = String(Math.round(this.player.y));
    }
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.resizeObserver.disconnect();
    this.keys.clear();
  }
}

