const cache = new Map();
const P = (ctx, color, x, y, w = 1, h = 1) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
const shadow = (ctx) => P(ctx, "#17231a", 5, 28, 22, 2);

function paint(ctx, kind) {
  shadow(ctx);
  switch (kind) {
    case "tree":
      P(ctx,"#68432d",14,17,6,12); P(ctx,"#9b6840",15,18,2,10);
      P(ctx,"#17452e",4,9,24,14); P(ctx,"#24643a",6,5,20,16); P(ctx,"#348b43",8,3,15,12);
      P(ctx,"#68b94b",10,4,8,5); P(ctx,"#a1d65a",11,5,4,2); P(ctx,"#3b9b48",20,10,5,5); break;
    case "pine":
      P(ctx,"#765034",14,22,5,8); P(ctx,"#15523b",7,4,18,7); P(ctx,"#176a43",4,10,24,7); P(ctx,"#1c7a45",2,17,28,8);
      P(ctx,"#45a94d",10,5,8,3); P(ctx,"#6bc653",12,11,7,3); P(ctx,"#a2dc5c",14,18,5,2); break;
    case "bush":
      P(ctx,"#17452f",4,16,24,10); P(ctx,"#24733b",5,12,22,12); P(ctx,"#3b9843",8,9,16,12);
      P(ctx,"#73c64b",9,10,7,5); P(ctx,"#a6df5b",11,10,3,2); P(ctx,"#4aaa46",19,15,5,5); break;
    case "flower":
    case "flowerPink":
    case "flowerBlue":
    case "flowerYellow": {
      const petal = kind==="flowerPink"?"#f58acb":kind==="flowerBlue"?"#70c9ff":kind==="flowerYellow"?"#ffd65c":"#f5f0d2";
      P(ctx,"#347b3d",15,16,2,12); P(ctx,"#4b9c43",10,21,6,2); P(ctx,"#4b9c43",17,24,5,2);
      P(ctx,petal,13,7,6,4); P(ctx,petal,10,10,4,5); P(ctx,petal,18,10,4,5); P(ctx,petal,13,15,6,3); P(ctx,"#ffdc62",15,11,3,3); break;
    }
    case "grass":
      P(ctx,"#357c3d",8,22,2,6); P(ctx,"#4d9d45",10,18,2,10); P(ctx,"#6ab64a",12,14,2,14);
      P(ctx,"#398b42",16,20,2,8); P(ctx,"#78c94d",18,16,2,12); P(ctx,"#3a8a40",21,22,2,6); break;
    case "mushroom":
      P(ctx,"#e9dfc8",14,17,6,10); P(ctx,"#c6bba6",15,18,4,8); P(ctx,"#a92f3c",8,10,18,8); P(ctx,"#e24b50",10,7,13,7);
      P(ctx,"#ff9b83",12,8,4,3); P(ctx,"#fff0d5",10,12,3,2); P(ctx,"#fff0d5",20,11,3,2); break;
    case "rock":
      P(ctx,"#424d56",5,17,22,10); P(ctx,"#69777d",8,10,17,14); P(ctx,"#89979a",12,7,10,9);
      P(ctx,"#b2bcb4",13,8,5,3); P(ctx,"#53636a",19,18,6,5); break;
    case "log":
      P(ctx,"#70472d",4,16,23,10); P(ctx,"#a66b3b",6,15,19,8); P(ctx,"#d39a56",6,16,3,6);
      P(ctx,"#603d2b",24,16,4,8); P(ctx,"#e0b36e",25,18,2,4); break;
    case "crystal":
      P(ctx,"#245a9c",7,24,19,4); P(ctx,"#246fc2",10,12,5,13); P(ctx,"#3bb4ef",13,5,7,20); P(ctx,"#9cecff",15,7,2,11);
      P(ctx,"#5b65dc",19,16,5,10); P(ctx,"#d5ffff",14,6,2,4); break;
    case "chest":
      P(ctx,"#593725",5,13,22,14); P(ctx,"#a96531",7,11,18,13); P(ctx,"#d18a42",8,12,16,5);
      P(ctx,"#714326",7,19,18,6); P(ctx,"#f0c15e",15,15,4,8); P(ctx,"#ffe69a",16,16,2,3); break;
    case "barrel":
      P(ctx,"#754629",9,8,14,20); P(ctx,"#b9783e",11,9,10,18); P(ctx,"#e0a85c",12,10,3,15);
      P(ctx,"#4a3b35",8,11,16,3); P(ctx,"#4a3b35",8,23,16,3); P(ctx,"#d5b276",9,12,14,1); break;
    case "campfire":
      P(ctx,"#554332",7,23,18,4); P(ctx,"#9a6034",9,21,14,3); P(ctx,"#f04c24",12,11,9,13); P(ctx,"#ff9b27",13,7,7,15);
      P(ctx,"#ffe36c",15,10,4,10); P(ctx,"#fff4b0",16,12,2,5); break;
    case "fence":
      P(ctx,"#70472e",4,12,4,17); P(ctx,"#70472e",24,12,4,17); P(ctx,"#bd8547",3,14,26,4); P(ctx,"#bd8547",3,22,26,4);
      P(ctx,"#e0ac63",4,14,3,2); P(ctx,"#e0ac63",24,14,3,2); break;
    case "sign":
      P(ctx,"#70462d",15,15,4,14); P(ctx,"#9c6637",4,8,24,10); P(ctx,"#d59b52",6,9,20,6); P(ctx,"#5b3a28",8,11,15,1); P(ctx,"#5b3a28",8,14,10,1); break;
    case "lantern":
      P(ctx,"#5a4330",14,4,4,4); P(ctx,"#9a7040",10,8,12,17); P(ctx,"#f7d16a",12,11,8,11); P(ctx,"#fff2a0",14,12,4,8);
      P(ctx,"#60462f",9,8,14,2); P(ctx,"#60462f",9,24,14,2); break;
    case "wagon":
      P(ctx,"#71462b",4,10,24,12); P(ctx,"#b7793d",6,11,20,8); P(ctx,"#e0a451",8,12,15,3);
      P(ctx,"#4d3930",7,22,6,6); P(ctx,"#4d3930",21,22,6,6); P(ctx,"#d6b16e",9,24,2,2); P(ctx,"#d6b16e",23,24,2,2); break;
    case "cow":
      P(ctx,"#e5dcc7",5,11,21,13); P(ctx,"#f7f0dc",8,9,14,13); P(ctx,"#554b4a",8,12,5,5); P(ctx,"#554b4a",19,17,5,5);
      P(ctx,"#e5b7a5",23,14,6,6); P(ctx,"#3d3432",9,22,3,7); P(ctx,"#3d3432",21,22,3,7); P(ctx,"#6a4733",4,9,3,5); break;
    case "chicken":
      P(ctx,"#f4ead0",8,13,17,12); P(ctx,"#fff7df",10,10,12,12); P(ctx,"#d84a38",14,7,5,4); P(ctx,"#e9a43e",23,15,6,3);
      P(ctx,"#d8c9aa",10,23,2,5); P(ctx,"#d8c9aa",20,23,2,5); P(ctx,"#272a2b",18,14,2,2); break;
    case "fox":
      P(ctx,"#bd552d",6,13,20,12); P(ctx,"#e47b38",9,9,15,12); P(ctx,"#f3c47b",17,17,11,6); P(ctx,"#e47b38",6,9,5,8);
      P(ctx,"#f0d6a8",7,8,4,5); P(ctx,"#f0d6a8",22,8,4,5); P(ctx,"#342d2c",20,13,2,2); P(ctx,"#a23d2b",4,20,6,4); break;
    case "stump":
      P(ctx,"#65432e",8,16,17,12); P(ctx,"#a97545",10,13,13,6); P(ctx,"#e0b878",12,14,9,3); P(ctx,"#64402a",12,21,2,6); break;
    case "shrine":
      P(ctx,"#4f5860",6,10,20,18); P(ctx,"#8a9696",8,7,16,7); P(ctx,"#c0c8b6",10,8,12,3); P(ctx,"#353f49",12,16,8,12);
      P(ctx,"#66d8ff",14,17,4,7); break;
    case "banner":
      P(ctx,"#80522e",8,4,3,25); P(ctx,"#d34c55",11,5,15,13); P(ctx,"#f4c36b",13,7,11,2); P(ctx,"#f4c36b",13,11,7,2); break;
  }
}
export function createAmbientSprite(kind) {
  if (!cache.has(kind)) {
    const canvas = document.createElement("canvas"); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext("2d"); ctx.imageSmoothingEnabled = false; paint(ctx, kind); cache.set(kind, canvas);
  }
  return cache.get(kind);
}
export const AMBIENT_SPRITES = ["tree","pine","bush","flower","flowerPink","flowerBlue","flowerYellow","grass","mushroom","rock","log","crystal","chest","barrel","campfire","fence","sign","lantern","wagon","cow","chicken","fox","stump","shrine","banner"];
