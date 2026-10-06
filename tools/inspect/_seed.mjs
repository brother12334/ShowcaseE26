/* A BELIEVABLE TRAINING HISTORY.

   Every screenshot in this pass is of somebody who has been training for seven months:
   real sessions with real progression, body weight that moved, two records, a settled
   niggle and an open one, notes on a couple of lifts. A product photographed empty
   photographs its own empty states, and we take those deliberately instead. */
export const SEED = function(){
  const DAY = 86400e3;
  const now = Date.now();
  const dayStr = t=> new Date(t).toLocaleDateString("en-CA");

  S.setup = {name:"Fer", goal:"muscle", level:"intermediate", gear:"full",
             days:4, mins:70, at: now - 215*DAY};
  S.tourDone = true;
  S.seenNews = "x";
  /* Answered, so the first start is a workout rather than a question. The ask itself is
     photographed in its own pass. */
  S.priorTrainingWeeks = 104;
  S.geo = "off";
  S.askWhy = true;
  S.splitId = "ul4";
  applySplit();
  S.prefs = Object.assign({}, S.prefs,
    {barMode:"total", barWeight:45, plateStep:2.5, sleepPrompt:false, rpe:"on"});

  /* THE PLAN. Four days, a sensible upper/lower, with the shapes the logger has to cope
     with: a barbell lift, a dumbbell lift, a machine, a cable, a unilateral movement, a
     superset pair and a bodyweight movement. */
  const E = (name, sets, reps, rpes, extra)=> Object.assign(
    {name, sets, reps, rpes}, extra || {});
  const prog = {};
  prog[DAYS[0]] = [
    E("Barbell Bench Press", 4, "5-8",  [7,8,8,9], {weight:185}),
    E("Weighted Pull-Up",    4, "6-10", [7,8,8,9]),
    E("Incline Dumbbell Bench Press", 3, "8-12", [8,8,9], {weight:65}),
    E("Cable Row",           3, "10-14", [8,8,9], {ss:"A"}),
    E("Cable Lateral Raise", 3, "12-20", [8,9,9], {ss:"A"}),
    E("Cable Triceps Pushdown", 3, "10-15", [8,9,9])
  ];
  prog[DAYS[1]] = [
    E("Barbell Back Squat",  4, "5-8",  [7,8,8,9], {weight:245}),
    E("Romanian Deadlift",   3, "8-12", [8,8,9], {weight:185}),
    E("Leg Press",           3, "10-15", [8,8,9]),
    E("Seated Leg Curl",     3, "10-15", [8,9,9]),
    E("Standing Calf Raise", 4, "12-20", [9,9,9,9])
  ];
  prog[DAYS[2]] = [
    E("Overhead Press",      4, "5-8",  [7,8,8,9], {weight:115}),
    E("Lat Pulldown",        4, "8-12", [7,8,8,9]),
    E("Dumbbell Bench Press", 3, "8-12", [8,8,9], {weight:70}),
    E("Single-Arm Dumbbell Row", 3, "8-12", [8,8,9], {uni:true, startSide:"L"}),
    E("Dumbbell Curl",       3, "10-15", [8,9,9], {weight:35})
  ];
  prog[DAYS[3]] = [
    E("Conventional Deadlift", 3, "3-6", [7,8,9], {weight:315}),
    E("Bulgarian Split Squat", 3, "8-12", [8,8,9], {uni:true, startSide:"L"}),
    E("Leg Extension",       3, "12-20", [8,9,9]),
    E("Hip Thrust",          3, "8-12",  [8,8,9], {weight:225}),
    E("Hanging Leg Raise",   3, "10-20", [8,9,9])
  ];
  DAYS.forEach((wid, i)=>{ S.program[wid] = (prog[wid] || prog[DAYS[0]]).map(e=> Object.assign({}, e)); });

  /* SEVEN MONTHS OF SESSIONS, four a week, with loads that climb. The numbers matter:
     the history, progress and body screens are only worth photographing if what they
     draw is a real curve rather than a flat line. */
  S.sessions = [];
  const WEEKS = 30;
  for(let w = WEEKS; w >= 1; w--){
    const base = now - w*7*DAY;
    /* A missed week, so consistency is not a straight line either. */
    const skip = (w === 11) ? 3 : (w === 19 ? 2 : 0);
    for(let d = 0; d < 4 - skip; d++){
      const wid = DAYS[d % DAYS.length];
      const at = base + d*2*DAY + 18*3600e3;
      const prg = (WEEKS - w) / WEEKS;              // 0 at the start, 1 now
      const entries = (S.program[wid] || []).map(e=>{
        const top = e.weight ? e.weight : 0;
        const load = top ? Math.round((top * (0.78 + 0.22*prg)) / 5) * 5 : "";
        const n = Math.max(1, (parseInt(e.sets,10)||3));
        return {name: e.name, uni: e.uni, startSide: e.startSide,
          sets: Array.from({length:n}, (_, i)=> ({
            weight: load ? String(load) : "",
            reps: String(Math.max(3, (parseInt(String(e.reps).split("-")[1],10)||10) - i)),
            rpe: String([7,8,8,9,9][Math.min(i,4)]),
            done: true}))};
      });
      S.sessions.push({id:"s"+w+"_"+d, workoutId: wid, date: dayStr(at),
        startedAt: at, finishedAt: at + (62 + (d%3)*6)*60e3,
        feel: [3,4,4,5][d % 4], entries});
    }
  }
  S.sessions.sort((a,b)=> a.startedAt - b.startedAt);
  S.pointer = 0;

  /* BODY: weight that trends, and a couple of tape readings. */
  S.bodyLog = {};
  for(let i = 180; i >= 0; i -= 3){
    const t = now - i*DAY;
    const drift = 178 + (180 - i) * 0.035 + (i % 7) * 0.22;
    S.bodyLog[dayStr(t)] = {w: Math.round(drift * 10) / 10};
  }
  const tape = (back, arm, waist)=>{
    const k = dayStr(now - back*DAY);
    S.bodyLog[k] = Object.assign({}, S.bodyLog[k], {arm, waist});
  };
  tape(90, 15.1, 33.4);
  tape(3, 15.6, 33.0);

  /* A SETTLED NIGGLE AND AN OPEN ONE. */
  S.hurts = [];
  try{
    hurtAdd("Overhead Press", "shoulder", "sore", "Front of the shoulder on the way up.");
    hurtAdd("Conventional Deadlift", "lowback", "sore", "");
    if(hurtLog()[1]) hurtRemove(hurtLog()[1].id);
  }catch(e){}

  delete S.streak;
  delete S.deload;
  S.active = null;
  save();
  return {sessions: S.sessions.length, days: DAYS.length, split: S.splitId};
};
