/* Nine Settings mockups, built from the shared sd- library only.
   Values are the Nov 17 FIXTURE export, not necessarily current. */
(function(){
"use strict";
const E = s=> String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));

/* ---------- library builders ---------- */
const sec   = t=> `<div class="sd-sec">${E(t)}</div>`;
const says  = t=> `<div class="sd-says">${t}</div>`;
const group = inner=> `<div class="sd-group">${inner}</div>`;
const hero  = (k,v,unit,s)=> `<div class="sd-hero"><div class="sd-hero-k">${E(k)}</div>
  <span class="sd-hero-v">${E(v)}${unit?`<i>${E(unit)}</i>`:""}</span>
  ${s?`<p class="sd-hero-s">${s}</p>`:""}</div>`;
const heroW = (k,w,s)=> `<div class="sd-hero"><div class="sd-hero-k">${E(k)}</div>
  <span class="sd-hero-w">${w}</span>${s?`<p class="sd-hero-s">${s}</p>`:""}</div>`;
const seg = (opts,cur,tall)=> `<div class="sd-seg${tall?" is-tall":""}" role="group">${
  opts.map(o=>`<button type="button" aria-pressed="${o.v===cur}">${E(o.t)}</button>`).join("")}</div>`;
const item = (label,sub,ctrl,sy)=> `<div class="sd-item">
  <div class="sd-label">${E(label)}</div>${sub?`<p class="sd-sub">${sub}</p>`:""}
  ${ctrl||""}${sy?says(sy):""}</div>`;
const tog = (label,sub,on)=> `<button type="button" class="sd-tog" aria-pressed="${!!on}">
  <span class="sd-tog-b"><span class="sd-label">${E(label)}</span>
    <span class="sd-sub" style="display:block">${sub}</span></span>
  <span class="sd-tog-sw" aria-hidden="true"></span></button>`;
const chips = (opts,cur,plate)=> `<div class="sd-chips">${opts.map(o=>
  `<button type="button" class="sd-chip${plate?" sd-plate":""}${o.word?" is-word":""}"
     aria-pressed="${o.v===cur}">${E(o.t)}</button>`).join("")}</div>`;
const step = (v,unit,unset)=> `<div class="sd-step">
  <button type="button" aria-label="Less">−</button>
  <div class="sd-step-v${unset?" is-unset":""}" role="spinbutton" tabindex="0"
    ${unset?'aria-valuetext="not set"':`aria-valuenow="${E(v)}"`}>${
    unset?`—<i>${E(unit)}</i><u>${E(v)}</u>`:`${E(v)}${unit?`<i>${E(unit)}</i>`:""}`}</div>
  <button type="button" aria-label="More">+</button></div>`;
const more = (label,inner)=> `<details class="sd-more"><summary>${E(label)}</summary>
  <div class="sd-more-b">${inner}</div></details>`;
const row = (n,v,open,body)=> `<div class="sd-r${open?" is-open":""}">
  <button type="button" class="sd-r-h" aria-expanded="${!!open}">
    <span class="sd-r-n">${E(n)}</span><span class="sd-r-v">${E(v)}</span>
    <span class="sd-r-c" aria-hidden="true">›</span></button>
  ${open?`<div class="sd-r-b">${body}</div>`:""}</div>`;
const list = rows=> `<div class="sd-list">${rows}</div>`;

