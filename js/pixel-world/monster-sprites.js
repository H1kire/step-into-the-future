import { makePixelCanvas, pixels } from "./pixel-sprite.js";

const DEFINITIONS = {
  slime: {
    name: "Дикий слизень", width: 16, height: 14,
    palette: { g:"#72d84f", G:"#3f9e3b", L:"#246b36", h:"#b6ff79", e:"#f4ffe1", k:"#20352b" },
    rows: ["................","......GGGG......","....GGggggGG....","...GggggggggG...","..GggggggggggG..",".GggggggggggggG.","GggggggggggggggG","GggggggggggggggG","GggggggggggggggG",".GggggggggggggG.","..GGGGGGGGGGGG..","................","................","................"],
    details: [["h",4,5,2,1],["h",10,5,2,1],["e",5,7,2,2],["e",10,7,2,2],["k",6,8,1,1],["k",11,8,1,1]]
  },
  goblin: {
    name: "Подворотный гоблин", width: 16, height: 20,
    palette: { g:"#8fc35b", G:"#4f803d", d:"#60402e", D:"#352b29", r:"#b54d4d", R:"#752e3b", e:"#fff0ca", k:"#20262b", m:"#b4b7a4" },
    rows: ["......GGGG......",".....GggggG.....","....GggggggG....","....ggee.eeg....","....gggggggg....",".....GrrrrG.....",".....GrrrrG.....","....DDDkkDDD....","...DddDkkDddD...","...DddDkkDddD...","....DddddddD....",".....DddddD.....",".....DddddD.....","....DddddddD....","....Ddd..ddD....","....Ddd..ddD....","....DDD..DDD....","....DDD..DDD....","...DD......DD...","................"],
    details: [["m",3,10,2,1],["m",11,10,2,1],["r",6,13,4,1]]
  },
  wolf: {
    name: "Теневой волк", width: 16, height: 20,
    palette: { f:"#697789", F:"#3c495e", D:"#252d40", e:"#eaf2ff", r:"#c96d7d", k:"#17202b", h:"#a7c2d8" },
    rows: ["................","..D..D....D..D..","..DDDD..DDDD...","...FFFFFDDD....","..FffffFFDDDD..",".FfffffffFDDDD.",".FffeffeffFDDDD","FfffffffFFDDDD.","FffffffffFDDD..","FffffrrfffF....",".FfffffffF.....","..FFffffFF.....","...FFffFF......","...DD..DD......","..DDD..DDD.....","..DDD..DDD.....",".DDD....DDD....",".DD......DD....","................","................"],
    details: [["h",4,8,2,1],["h",9,8,2,1],["r",7,11,2,1]]
  },
  golem: {
    name: "Малый голем", width: 16, height: 20,
    palette: { s:"#9aa6a6", S:"#657577", D:"#3e4e53", h:"#d0d7c9", c:"#dcae62", C:"#926d3d", k:"#202b31" },
    rows: [".....SSSSSS.....","....ShhhhSSS....","...SshhhhhhSS...","...SshhkkhhSS...","...Sshhcc hhSS..","....SshhhSSS....","..SSSSSSSSSSSS..",".SshhhhSSShhhS..",".SshhhSSSSShhS..",".SSSSSShhSSSSS..","...SSShhSSS.....","...SSShhSSS.....","...SSShhSSS.....","..SSSShhSSSS....","..SSS....SSS....","..SSS....SSS....","..SSS....SSS....",".SSSS....SSSS...","................","................"],
    details: [["c",6,5,1,1],["c",9,5,1,1],["h",4,3,2,1],["h",10,3,2,1]]
  }
};

export function createMonsterSprite(kind, scale = 1) {
  const def = DEFINITIONS[kind] || DEFINITIONS.slime;
  const { canvas, ctx } = makePixelCanvas(def.width, def.height, scale);
  pixels(ctx, def.rows, def.palette);
  for (const [color, x, y, width, height] of def.details || []) {
    ctx.fillStyle = def.palette[color];
    ctx.fillRect(x, y, width, height);
  }
  return canvas;
}

export function getMonsterDefinitions() {
  return Object.entries(DEFINITIONS).map(([id, def]) => ({ id, name: def.name, width: def.width, height: def.height }));
}

export function createNpcSprite(kind, scale = 1) {
  const { canvas, ctx } = makePixelCanvas(16, 20, scale);
  const palettes = {
    merchant: { k:"#252b35", s:"#f1c49a", S:"#b77752", b:"#6a432e", B:"#3f2c29", g:"#d8bd78", G:"#92713b", e:"#fff0ce" },
    priest: { k:"#252b35", s:"#f1c49a", S:"#b77752", p:"#b9a0e8", P:"#70539b", h:"#f4d878", H:"#b18a35", e:"#fff0ce" }
  };
  const p = palettes[kind] || palettes.merchant;
  const rows = kind === "priest"
    ? [".......h........","......hhh.......",".....hhhhh......",".....ssssss.....",".....skkks......",".....ssssss.....","....PPPPPPPP....","...PPPPPPPPPP...","...PPPPPPPPPP...","...PPPPPPPPPP...","....PPPPPPPP....","....PPPPPPPP....","....PPPPPPPP....","....PPPPPPPP....","...kk......kk...","...kk......kk...","...kk......kk...","...kk......kk...","..kkk......kkk..","................"]
    : ["......bbbb......",".....bssssb.....",".....sseess.....",".....sseess.....","......ssss......",".....kkkkkk.....","....kkggggkk....","....kggggggk....","....kkkkkkkk....",".....bBBBBb.....","....bb....bb....","....bb....bb....","....bb....bb....","....bb....bb....","....bb....bb....","....bb....bb....","...bb......bb...","...bb......bb...","...BB......BB...","................"];
  pixels(ctx, rows, p);
  ctx.fillStyle = p.e;
  ctx.fillRect(6, 6, 1, 1); ctx.fillRect(9, 6, 1, 1);
  return canvas;
}
