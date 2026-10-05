/* What "weights go up on their own" actually does, end to end. */
import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:900}});
p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>{console.log('   PROMPTED:',d.message().replace(/\n+/g,' ')); d.accept();});
await p.addInitScript(()=>{localStorage.clear();
 localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
 localStorage.setItem('e26.ns0','E26-X');});
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
for(const mode of ['auto','ask','hold']){
  console.log('\n===== progression = "'+mode+'" =====');
  console.log(await p.evaluate(m=>{
    S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
    S.prefs=Object.assign({},S.prefs,{progression:m});
    const N="Leg Extension";
    S.program[DAYS[0]]=[{name:N, sets:3, reps:"10-15", weight:"45", rest:90}];
    S.sessions=[]; S.planLog=[];
    // a session that clearly earns a raise: last set hits the top of the range at target RPE
    const sess={id:"s1", date:todayStr(), workoutId:DAYS[0], startedAt:Date.now()-3e6,
      finishedAt:Date.now(), feel:3,
      entries:[{name:N, reps:"10-15", sets:[{weight:"45",reps:"15",rpe:"8",done:true},
                              {weight:"45",reps:"15",rpe:"8",done:true},
                              {weight:"45",reps:"15",rpe:"8",done:true}]}]};
    sess.progression = buildProgression(sess);
    if(trainPrefs().progression === "auto" && !deloadActive()){
      sess.progression.filter(x=> x.kind==="up" && x.to!=null).forEach(x=>{
        if(applyProgression(x.name, x.to, null, progReason(x))) x.auto = true; });
    }
    S.sessions.push(sess); save();
    const e = findProgramEntry(N);
    const up = (sess.progression||[]).find(x=>x.kind==="up");
    return '  verdict on the card : '+(up ? up.msg : '(none)')+
         '\n  plan weight after   : '+e.weight+(e.weight==45?'  (unchanged)':'  (moved on its own)')+
         '\n  marked auto-applied : '+(up ? !!up.auto : '-')+
         '\n  chip on the exercise: '+(e.byApp ? e.byApp.what+'  ('+fmtDateShort(dayStr(e.byApp.at))+')' : '(none)')+
         '\n  in the plan history : '+((S.planLog||[]).length ? S.planLog[S.planLog.length-1].changes.join(' / ') : '(nothing logged)');
  }, mode));
}
await b.close();
