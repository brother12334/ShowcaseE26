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
const step = (v,unit)=> `<div class="sd-step">
  <button type="button" aria-label="Less">−</button>
  <div class="sd-step-v" role="spinbutton" tabindex="0" aria-valuenow="${E(v)}">${E(v)}${unit?`<i>${E(unit)}</i>`:""}</div>
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
      step(45,"lb"),"Warm-ups come off this. <b>Plates are asked for separately</b>, under Where you train.")
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
})();
