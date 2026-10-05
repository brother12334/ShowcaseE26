import { chromium, APP_URL, shot, appFile, fileUrl } from './_e26.mjs';
const b=await chromium.launch();
const go = async (label, mut)=>{
  const p=await b.newPage({viewport:{width:390,height:900}});
  p.on('pageerror',e=>console.log('ERR',e.message)); p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{localStorage.clear();
   localStorage.setItem('e26.account',JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'F',createdAt:1,cloud:false,ns:''}));
   localStorage.setItem('e26.ns0','E26-X');});
  await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof S!=='undefined'&&!!S);
  console.log('\n===== '+label+' =====');
  console.log(await p.evaluate(m=>{
    S.setup={name:"F",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
    new Function('S','DAYS','REST_SECOND', m)(S, DAYS, REST_SECOND);
    let i=0;
    for(let d=20; d>=2; d--){ if(d%3===2) continue;
      const wid=ROTATION[(i++)%ROTATION.length]; const prog=(S.program[wid]||[]);
      S.sessions.push({id:"s"+d,date:dayStr(Date.now()-d*86400e3),workoutId:wid,
        startedAt:Date.now()-d*86400e3,finishedAt:Date.now()-d*86400e3+3300e3,feel:3,
        entries:prog.map((e,k)=>({name:e.name,
          sets:Array.from({length:e.sets||3},()=>({weight:String(60+k*10),reps:"12",rpe:"8",done:true,rest:90}))}))}); }
    save();
    const A=bodyAnalysis();
    const before=[]; DAYS.forEach(wd=>(S.program[wd]||[]).forEach(e=>{
      const mm=musclesFor(e.name)||{}; if(mm.obliques>=0.5) before.push(widName(wd)+' · '+e.name+' ×'+e.sets+' @'+e.reps+' r'+e.rest); }));
    const sp=spreadPlan(A,'obliques',3,[]);
    if(!sp) return 'no spread plan';
    // the copy, through the real builder
    const w={muscle:'obliques', kind:'under', avoid:[]};
    const fp=findingPlan(w,A);
    // and carry it out
    const cl=cycleLandmarks(A,'obliques');
    const need=Math.max(1,Math.ceil((cl.mev||0)-planCycleVolume('obliques')));
    const fp2=spreadPlan(A,'obliques',Math.min(8,need),[]);
    return 'BEFORE:\n  '+(before.join('\n  ')||'nothing trains obliques')+
      '\n\nnewExs: '+JSON.stringify(sp.newExs)+
      '\nadds:   '+JSON.stringify(sp.adds.map(a=>a.name+' '+a.from+'→'+a.to))+
      '\nfreq:   '+sp.freqBefore+' → '+sp.freqAfter+
      '\n\nfindingPlan need='+need+' (cycle floor '+r1(cl.mev)+' vs plan '+r1(planCycleVolume('obliques'))+')'+
      '\nDOES: '+(fp?fp.does:'(no plan at that need)')+
      '\nDIFF: '+(fp?fp.list.join('  |  '):'')+
      '\nnewExs at that need: '+JSON.stringify((fp2||{}).newExs)+
      (function(){
        if(!fp2||!(fp2.newExs||[]).length) return '';
        // carry it out the way applyFinding does, and read back what landed
        (fp2.newExs||[]).forEach(n=>{
          if(!Array.isArray(S.program[n.wid])) S.program[n.wid]=[];
          let reps="8-12", rest=REST_SECOND;
          DAYS.concat(["finisher"]).some(wid=>(S.program[wid]||[]).some(e=>{
            if(nrm(e.name)!==nrm(n.name)) return false;
            if(e.reps) reps=e.reps; if(e.rest!=null) rest=e.rest; return true; }));
          S.program[n.wid].push({name:n.name, sets:n.sets, reps, rest});
        });
        const after=[]; DAYS.forEach(wd=>(S.program[wd]||[]).forEach(e=>{
          const mm=musclesFor(e.name)||{}; if(mm.obliques>=0.5) after.push(widName(wd)+' · '+e.name+' ×'+e.sets+' @'+e.reps+' rest '+e.rest); }));
        return '\n\nAFTER APPLYING:\n  '+after.join('\n  ');
      })();
  }, mut));
  await p.close();
};
await go('You already do a side-abs movement, on one day', `
  S.program[DAYS[0]].push({name:"Russian Twist", sets:2, reps:"15-20", rest:60});
  S.lmFloor = {obliques: 12};
`);
await go('Nothing in the plan trains it — a new movement is the honest answer', `S.lmFloor={obliques:12};`);
await b.close();
