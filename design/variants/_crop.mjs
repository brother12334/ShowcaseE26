import { chromium, appFile } from '../../tests/specs/_e26.mjs';
import { readFileSync } from 'node:fs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:400,height:400},deviceScaleFactor:3});
const css=readFileSync('/home/user/ShowcaseE26/design/variants/controls.css','utf8');
const js=readFileSync('/home/user/ShowcaseE26/design/variants/variants.js','utf8');
await p.setContent(`<html><head><style>
:root{--bg:#0e0e10;--card:#17171a;--card2:#1f1f24;--line:#28282f;--text:#e8e6e1;--dim:#9b9892;
--faint:#83817c;--acc:#c98a4b;--acc-soft:rgba(201,138,75,.14);--acc-line:rgba(201,138,75,.42);
--mono:'IBM Plex Mono',monospace;--disp:'IBM Plex Mono',monospace;--sans:system-ui,sans-serif;
--fs-1:9.5px;--fs-2:11px;--fs-3:12.5px;--fs-4:13.5px;--fs-5:15px;--r-xs:3px;--r-sm:7px;--r:10px;
--r-pill:999px;--t-fast:.13s;--t-mid:.24s;--t-reveal:.26s;--ease:cubic-bezier(.2,.7,.3,1);
--ease-reveal:cubic-bezier(.2,.9,.25,1);}
body{background:var(--bg);margin:0;padding:20px;font-family:var(--sans)}${css}</style></head>
<body><div id="h"></div><script>window.SD={};${js}</script></body></html>`);
await p.evaluate(()=>{ document.getElementById('h').innerHTML =
  window.SD.targets_MIX().split('</div>').slice(0,0).join('') || ''; });
// just render the dial alone at several values
await p.evaluate(()=>{ const d=[]; document.getElementById('h').innerHTML=''; });
await p.evaluate(()=>{
  const host=document.getElementById('h');
  const html = window.SD.targets_MIX();
  const m = html.match(/<div class="sd-dial"[\s\S]*?<\/div>\s*<\/div>/);
  host.innerHTML = m ? m[0] : 'NO DIAL';
});
await p.locator('.sd-dial').screenshot({path:'/tmp/claude-0/-home-user-ShowcaseE26/cb903a36-3103-5d6a-a18b-78ade397246e/scratchpad/dial.png'});
await b.close(); console.log('cropped');
