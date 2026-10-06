/* Stitch a set of frames into one labelled strip, so a motion proposal can be LOOKED at
   rather than read. */
import { chromium } from '../../../tests/specs/_e26.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

export async function strip(files, labels, out, title){
  const b = await chromium.launch();
  const p = await (await b.newContext({deviceScaleFactor:2})).newPage();
  const imgs = files.map(f=> readFileSync(f).toString("base64"));
  const data = await p.evaluate(async ([b64s, labs, t])=>{
    const loaded = await Promise.all(b64s.map(s=> new Promise(r=>{
      const i = new Image(); i.onload = ()=> r(i); i.src = "data:image/png;base64," + s; })));
    const W = 300, gap = 18, padT = 86, padB = 54, padX = 18;
    const scale = W / loaded[0].width;
    const H = Math.round(loaded[0].height * scale);
    const c = document.createElement("canvas");
    const g0 = c.getContext("2d");
    g0.font = "600 26px ui-monospace, monospace";
    const titleW = g0.measureText(t).width + padX*2;
    c.width = Math.max(padX*2 + loaded.length*W + (loaded.length-1)*gap, Math.ceil(titleW));
    c.height = padT + H + padB;
    const g = c.getContext("2d");
    g.fillStyle = "#0a0a0a"; g.fillRect(0,0,c.width,c.height);
    g.fillStyle = "#e8e6e1";
    g.font = "600 26px ui-monospace, monospace";
    g.fillText(t, padX, 40);
    loaded.forEach((im, i)=>{
      const x = padX + i*(W+gap);
      g.drawImage(im, x, padT, W, H);
      g.strokeStyle = "rgba(255,255,255,.1)"; g.lineWidth = 1;
      g.strokeRect(x+.5, padT+.5, W-1, H-1);
      g.fillStyle = "#d4954a";
      g.font = "600 15px ui-monospace, monospace";
      g.fillText(String(i+1), x, padT - 26);
      g.fillStyle = "#8f8c86";
      g.font = "13px ui-monospace, monospace";
      (labs[i]||"").split("\n").forEach((line, k)=>
        g.fillText(line, x + 18, padT - 26 + k*17));
      g.fillStyle = "#6f6d69";
      g.font = "12px ui-monospace, monospace";
    });
    return c.toDataURL("image/png").split(",")[1];
  }, [imgs, labels, title || ""]);
  writeFileSync(out, Buffer.from(data, "base64"));
  await b.close();
  console.log("strip -> " + out);
}
