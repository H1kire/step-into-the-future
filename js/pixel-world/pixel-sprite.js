/**
 * Pixel drawing primitives. Sprites are painted on a tiny integer grid and
 * enlarged with smoothing disabled; there are no meshes, voxels or image assets.
 */
export const SPRITE_WIDTH = 16;
export const SPRITE_HEIGHT = 20;

export function makePixelCanvas(width = SPRITE_WIDTH, height = SPRITE_HEIGHT, scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width * scale}px`;
  canvas.style.height = `${height * scale}px`;
  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

export function pixels(ctx, rows, palette, x = 0, y = 0) {
  rows.forEach((row, py) => {
    for (let px = 0; px < row.length; px += 1) {
      const key = row[px];
      if (key === "." || key === " ") continue;
      const color = palette[key];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + px, y + py, 1, 1);
    }
  });
}

export function shade(hex, amount) {
  const value = Number.parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((value >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (value & 255) + amount));
  return `rgb(${r} ${g} ${b})`;
}