/* 270-degree dial with detents at the real stops. */
function dial(val,unit,caption,stops,min,max){
  const A0=225,SW=270, C=60,R=46;
  const pt=(a,r)=>{const t=(a-90)*Math.PI/180;return [C+r*Math.cos(t),C+r*Math.sin(t)];};
  const arc=(a1,a2,r)=>{const [x1,y1]=pt(a1,r),[x2,y2]=pt(a2,r);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${(a2-a1)>180?1:0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;};
  const ang=v=> A0 + SW*((v-min)/(max-min));
  const a=ang(val), [kx,ky]=pt(a,R);
  const dets=stops.map(s=>{const sa=ang(s);const [x1,y1]=pt(sa,R-9),[x2,y2]=pt(sa,R-13);
    return `<line class="sd-dial-det${s<=val?" is-on":""}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}"
      x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;}).join("");
  return `<div class="sd-dial" role="slider" tabindex="0" aria-valuemin="${min}"
      aria-valuemax="${max}" aria-valuenow="${val}" aria-label="${E(caption)}">
    <svg viewBox="0 0 120 120" aria-hidden="true"><path class="sd-dial-track" d="${arc(A0,A0+SW,R)}"/>
      <path class="sd-dial-fill" d="${arc(A0,a,R)}"/>${dets}
      <circle class="sd-dial-knob" cx="${kx.toFixed(2)}" cy="${ky.toFixed(2)}" r="7.5"/></svg>
    <div class="sd-dial-read"><b>${E(val)}${unit?`<span style="font-size:19px;color:var(--dim)">${E(unit)}</span>`:""}</b>
      <span>${E(caption)}</span></div></div>`;
}
function range(lo,hi,min,max,fmt){
  const p=v=>((v-min)/(max-min))*100;
  return `<div class="sd-range"><div class="sd-range-t">
    <div class="sd-range-rail"></div>
    <div class="sd-range-on" style="left:${p(lo)}%;right:${(100-p(hi)).toFixed(1)}%"></div>
    <div class="sd-range-th" role="slider" tabindex="0" aria-valuenow="${lo}" aria-label="Lower"
      style="left:${p(lo)}%"></div>
    <div class="sd-range-th" role="slider" tabindex="0" aria-valuenow="${hi}" aria-label="Upper"
      style="left:${p(hi)}%"></div></div>
    <div class="sd-range-sc"><span>${E(fmt(min))}</span><span>${E(fmt(max))}</span></div></div>`;
}

/* =====================  1. HOW TRAINING IS RUN  ===================== */
const PROG=[{v:"auto",t:"Automatic"},{v:"ask",t:"Ask me"},{v:"hold",t:"I'll manage"}];
const WARM=[{v:"auto",t:"Add them"},{v:"planOnly",t:"Plan only"},{v:"manual",t:"Off"}];
const sessRare = ()=>
  group(
    item("How fast the number of sets climbs","",seg([{v:"peak",t:"Speed up while it works"},{v:"off",t:"One set at a time"}],"peak",true))
  + item("One-arm and one-leg exercises","",seg([{v:"separate",t:"Separately"},{v:"matchWeaker",t:"Match weaker"},{v:"both",t:"Together"}],"matchWeaker",true))
  + item("Which side goes first","",seg([{v:"fixed",t:"Always right"},{v:"flip",t:"Swap each cycle"}],"flip"))
  + item("Which day you train","",seg([{v:"fixed",t:"Follow the rotation"},{v:"any",t:"Let me choose"}],"fixed"))
  + item("Rest-day soreness check","Asked at the hour you first answer one.",
      `<div class="sd-chips"><button type="button" class="sd-chip is-word" aria-pressed="false">Not set yet</button></div>`));

const sess_A = ()=>
  heroW("WHEN A WEIGHT IS READY TO GO UP","Asks before adding weight",
    "Offered on the grade card with a one-tap Apply, so nothing changes without you.")
+ seg(PROG,"ask",true)
+ says("Legs A squat is <b>80 lb</b>. Clear the target and the next session offers <b>85</b>.")
+ sec("While you train")
+ group(
    item("Warm-up sets","A ramp before the first big lift of the day.",seg(WARM,"auto"),
      "Never counted as working sets either way.")
  + tog("Rate your sets","How close to failure each set was. The biggest single input the grade has.",true)
  + tog("Tell me the number to beat","Last session's best set, and the one change that clears it.",true)
  + tog("Relevant research picks","Three papers matched to what you actually train, worked out on this phone.",true))
+ more("More — deloads, one-limb work, the day order", group(
    item("Deload weeks","",seg([{v:"auto",t:"Suggest one"},{v:"planOnly",t:"Leave it to me"}],"auto")))
  + sessRare());

const sess_B = ()=>
  heroW("HOW YOUR TRAINING IS RUN","Asks before adding weight, tracks RPE, adds its own warm-ups",
    "Three decisions do most of the work. The rest are grouped under them.")
+ sec("Progression")
+ group(
    item("When a weight is ready to go up","",seg(PROG,"ask"),
      "<b>Ask me</b> — offered on the grade card with a one-tap Apply.")
  + item("How fast the number of sets climbs","",
      seg([{v:"peak",t:"Speed up"},{v:"off",t:"One at a time"}],"peak"),
      "Up to <b>3 sets</b> a block while a muscle keeps improving, easing off when it stops.")
  + item("Deload weeks","",seg([{v:"auto",t:"Suggest one"},{v:"planOnly",t:"Leave it to me"}],"auto"),
      "Offered every <b>6 weeks</b>, or earlier if your RPE and check-ins say so."))
+ sec("While you train")
+ group(
    item("Warm-up sets","",seg(WARM,"auto"))
  + tog("Rate your sets","Adds the RPE column. Still graded without it, with less to go on.",true)
  + tog("Tell me the number to beat","One more rep, or the next load your gear can do.",true))
+ sec("Now and then")
+ group(
    item("One-arm and one-leg exercises","",
      seg([{v:"separate",t:"Separately"},{v:"matchWeaker",t:"Match weaker"},{v:"both",t:"Together"}],"matchWeaker"),
      "Holds both sides to the weaker one, so the gap closes.")
  + tog("Relevant research picks","Chosen on this phone. Nothing about your training is sent anywhere.",true))
+ more("More — side order, the day order, the soreness check", sessRare());

const sess_C = ()=>
  heroW("HOW TRAINING IS RUN","Eleven decisions","Tap any one to change it. Everything else stays where it is.")
+ list(
   row("When a weight goes up","Ask me",true,
     seg(PROG,"ask",true) + says("Offered on the grade card with a one-tap Apply. Legs A squat is <b>80 lb</b>; clear the target and the next session offers <b>85</b>."))
 + row("Warm-up sets","Add them")
 + row("Rate your sets","Tracking RPE")
 + row("Number to beat","Shown")
 + row("Set count climbs","Speeds up")
 + row("Deload weeks","Suggest one")
 + row("Research picks","Shown")
 + row("One-limb work","Match weaker")
 + row("Side goes first","Swap each cycle")
 + row("Day you train","Rotation")
 + row("Soreness check","Not set yet"));

/* =====================  2. THE WORKOUT SCREEN  ===================== */
const ALERT=[{v:"off",t:"Nothing"},{v:"buzz",t:"Buzz"},{v:"notify",t:"Notify my phone"}];
const phoneMock = focus=>`
<div style="width:132px;height:206px;margin:2px auto 0;border:1px solid var(--line);
  border-radius:12px;background:var(--bg);padding:8px 7px;overflow:hidden">
  <div style="height:5px;width:34px;background:var(--line);border-radius:3px;margin:0 auto 8px"></div>
  ${focus
    ? `<div style="border:1px solid var(--acc-line);border-radius:7px;background:var(--acc-soft);
         padding:9px 8px;margin-bottom:7px">
         <div style="font:600 9px var(--disp);color:var(--acc);letter-spacing:.08em">SET 2 OF 4</div>
         <div style="font:500 20px var(--mono);color:var(--text);margin-top:3px">80<span style="font-size:10px;color:var(--dim)">lb</span></div>
       </div>
       <div style="display:flex;gap:5px">${[1,2].map(()=>`<div style="flex:1;height:30px;
         border:1px solid var(--line);border-radius:6px;background:var(--card2)"></div>`).join("")}</div>`
    : [0,1,2,3].map(i=>`<div style="display:flex;gap:5px;align-items:center;margin-bottom:5px">
         <div style="flex:1;height:17px;border-radius:4px;background:${i===1?"var(--acc-soft)":"var(--card2)"};
           border:1px solid ${i===1?"var(--acc-line)":"var(--line)"}"></div>
         <div style="width:20px;height:17px;border-radius:4px;background:var(--card2)"></div>
       </div>`).join("")
       + `<div style="height:1px;background:var(--line);margin:8px 0"></div>`
       + [0,1].map(()=>`<div style="height:13px;border-radius:4px;background:var(--card2);margin-bottom:5px"></div>`).join("")}
</div>`;

const screen_A = ()=>
  `<div class="sd-hero" style="padding-bottom:14px"><div class="sd-hero-k">THE WORKOUT SCREEN</div>
    ${phoneMock(false)}
    <p class="sd-hero-s" style="margin-top:13px">The session: all of it on one page — what you
      have done, what you are on, and what is left.</p></div>`
+ seg([{v:"regular",t:"The session"},{v:"focus",t:"Gym mode"}],"regular")
+ sec("While a set rests")
+ group(
    item("The rest clock","",seg([{v:"up",t:"Count up"},{v:"down",t:"Count down"}],"down"),
      "From the rest that set earned, then into negative overtime. A heavy triple gets longer than a set of fifteen.")
  + item("When the rest is up","",seg(ALERT,"off"),"The clock runs and never interrupts you."))
+ sec("Feedback")
+ group(
    tog("Sound","A click as you press, and a note when Element 26 says something back.",true)
  + tog("Buzz","A tick when a set is banked, two when the rest is up, a rise when the session closes.",true))
+ more("More", group(
    tog("Ask when a set falls well short","One tap to say why. The answer changes the advice, not just the mark.",true)));

const screen_B = ()=>
  hero("THE REST CLOCK","2:00",null,
    "Counting down from the rest that set earned, then into negative overtime.")
+ seg([{v:"up",t:"Count up"},{v:"down",t:"Count down"}],"down")
+ says("A heavy triple gets longer than a set of fifteen — the target comes from the set you just did, not from a fixed number.")
+ sec("Rest window this earns")
+ group(item("From a heavy triple to a set of fifteen","",
    range(120,180,30,300,s=> (s/60|0)+":"+String(s%60).padStart(2,"0")),
    "Between <b>2:00</b> and <b>3:00</b>. Tap either number to type it."))
+ sec("What you see")
+ group(item("The workout screen","",
    seg([{v:"regular",t:"The session"},{v:"focus",t:"Gym mode"}],"regular"),
    "All of it on one page. <b>Gym mode</b> is one exercise at a time with bigger controls."))
+ sec("What you hear")
+ group(
    item("When the rest is up","",seg(ALERT,"off"))
  + tog("Sound","A click as you press, a note when the app answers.",true)
  + tog("Buzz","Three buzzes and no others.",true))
+ more("More", group(tog("Ask when a set falls well short","One tap to say why.",true)));

const screen_C = ()=>
  heroW("THE WORKOUT SCREEN","Six decisions","Tap any one to change it.")
+ list(
   row("The screen","The session",true,
     seg([{v:"regular",t:"The session"},{v:"focus",t:"Gym mode"}],"regular",true)
     + says("All of it on one page. <b>Gym mode</b> shows one exercise at a time with bigger controls, and there is a switch for it on the session itself."))
 + row("Rest clock","Counts down")
 + row("When rest is up","Nothing")
 + row("Sound","On")
 + row("Buzz","On")
 + row("Set falls short","Ask me"));

/* =====================  3. IN THE GYM  ===================== */
const BARS=[{v:45,t:"45 lb"},{v:35,t:"35 lb"},{v:55,t:"55 lb"},{v:25,t:"25 lb"},
            {v:"other",t:"Something else",word:true},{v:null,t:"Rather not say",word:true}];
const barDraw = ()=>`
<div style="display:flex;align-items:center;justify-content:center;gap:0;margin:2px 0 0;height:54px">
  ${[22,26].map(h=>`<div style="width:9px;height:${h}px;background:var(--line);border-radius:2px"></div>`).join("")}
  <div style="width:46px;height:5px;background:var(--dim);border-radius:3px"></div>
  <div style="width:7px;height:17px;background:var(--acc);border-radius:2px"></div>
  <div style="width:62px;height:7px;background:var(--text);border-radius:3px;opacity:.55"></div>
  <div style="width:7px;height:17px;background:var(--acc);border-radius:2px"></div>
  <div style="width:46px;height:5px;background:var(--dim);border-radius:3px"></div>
  ${[26,22].map(h=>`<div style="width:9px;height:${h}px;background:var(--line);border-radius:2px"></div>`).join("")}
</div>`;

const gym_A = ()=>
  `<div class="sd-hero"><div class="sd-hero-k">YOUR BAR WEIGHS</div>
    ${barDraw()}
    <span class="sd-hero-v" style="font-size:34px;color:var(--dim);margin-top:10px">45<i>lb assumed</i></span>
    <p class="sd-hero-s">You have not said, so every percentage falls back to a standard bar.
      Tap a bar below and the app stops guessing.</p></div>`
+ chips(BARS,null,true)
+ says("Warm-up percentages come off this, and so does every load the app works out. "
   + "<b>Plates are a separate question</b> — the smallest pair you own is asked for under <b>Where you train</b>.")
+ sec("Units")
+ group(
    item("Pounds or kilos","",seg([{v:"lb",t:"Pounds"},{v:"kg",t:"Kilos"}],"lb"),
      "Nothing already logged is converted.")
  + item("The number you write for a barbell","",
      seg([{v:"total",t:"Bar + plates"},{v:"plates",t:"Plates only"}],"total"),
      "A 45 lb bar with a 45 on each end is <b>135</b>. Either way it is the whole load, never one side."))
+ more("More — bodyweight and the tape", group(
    tog("Track your bodyweight","A weigh-in log on the Body tab, which the cycle review reads.",true)
  + item("Tape measurements","",seg([{v:"in",t:"Inches"},{v:"cm",t:"Centimetres"}],"cm"),
      "Independent of pounds or kilos.")));

const gym_B = ()=>
  hero("EVERY LOAD IN THE APP","LB",null,
    "Shown and entered in pounds. Nothing already logged is converted when you switch.")
+ seg([{v:"lb",t:"Pounds"},{v:"kg",t:"Kilos"}],"lb")
+ says("Your heaviest logged set reads <b>225 lb</b> today. In kilos the same set reads <b>102 kg</b>.")
+ sec("The bar")
+ group(
    item("Your bar weighs","Not set, so percentages fall back to a standard bar. Tap the number to type one.",
      step(45,"lb",true),"Warm-ups come off this. <b>Plates are asked for separately</b>, under Where you train.")
  + item("The number you write down","",
      seg([{v:"total",t:"Bar + plates"},{v:"plates",t:"Plates only"}],"total"),
      "A 45 lb bar with a 45 on each end is <b>135</b>, not 90 and never 45."))
+ sec("Measuring yourself")
+ group(
    tog("Track your bodyweight","A weigh-in log on the Body tab. Turning it off hides the feature and deletes nothing.",true)
  + item("Tape measurements","",seg([{v:"in",t:"Inches"},{v:"cm",t:"Centimetres"}],"cm"),
      "Independent of pounds or kilos."));

const gym_C = ()=>
  heroW("IN THE GYM","Pounds, bar and plates","Tap any one to change it.")
+ list(
   row("Pounds or kilos","Pounds",true,
     seg([{v:"lb",t:"Pounds"},{v:"kg",t:"Kilos"}],"lb")
     + says("Loads shown and entered in <b>lb</b>. Nothing already logged is converted — your heaviest set reads <b>225 lb</b> now and <b>102 kg</b> after a switch."))
 + row("Barbell number means","Bar + plates")
 + row("Your bar weighs","Rather not say")
 + row("Track bodyweight","Yes")
 + row("Tape measurements","Centimetres"));

window.SD = {
  sess_A, sess_B, sess_C,
  screen_A, screen_B, screen_C,
  gym_A, gym_B, gym_C
};
/* =====================  BATCH 2  ===================== */
/* Real figures: GROUPS defaults, with the six the fixture's lmFloor overrides marked. */
const M = {
  quads:["Quads",5.5,16,20,true],  hams:["Hamstrings",4.5,14,20,true],
  glutes:["Glutes",4,12,16,false], calves:["Calves",2,14,20,true],
  adductors:["Adductors",0,6,12,false],
  upper_back:["Mid Back",5.3,20,25,true], lats:["Lats",10,18,22,false],
  traps:["Traps",4,16,24,false],   lower_back:["Lower Back",4,8,12,false],
  delts_side:["Side Delts",5,20,26,true], delts_rear:["Rear Delts",8.5,18,24,true],
  delts_front:["Front Delts",0,12,16,false],
  chest:["Chest",10,20,22,false],
  biceps:["Biceps",8,18,24,false], triceps:["Triceps",6,14,18,false],
  forearms:["Forearms",2,8,12,false],
  abs:["Abs",6,18,24,false], obliques:["Obliques",4,10,16,false]
};
const AREAS = {Chest:["chest"], Back:["upper_back","lats","traps","lower_back"],
  Shoulders:["delts_side","delts_rear","delts_front"],
  Arms:["biceps","triceps","forearms"], Core:["abs","obliques"],
  Legs:["quads","hams","glutes","calves","adductors"]};
const mName=k=>M[k][0], mMine=k=>M[k][4];
const band = k=>{const [n,a,b,c]=M[k];return `${a}/${b}/${c}`;};

/* A muscle as a three-stop range: MEV, MAV marked on the rail, MRV. */
function mRange(k){
  const [n,mev,mav,mrv,mine]=M[k], MAXS=28;
  const p=v=>(v/MAXS)*100;
  return `<div class="sd-item">
    <div style="display:flex;align-items:baseline;gap:8px">
      <div class="sd-label" style="flex:1 1 auto;margin:0">${E(n)}${mine?` <i class="sd-mine">yours</i>`:""}</div>
      <div class="sd-r-v">${E(mev)}–${E(mrv)}</div></div>
    <div class="sd-range" style="margin-top:9px"><div class="sd-range-t">
      <div class="sd-range-rail"></div>
      <div class="sd-range-on" style="left:${p(mev)}%;right:${(100-p(mrv)).toFixed(1)}%"></div>
      <div class="sd-range-mid" style="left:${p(mav)}%"></div>
      <div class="sd-range-th" role="slider" tabindex="0" aria-label="${E(n)} minimum"
        aria-valuenow="${mev}" style="left:${p(mev)}%"></div>
      <div class="sd-range-th" role="slider" tabindex="0" aria-label="${E(n)} maximum"
        aria-valuenow="${mrv}" style="left:${p(mrv)}%"></div></div>
      <div class="sd-range-sc"><span>0</span><span>enough: ${E(mav)}</span><span>${MAXS}</span></div></div>
  </div>`;
}
/* Plates you own, drawn as plates: the heavy ones read heavier. */
const PLATES=[45,35,25,10,5,2.5];
function plateRow(owned){
  const big=Math.max(...PLATES);
  /* The face varies with the plate; the BUTTON does not. A 2.5 drawn small is the point
     of the metaphor, but a 29px tap target is a miss, so the face sits inside a full-size
     hit area rather than being one. */
  return `<div class="sd-chips sd-plates">${PLATES.map(v=>{
    const h=26+Math.round((v/big)*28);
    return `<button type="button" class="sd-plate-b" aria-pressed="${owned.indexOf(v)>-1}"
      aria-label="${v} pound plates"><span class="sd-plate-f" style="height:${h}px">${v}</span></button>`;
  }).join("")}</div>`;
}

/* ---------- Volume targets ---------- */
const tgMuscleList = ()=> Object.keys(AREAS).map(a=>
  `<div class="sd-sec" style="margin:18px 2px 7px">${E(a)}</div>` + group(
    AREAS[a].map(k=> `<button type="button" class="sd-r-h">
      <span class="sd-r-n">${E(mName(k))}${mMine(k)?` <i class="sd-mine">yours</i>`:""}</span>
      <span class="sd-r-v">${E(band(k))}</span><span class="sd-r-c">›</span></button>`).join(""))).join("");

const targets_A = ()=>
  `<div class="sd-hero" style="padding-bottom:12px"><div class="sd-hero-k">ALL TARGETS, AGAINST THE PUBLISHED FIGURES</div>
    ${dial(100,"%","of published",[50,75,100,125,150],50,150)}</div>`
+ says("At <b>100%</b> you are on the published figures. Six muscles you have set yourself are left alone by this — the scale moves the other twelve.")
+ sec("Where the figures come from")
+ group(item("","",seg([{v:"pub",t:"As published"},{v:"learn",t:"Learn from my training"}],"pub"),
    "Published numbers until your log says otherwise. <b>Quads: 16 sets a week</b>, about 5 per leg day."))
+ more("Each muscle on its own — 6 of 18 set by you", tgMuscleList());

const targets_B = ()=>
  heroW("VOLUME TARGETS","18 muscles, 6 set by you",
    "Each one is a range: the least that does anything, and the most you can recover from.")
+ sec("Legs")
+ group(AREAS.Legs.slice(0,4).map(mRange).join(""))
+ sec("Shoulders")
+ group(AREAS.Shoulders.map(mRange).join(""))
+ says("Drag either end, or tap a number to type it. <b>Enough</b> is the middle mark — where most people grow without digging a hole.")
+ more("Chest, Back, Arms and Core", sec("Back") + group(AREAS.Back.map(mRange).join(""))
  + sec("Arms") + group(AREAS.Arms.map(mRange).join("")));

const targets_C = ()=>
  heroW("VOLUME TARGETS","100% of published","Six muscles you have set yourself. Tap an area to open it.")
+ list(
   row("Legs","5 muscles",true,
     group(AREAS.Legs.map(k=>`<div class="sd-item" style="display:flex;align-items:center;gap:10px">
       <span class="sd-label" style="flex:1 1 auto;margin:0">${E(mName(k))}${mMine(k)?` <i class="sd-mine">yours</i>`:""}</span>
       <span class="sd-r-v">${E(band(k))}</span></div>`).join(""))
     + says("Shown as <b>least / enough / most</b> sets a week."))
 + row("Back","4 muscles") + row("Shoulders","3 muscles") + row("Arms","3 muscles")
 + row("Chest","1 muscle") + row("Core","2 muscles"))
+ more("All of them at once", `<div class="sd-item">${dial(100,"%","of published",[50,75,100,125,150],50,150)}</div>`);

/* ---------- Where you train ---------- */
const gymRow=(n,sess,note)=>`<button type="button" class="sd-r-h">
  <span class="sd-r-n">${E(n)}<span class="sd-sub" style="display:block">${E(note)}</span></span>
  <span class="sd-r-v">${E(sess)}</span><span class="sd-r-c">›</span></button>`;

const where_A = ()=>
  heroW("WHERE YOU TRAIN","Palma Vista Gym","48 of your 74 sessions. Its kit is what the app assumes unless another gym says otherwise.")
+ sec("Plates you have, each side")
+ plateRow(PLATES)
+ says("The smallest pair decides every load the app suggests. Yours is <b>not set</b>, so it still suggests numbers your rack may not make.")
+ sec("The rest of the kit")
+ group(
    item("Dumbbells go up by","",step(5,"lb"),"So 30, 35, 40 — and nothing in between. Heaviest pair: <b>50 lb</b>.")
  + item("The Smith carriage weighs","",step(25,"lb")))
+ more("Your other two gyms, and finding them", list(
    gymRow("Lotus Gym","1","2.5 lb plates · 35 lb Smith")
  + gymRow("Uptown Gym","1","35 lb Smith")) 
  + group(tog("Recognise the gym you are in","Uses your location to pick the right kit. Nothing leaves the device.",true)));

const where_B = ()=>
  hero("GYMS ELEMENT 26 KNOWS","3",null,"One usual, two you have visited once each.")
+ sec("Your usual — Palma Vista")
+ group(
    item("Smallest plate each side","Not set, so it suggests exact numbers your rack may not make.",
      plateRow(PLATES),"Tap the pair you own. The bar then moves <b>twice</b> that at a time.")
  + item("Dumbbells go up by","",step(5,"lb"),"Heaviest pair on the rack: <b>50 lb</b>.")
  + item("The Smith carriage","",step(25,"lb")))
+ sec("Exceptions")
+ group(
    item("Lotus Gym","Visited once.",`<div class="sd-chips">
      <button type="button" class="sd-chip" aria-pressed="true">2.5 lb plates</button>
      <button type="button" class="sd-chip" aria-pressed="true">35 lb Smith</button></div>`)
  + item("Uptown Gym","Visited once.",`<div class="sd-chips">
      <button type="button" class="sd-chip" aria-pressed="true">35 lb Smith</button></div>`))
+ more("Finding the gym you are in", group(
    tog("Recognise the gym you are in","Picks the right kit when you arrive. Your location never leaves the device.",true)));

const where_C = ()=>
  heroW("WHERE YOU TRAIN","Three gyms","Tap one to see what it has.")
+ list(
   row("Palma Vista Gym","48 sessions",true,
     `<p class="sd-sub" style="margin-bottom:10px">Your usual. Its kit is what the app assumes everywhere else.</p>`
     + plateRow(PLATES)
     + says("Smallest plate <b>not set</b> · dumbbells every <b>5 lb</b> to <b>50</b> · Smith <b>25 lb</b>."))
 + row("Lotus Gym","1 session") + row("Uptown Gym","1 session"))
+ more("Finding the gym you are in", group(
    tog("Recognise the gym you are in","Uses your location, which never leaves the device.",true)));

/* ---------- Your plan ---------- */
const GOAL4=[{v:"muscle",t:"Build muscle"},{v:"strength",t:"Get stronger"},
             {v:"lean",t:"Lose fat, keep muscle"},{v:"health",t:"General health"}];
const PHASE3=[{v:"gain",t:"Gaining"},{v:"maintain",t:"Maintaining"},{v:"lose",t:"Losing"}];
const blockBar = ()=>`<div style="margin:14px 2px 0">
  <div style="display:flex;gap:3px;height:28px;align-items:flex-end">
    ${Array.from({length:10},(_,i)=>`<div style="flex:1;height:${i<6?"100%":"55%"};
      border-radius:3px 3px 0 0;background:${i<6?"var(--acc)":"var(--line)"};
      opacity:${i<6?(0.45+i*0.09).toFixed(2):1}"></div>`).join("")}
  </div>
  <div class="sd-range-sc" style="margin-top:6px"><span>block start</span><span>deload due</span></div></div>`;

const plan_A = ()=>
  heroW("WHAT YOU'RE TRAINING FOR","Build muscle","Moderate reps, plenty of volume. This is what sets every rep range in your plan.")
+ seg(GOAL4,"muscle",true)
+ says("Heavy lifts <b>6–10</b> · second movement <b>8–12</b> · isolation <b>12–15</b> · abs <b>10–15</b>.")
+ sec("What you're eating for")
+ group(item("","",seg(PHASE3,"gain"),
    "Eating above maintenance to build. Some fat comes with it; the rate decides how much."))
+ more("The block and deloads", group(
    item("Six weeks into this block","Your last deload ended when the block began.",blockBar(),
      "A deload is offered every 6 weeks, or earlier if your RPE and check-ins say so.")
  + item("","",`<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Start a deload week</button></div>`)));

const plan_B = ()=>
  hero("INTO THIS BLOCK","6","weeks",
    "Your last deload ended when this block began. The next is offered at week six.")
+ blockBar()
+ says("Offered every <b>6 weeks</b>, or earlier if your RPE and check-ins say so. Nothing starts without you.")
+ sec("Training for")
+ group(item("","",seg(GOAL4,"muscle",true),
    "<b>Build muscle</b> — heavy <b>6–10</b>, second <b>8–12</b>, isolation <b>12–15</b>."))
+ sec("Eating for")
+ group(item("","",seg(PHASE3,"gain"),
    "Above maintenance. Protein and hard training are what decide how much of the gain is muscle."))
+ more("Deload now", group(item("","Ends when you say, or after a week.",
    `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Start a deload week</button></div>`)));

const plan_C = ()=>
  heroW("YOUR PLAN","Build muscle, gaining","Six weeks into the block.")
+ list(
   row("Training for","Build muscle",true,
     seg(GOAL4,"muscle",true)
     + says("Sets every rep range: heavy <b>6–10</b>, second <b>8–12</b>, isolation <b>12–15</b>, abs <b>10–15</b>."))
 + row("Eating for","Gaining")
 + row("Block","6 weeks in")
 + row("Deload","Due at week 6"));

Object.assign(window.SD, {targets_A,targets_B,targets_C,
  where_A,where_B,where_C, plan_A,plan_B,plan_C});


/* targets: the dial from A as the hero, the per-muscle ranges from B as the body.
   The says line has to carry the relationship between them, because it is the one thing
   neither control shows: the dial moves the twelve you have NOT set, and dragging a
   muscle's own range takes it out of the dial's reach for good. */
const targets_MIX = ()=>
  `<div class="sd-hero" style="padding-bottom:10px"><div class="sd-hero-k">ALL TARGETS, AGAINST THE PUBLISHED FIGURES</div>
    ${dial(100,"%","of published",[50,75,100,125,150],50,150)}</div>`
+ says("At <b>100%</b> you are on the published figures. This moves the <b>twelve</b> you have not set yourself — the <b>six</b> marked below are already yours and stay where you put them.")
+ sec("Where the figures come from")
+ group(item("","",seg([{v:"pub",t:"As published"},{v:"learn",t:"Learn from my training"}],"pub"),
    "Published numbers until your own log says otherwise."))
+ sec("Legs")
+ group(AREAS.Legs.slice(0,4).map(mRange).join(""))
+ sec("Shoulders")
+ group(AREAS.Shoulders.map(mRange).join(""))
+ says("Drag either end, or tap a number to type it. <b>Enough</b> is the middle mark — where most people grow without digging a hole. Move one and it becomes yours.")
+ more("Chest, Back, Arms and Core",
    sec("Back") + group(AREAS.Back.map(mRange).join(""))
  + sec("Arms") + group(AREAS.Arms.map(mRange).join(""))
  + sec("Chest") + group(AREAS.Chest.map(mRange).join(""))
  + sec("Core") + group(AREAS.Core.map(mRange).join("")));

Object.assign(window.SD, {targets_MIX});

/* =====================  BATCH 3  =====================
   Every setting on these three is UNSET in the fixture: push off, no reminders, no wake
   time, no live links. That is not a gap in the mockups, it is the state they are most
   often seen in, and a design that only looks right once it is full is a design that
   looks wrong the first time anybody opens it. */

/* ---------- Sleep and mornings ---------- */
const clockFace = (h,label)=>`<div style="text-align:center;margin:2px 0 0">
  <span class="sd-hero-v" style="font-size:44px">${E(h)}<i>h</i></span>
  <div class="sd-hero-s" style="margin-top:2px">${label}</div></div>`;

const day_A = ()=>
  hero("HOURS OF SLEEP YOU WANT","8","h",
    "Late sessions cost sleep, and sleep is what recovery is made of.")
+ `<div class="sd-step" style="max-width:260px;margin-left:auto;margin-right:auto">
    <button type="button" aria-label="Less">−</button>
    <div class="sd-step-v" role="spinbutton" tabindex="0" aria-valuenow="8">8<i>h</i></div>
    <button type="button" aria-label="More">+</button></div>`
+ says("Train now and you'd be up around <b>7:30</b>. Leave this blank and nothing about sleep is asked.")
+ sec("Tracking it")
+ group(
    tog("Track my sleep","Offers to start the clock at night; the first time you open the app next morning is taken as the time you got up. Measured rather than remembered.",true)
  + item("My night starts at","",`<div class="sd-chips">
      <button type="button" class="sd-chip" aria-pressed="true">22:30</button></div>`))
+ more("A fixed wake time, if you have one", group(
    item("Wake time","Most people don't have one, and that's fine. Add one only if you want the app to start cutting exercises to protect it.",
      `<div class="sd-chips"><button type="button" class="sd-chip is-word" aria-pressed="false">Not set</button></div>`,
      "With just the hours above, Today shows what time you'd be getting up if you train now and leaves the decision to you.")));

const day_B = ()=>
  heroW("SLEEP AND MORNINGS","8 hours wanted, night starts 22:30","No fixed wake time, so nothing is ever cut from a session to protect one.")
+ sec("How much")
+ group(item("Hours of sleep you want","Optional. Blank turns all of this off.",
    step(8,"h"),"Train now and you'd be up around <b>7:30</b>."))
+ sec("When")
+ group(
    item("My night starts at","",`<div class="sd-chips">
      <button type="button" class="sd-chip" aria-pressed="true">22:30</button></div>`)
  + item("Wake time","Only if you have a fixed one.",`<div class="sd-chips">
      <button type="button" class="sd-chip is-word" aria-pressed="false">Not set</button></div>`,
      "Set one and the app works backwards: wake minus 8 h is bedtime, and bedtime minus 2 h is the latest you should still be training."))
+ sec("Measuring it")
+ group(tog("Track my sleep","The clock starts at night and stops when you first open the app. Measured rather than remembered.",true));

const day_C = ()=>
  heroW("SLEEP AND MORNINGS","8 hours, no fixed wake","Tap any one to change it.")
+ list(
   row("Hours you want","8 h",true,
     step(8,"h") + says("Train now and you'd be up around <b>7:30</b>. Blank turns all of this off."))
 + row("Track my sleep","On")
 + row("Night starts","22:30")
 + row("Wake time","Not set"));

/* ---------- Reminders ---------- */
const remPreview=(t,b,when)=>`<div class="sd-prev">
  <div class="sd-prev-w">${E(when)}</div>
  <div class="sd-prev-b"><b>${E(t)}</b> ${E(b)}</div></div>`;

const remind_A = ()=>
  heroW("REMINDERS","Off","Three reminders, each switchable on its own. Nothing is sent that isn't listed below — and you can read every one before you agree to any of it.")
+ `<div class="btn-row" style="margin:12px 0 0"><button type="button" class="btn"
    style="flex:1">Turn on reminders</button></div>`
+ sec("What you would get")
+ group(
    item("Training","Which session is up, at an hour you choose. Skipped on a day you have already trained.",
      remPreview("Legs A today.","Squat, RDL, split squat.","Weekdays at 17:00"))
  + item("Bedtime","A nudge to start the sleep clock at 22:30.",
      remPreview("Night starts now.","Tap to start the sleep clock.","Every night at 22:30"))
  + item("Morning","The check-in, once you are up.",
      remPreview("How did you sleep?","One tap, then the day's session.","Each morning")))
+ says("Turning it on asks your phone for permission. Nothing is scheduled until you pick the hours.");

const remind_B = ()=>
  hero("REMINDERS ON","0","of 3","None are on. Turn them on and each one is switched separately.")
+ `<div class="btn-row" style="margin:12px 0 0"><button type="button" class="btn"
    style="flex:1">Turn on reminders</button></div>`
+ sec("Training")
+ group(tog("Which session is up","At an hour you choose. Skipped on a day you have already trained.",false)
  + `<div class="sd-item">${remPreview("Legs A today.","Squat, RDL, split squat.","Pick a time")}</div>`)
+ sec("Bedtime")
+ group(tog("Start the sleep clock","At 22:30, your night-start time.",false)
  + `<div class="sd-item">${remPreview("Night starts now.","Tap to start the sleep clock.","Every night at 22:30")}</div>`)
+ sec("Morning")
+ group(tog("The morning check-in","Once you are up, before the day's session.",false))
+ more("Why a reminder might not arrive", group(item("","",
    `<div class="sd-sub">Checks notification permission, the service worker, and whether a
     subscription reached the server — so you can confirm a fix without waiting until six in the morning.</div>`)));

const remind_C = ()=>
  heroW("REMINDERS","Off","Nothing is sent until you turn these on.")
+ list(
   row("Reminders","Off",true,
     `<div class="btn-row" style="margin:0"><button type="button" class="btn" style="flex:1">Turn on reminders</button></div>`
     + says("Asks your phone for permission. Nothing is scheduled until you pick the hours."))
 + row("Training","—") + row("Bedtime","—") + row("Morning","—"))
+ more("Why a reminder might not arrive", group(item("","",
    `<div class="sd-sub">Permission, service worker, subscription. Checked here rather than
     at six in the morning.</div>`)));

/* ---------- Share with a coach ---------- */
const SHX=[["Bodyweight and measurements","Your weigh-ins and any tape measurements, as a trend."],
  ["Sleep and check-ins","The hours and the energy ratings behind the readiness numbers."],
  ["Niggles and injuries","What hurts, where, and what the app is doing about it."],
  ["Session notes","Anything you have typed about a session or an exercise."]];

const share_A = ()=>
  heroW("SHARE WITH A COACH","No live links","A link opens a read-only page: your plan, what each muscle has been getting, where the lifts are going. They cannot change your log and do not need the app.")
+ `<div class="btn-row" style="margin:12px 0 0"><button type="button" class="btn"
    style="flex:1">Make a link</button></div>`
+ sec("It expires on its own")
+ seg([{v:7,t:"7 days"},{v:30,t:"30 days"},{v:90,t:"90 days"}],30)
+ says("Thirty days unless you change it, ninety at the very most. <b>A link that never expires is one you will have forgotten about by the time it matters.</b>")
+ sec("What goes in it")
+ group(SHX.map(([t,s2])=> tog(t,s2,false)).join(""))
+ says("The plan and what you have done against it always go. Never shared, whatever you turn on: your account id, your recovery key, your reminder subscriptions. The snapshot is checked before it leaves this device and <b>refuses to send rather than trimming itself</b>.");

const share_B = ()=>
  hero("THIS LINK LASTS","30","days",
    "Then it stops working, for everyone who has it. You can revoke it sooner.")
+ seg([{v:7,t:"7 days"},{v:30,t:"30 days"},{v:90,t:"90 days"}],30)
+ says("Ninety at the very most. A link that never expires is one you will have forgotten about by the time it matters.")
+ sec("Four things that stay out unless you say")
+ group(SHX.map(([t,s2])=> tog(t,s2,false)).join(""))
+ sec("Make it")
+ group(item("","Your plan and what you have done against it always go in.",
    `<div class="btn-row" style="margin:0"><button type="button" class="btn" style="flex:1">Make a link</button></div>`,
    "Never shared: your account id, your recovery key, your reminder subscriptions. Checked before it leaves the device."))
+ more("Live links", group(item("","Nothing is readable right now.","")));

const share_C = ()=>
  heroW("SHARE WITH A COACH","No live links","Tap to set one up.")
+ list(
   row("Make a link","None live",true,
     `<div class="btn-row" style="margin:0"><button type="button" class="btn" style="flex:1">Make a link</button></div>`
     + says("A read-only page. They cannot change your log and do not need the app or an account."))
 + row("Expires after","30 days")
 + row("Bodyweight","Left out") + row("Sleep and check-ins","Left out")
 + row("Niggles and injuries","Left out") + row("Session notes","Left out"));

Object.assign(window.SD, {day_A,day_B,day_C,
  remind_A,remind_B,remind_C, share_A,share_B,share_C});
/* =====================  BATCH 4 — the action screens  =====================
   One pass each, in the language the nine picks settled: hero, the control, a says line,
   labelled groups, More, and the app's own .btn for anything that is a verb. */

/* ---------- Your account ---------- */
const acct_1 = ()=>
  heroW("SIGNED IN AS","Fer","Your plan, workouts and settings are stored on this device under this account.")
+ sec("The two halves of your account")
+ group(
    `<div class="sd-item"><div class="sd-label">Your Element 26 User ID</div>
      <div class="sd-key"><code>E26-7K4Q-2M18</code>
        <button type="button" class="btn ghost small" style="width:auto;padding:9px 14px">Copy</button></div>
      <p class="sd-sub" style="margin-top:7px">Identifies the account. It opens nothing on its own.</p></div>`
  + `<div class="sd-item"><div class="sd-label">Recovery key</div>
      <div class="sd-key is-hidden"><code>•••• •••• •••• ••••</code>
        <button type="button" class="btn ghost small" style="width:auto;padding:9px 14px">Show</button></div>
      <p class="sd-sub" style="margin-top:7px">The half that proves the account is yours. Not for sharing.</p></div>`)
+ says("You need the ID <b>and</b> the key to sign in somewhere else. Keep both private.")
+ sec("Cloud backup")
+ group(tog("Back up to the cloud","Off. Everything lives on this device and nowhere else.",false))
+ more("Signing out", group(item("","Reversible. Your data stays on this device.",
    `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Sign out</button></div>`,
    "Deleting the account for good lives with the other irreversible action, under <b>Your data</b>.")));

/* ---------- Your data ---------- */
const data_1 = ()=>
  hero("LOGGED ON THIS DEVICE","74","sessions",
    "One file holds all of it: every workout, your plan, your split and your settings.")
+ `<div class="btn-row" style="margin:12px 0 0">
    <button type="button" class="btn" style="flex:1">Export my data</button>
    <button type="button" class="btn ghost small" style="flex:0 0 auto">Import a file</button></div>`
+ says("No passwords or keys are ever written into the file. This browser has <b>not</b> granted persistent storage, so it may clear this app's data if the device runs short — an exported file is the copy nobody can clear.")
+ more("Repairs — three things worth checking", group(
    item("Been logging wrong?","Whether a barbell number meant the bar plus plates or just the plates.",
      `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Check my logged weights</button></div>`)
  + item("Dips and pull-ups logged without you","Bodyweight sets that may be missing your weight.",
      `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Check my bodyweight sets</button></div>`)))
+ `<div class="sd-sec sd-sec-danger">There is no way back from these</div>`
+ `<div class="sd-group sd-danger">`
  + item("Erase my training data","Your plan and every workout logged on this device. The account itself stays — sign in again and you start empty.",
      `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small danger" style="flex:1">Erase my training data</button></div>`)
  + item("Delete my account","The account itself, and everything stored against it. No copy anywhere.",
      `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small danger" style="flex:1">Delete account</button></div>`,
      "Export a backup above first if there is any chance you want the log later.")
+ `</div>`;

/* ---------- Plan patches ---------- */
const patch_1 = ()=>
  heroW("PLAN PATCHES","None applied yet","A patch is a written change to your plan: paste it, read exactly what it would do, then apply it. Everything it does can be taken back.")
+ sec("Paste a patch")
+ group(`<div class="sd-item">
    <textarea class="sd-ta" rows="5" spellcheck="false"
      placeholder='{"e26patch": 1, "note": "why", "ops": [ ... ]}'></textarea>
    <div class="btn-row" style="margin:10px 0 0">
      <button type="button" class="btn" style="flex:1">Preview</button>
      <button type="button" class="btn ghost small" style="flex:0 0 auto">Copy the format</button></div>
  </div>`)
+ says("Nothing is written until you have seen the preview and pressed Apply. The format is for developers — <b>Copy the format</b> hands over the spec and your current plan together.")
+ more("What a patch can change", group(item("","",
    `<div class="sd-sub">Sets, reps, load, rest and RPE on a slot; renaming or replacing a
     movement; adding and removing slots; reordering a day; and notes. Nineteen operations
     in all.</div>`)));

/* ---------- Storage ---------- */
const storage_1 = ()=>
  hero("ON THIS DEVICE","1.8","MB of 5",
    "36% used. Everything on this screen removes something, so the export comes first.")
+ `<div class="sto-bar" style="margin:4px 0 0"><span class="sto-fill" style="width:36%"></span></div>`
+ `<div class="btn-row" style="margin:14px 0 0"><button type="button" class="btn" style="flex:1">Export raw data</button></div>`
+ says("Reads this device's storage directly as text, so it works even when a screen will not draw. GitHub sync tokens are left out; your account key is in it, so keep the file private.")
+ sec("Can be freed — 412 KB")
+ group(
    item("Rescue backups","Three copies of your data from before a risky change. 243 KB.",
      `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Free all three</button></div>`,
      "You lose the ability to roll back to before those changes. Your log is untouched.")
  + item("Patch snapshots","Two, 119 KB.",
      `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Free both</button></div>`,
      "Undo keeps working on each patch's own changes; only the whole roll-back goes.")
  + item("Saved research","50 KB.",
      `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Free it</button></div>`,
      "Papers you have opened or saved stop being readable offline until the next fetch."))
+ more("What cannot be freed here — 1.4 MB", group(item("","",
    `<div class="sd-sub">Your sessions, plan, settings, gyms, volume landmarks, plan history
     and account. Listed because an honest answer to what is taking the room has to include
     them, and that is all — there is no delete button, not a disabled one.</div>`)));

/* ---------- Help ---------- */
const help_1 = ()=>
  hero("ELEMENT 26","2026.11.17.41",null,"What changed, how the app works, and how to tell somebody when it misbehaves.")
+ sec("Reading")
+ group(
    item("What changed in this version","Research that says what the service actually said, one place to export your raw data, and Settings › Storage.",
      `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Read what changed</button></div>`)
  + item("The tour","Twelve steps on cycles, rep ranges, RPE, logging a set and grades. About a minute, and it changes nothing.",
      `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Show the tour again</button></div>`))
+ sec("Something's wrong")
+ group(item("Report a problem","Goes to whoever maintains Element 26 with the version you are on and any errors the app caught.",
    `<div class="btn-row" style="margin:0"><button type="button" class="btn ghost small" style="flex:1">Report a problem</button></div>`,
    "<b>Never your workouts.</b>"));

/* ---------- Licensing ---------- */
const legal_1 = ()=>
  heroW("LICENSING","Open source","The work Element 26 uses, who made it, and under what terms.")
+ sec("The anatomy drawings")
+ group(item("MuscleMap","Copyright (c) 2026 Melih Colpan, used under the MIT licence.","",
    "The licence has one obligation and this screen is it: its copyright and permission notice travel with the work, carried rather than linked — a link is a promise that a server somewhere keeps answering, and these drawings ship offline."))
+ more("The MIT licence in full", group(`<div class="sd-item">
    <pre class="sd-pre">MIT License

Copyright (c) 2026 Melih Colpan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction…</pre></div>`));

Object.assign(window.SD, {acct_1,data_1,patch_1,storage_1,help_1,legal_1});



})();
