/* Cut a tall full-page PNG into viewport-sized frames so a human (or a model) can
   actually look at it. Pure canvas work in the browser we already have running. */
import { chromium } from '../../tests/specs/_e26.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
const H = parseInt(process.argv[3] || "844", 10) * 2;    // deviceScaleFactor 2
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
const data = readFileSync(file).toString("base64");
const out = await p.evaluate(async ([b64, h])=>{
  const img = new Image();
  await new Promise(r=>{ img.onload = r; img.src = "data:image/png;base64," + b64; });
  const n = Math.ceil(img.height / h);
  const res = [];
  for(let i = 0; i < n; i++){
    const c = document.createElement("canvas");
    c.width = img.width; c.height = Math.min(h, img.height - i*h);
    c.getContext("2d").drawImage(img, 0, -i*h);
    res.push(c.toDataURL("image/png").split(",")[1]);
  }
  return res;
}, [data, H]);
const base = file.replace(/\.png$/, "");
out.forEach((b64, i)=> writeFileSync(base + "-s" + String(i).padStart(2,"0") + ".png",
  Buffer.from(b64, "base64")));
console.log(out.length + " slices of " + path.basename(file));
await b.close();
