/* PASS 3 — EVERY SECONDARY INTERFACE. The sheets are where most of this product's
   thinking lives, and they are the part nobody photographs. */
import { boot, calm, OUT } from './_boot.mjs';
import { SEED } from './_seed.mjs';
import path from 'node:path';

const {b, p, errs} = await boot();
await calm(p);
await p.evaluate(SEED);
await calm(p);

/* Each entry: [label, what to run]. Run in a live session where the sheet needs one. */
const CALLS = [
  ["glossary",        ()=> openGlossary("rpe")],
  ["muscle-group",    ()=> openGroupDetail("chest")],
  ["muscle-head",     ()=> openMuscleDetail("upper_chest")],
  ["vol-fix",         ()=> openVolFix("side_delts")],
  ["vol-adjust",      ()=> openVolAdjust("chest")],
  ["weak-point",      ()=> openWeakPoint(0)],
  ["landmark-chain",  ()=> openLandmarkChain("chest")],
  ["hurt",            ()=> openHurt("Overhead Press")],
  ["flags",           ()=> openFlags()],
  ["max-sheet",       ()=> openMaxSheet("Barbell Bench Press")],
  ["records",         ()=> { TAB="history"; render(); const r=document.querySelector("[data-records]"); if(r) r.click(); }],
  ["session-editor",  ()=> openSessionEditor(S.sessions[S.sessions.length-1].id)],
  ["plan-history",    ()=> openPlanHistory()],
  ["day-edit",        ()=> { TAB="program"; DAY_EDIT=DAYS[0]; render(); }],
  ["add-exercise",    ()=> openAddExercise(DAYS[0])],
  ["switch-exercise", ()=> openSwitchExercise(DAYS[0], 0)],
  ["ex-editor",       ()=> openExEditor(DAYS[0], 0)],
  ["exercise-intro",  ()=> openExerciseIntro("Barbell Bench Press")],
  ["muscle-editor",   ()=> openMuscleEditor("Barbell Bench Press")],
  ["split-editor",    ()=> openSplitEditor()],
  ["profile-picker",  ()=> openProfilePicker()],
  ["profile-manage",  ()=> openProfileManage()],
  ["gym-kit",         ()=> openGymKit(gymList()[0] && gymList()[0].id)],
  ["bar-modal",       ()=> openBarModal("bar")],
  ["time-box",        ()=> openTimeBox()],
  ["travel",          ()=> openTravel()],
  ["body-log",        ()=> openBodyLog(todayStr())],
  ["tape-convert",    ()=> openTapeConvert("cm")],
  ["sleep-sheet",     ()=> openSleepSheet()],
  ["push-sheet",      ()=> openPushSheet()],
  ["morning-sheet",   ()=> openMorningSheet()],
  ["report",          ()=> openReportSheet()],
  ["whats-new",       ()=> openWhatsNew()],
  ["bw-fix",          ()=> openBwFix()],
  ["log-fix",         ()=> openLogFix()],
  ["test-week",       ()=> openTestWeekEditor(0)],
  ["streak-week",     ()=> openStreakWeek(streakWeekKeyAt(Date.now()))],
  ["voice-help",      ()=> openVoiceHelp()],
  ["prior-training",  ()=> openPriorTrainingAsk()],
  ["sides-picker",    ()=> openSidesPicker({name:"Single-Arm Dumbbell Row"})]
];

for(const [name, fn] of CALLS){
  try{
    await p.evaluate(()=>{ try{ hideModal(); }catch(e){} });
    await p.waitForTimeout(80);
    await p.evaluate("(" + fn.toString() + ")()");
    await p.waitForTimeout(420);
    const open = await p.evaluate(()=>{
      const bg = document.getElementById("modalBg");
      return !!(bg && bg.classList.contains("show"));
    });
    const th = await p.evaluate(()=>{ const t = document.getElementById("toasts"); if(t) t.innerHTML=""; return 1; });
    await p.screenshot({path: path.join(OUT, "s-" + name + ".png")});
    const tall = await p.evaluate(()=>{
      const m = document.getElementById("modal");
      return m ? Math.round(m.scrollHeight) : 0;
    });
    console.log("  s-" + name + (open ? "" : "   [NOT A MODAL]") + "   " + tall + "px");
  }catch(e){
    console.log("  s-" + name + "   FAILED: " + String(e.message).slice(0, 90));
  }
}

/* Sheets that only exist inside a live session. */
await p.evaluate(()=>{ try{ hideModal(); }catch(e){}
  startWorkout(DAYS[0]);
  const pf = document.getElementById("preflight"); if(pf) pf.remove(); try{PF=null}catch(e){}
  TAB = "workout"; render(); });
await calm(p);
const LIVE = [
  ["ex-overflow",   ()=> document.querySelector("[data-exmore]").onclick()],
  ["ex-note",       ()=> openExNote(0)],
  ["swap",          ()=> openSwapModal(0)],
  ["pick",          ()=> openPickModal(0)],
  ["add-set-sheet", ()=> openAddSetSheet(0)],
  ["rest-ui",       ()=> { startRest(0,0); showRestUI(false); }]
];
for(const [name, fn] of LIVE){
  try{
    await p.evaluate(()=>{ try{ hideModal(); hideRestUI(); }catch(e){} });
    await p.waitForTimeout(80);
    await p.evaluate("(" + fn.toString() + ")()");
    await p.waitForTimeout(420);
    await p.evaluate(()=>{ const t = document.getElementById("toasts"); if(t) t.innerHTML=""; });
    await p.screenshot({path: path.join(OUT, "s-" + name + ".png")});
    console.log("  s-" + name);
  }catch(e){
    console.log("  s-" + name + "   FAILED: " + String(e.message).slice(0, 90));
  }
}

console.log("errors:", errs.length ? errs.slice(0,4).join(" | ") : "none");
await b.close();
