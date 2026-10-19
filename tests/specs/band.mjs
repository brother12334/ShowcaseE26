import { chromium, APP_URL } from './_e26.mjs';
import { readFileSync } from 'node:fs';
/* THE GARMIN CIRQA CONNECTION, CHECKED AGAINST THE BYTES A REAL BAND SENT.

   Garmin publishes no protocol for this. Everything the app does was recovered from
   captures of one real CIRQA and ported from the tested BetterGarmin implementation, so
   the only thing that can honestly be called a test is: do we produce exactly the bytes
   that worked, and do we read exactly what the band actually said.

   The fixture is twelve original notification packets from one real workout — not
   synthesized, not reconstructed. Section 4 replays them through the app's own decoders. */
const FIX = JSON.parse(readFileSync(new URL('../fixtures/cirqa-real-workout-excerpt.json', import.meta.url), 'utf8'));
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:1100}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.addInitScript(()=>{ localStorage.clear();
  localStorage.setItem('e26.account', JSON.stringify({id:'E26-X',key:'k'.repeat(32),name:'Fer',createdAt:1,cloud:false,ns:''}));
  localStorage.setItem('e26.ns0','E26-X'); });
await p.goto(APP_URL,{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=> typeof S!=='undefined' && !!S, null, {timeout:20000});
await p.evaluate(()=>{
  const sp=document.getElementById('splash'); if(sp) sp.remove();
  try{OB=null}catch(e){} hideModal(); document.body.classList.remove('ai-open','onboarding');
  S.setup={name:"Fer",goal:"muscle",level:"intermediate",gear:"full",at:Date.now()};
  S.tourDone=true; S.geo='off'; S.sleepAsked=todayStr(); S.seenNews=NEWS_FOR;
  S.prefs=Object.assign({}, S.prefs, {sleepPrompt:false, warmups:'off'});
  S.splitId=DEFAULT_SPLIT; applySplit(); save();
});
let bad=0;
const ck=(what,ok,got)=>{ console.log((ok?"  ok   ":"  BROKEN ")+what+(got===undefined?"":"  ["+got+"]")); if(!ok) bad++; };
const ev = (fn, arg)=> p.evaluate(fn, arg);

console.log("1 - THE FRAMING IS THE FRAMING");
{
  const r = await ev(()=>({
    /* CRC-16/ARC against a known vector, then the pieces a frame is made of. */
    crc: crc16Arc(new TextEncoder().encode("123456789")).toString(16),
    cobs: bandHex(cobsEncode(Uint8Array.from([0x11, 0x00, 0x22]))),
    roundTrip: bandHex(cobsDecode(cobsEncode(Uint8Array.from([1,0,2,0,0,3])).slice(1,-1))),
    register: bandHex(bandRegisterRequest()),
    /* Handles 4, 5 and 18 have all been seen on real bands; none may be assumed. */
    parsed: bandParseRegisterResponse(bandFromHex("00 01 01 00 00 00 00 00 00 00 01 00 00 12 00")),
    frag: bandFragment(5, Uint8Array.from(Array.from({length:45}, (_,i)=> i+1))).map(x=> x.length)
  }));
  console.log("   ", JSON.stringify(r));
  ck("CRC-16/ARC of the standard check string is 0xbb3d", r.crc === "bb3d", r.crc);
  ck("COBS puts a zero delimiter either side", /^00 .* 00$/.test(r.cobs), r.cobs);
  ck("and survives a round trip through zeros", r.roundTrip === "01 00 02 00 00 03", r.roundTrip);
  ck("the registration write is the tested one",
     r.register === "00 00 01 00 00 00 00 00 00 00 01 00 00", r.register);
  ck("a register response hands back its own handle", r.parsed && r.parsed.handle === 18 && r.parsed.status === 0,
     JSON.stringify(r.parsed));
  ck("writes never exceed the 20-byte budget", r.frag.every(n=> n <= 20) && r.frag[0] === 20, r.frag.join("/"));
}

console.log("\n2 - THE HANDSHAKE FRAMES, BYTE FOR BYTE");
{
  const r = await ev(()=>({
    /* The three frames verified against a real band. The host name is ours; the lengths
       and the CRC are computed from it, which is why changing it is safe. */
    info: bandHex(hostDeviceInformation(null, "BetterGarmin")),
    ack5050: bandHex(gfdiEncode(GFDI.ACK, gfdiAckPayload(GFDI.CONFIGURATION))),
    hostCfg: bandHex(hostConfiguration()),
    ours: bandHex(hostDeviceInformation()),
    decoded: (()=>{ const d = gfdiDecode(hostDeviceInformation()); return d.ok ? d.frame.messageId : "bad"; })(),
    tagged: (()=>{ const d = gfdiDecode(hostDeviceInformation(3)); return d.ok ? [d.frame.messageId, d.frame.tag] : "bad"; })()
  }));
  console.log("   ", r.ours);
  ck("the device-information reply is exact",
     r.info === "38 00 88 13 a0 13 00 71 00 ff ff ff ff ff ff 01 00 ff ff 0c 42 65 74 74 65 72 47 61 72 6d 69 6e 03 57 65 62 10 42 6c 75 65 74 6f 6f 74 68 20 63 6c 69 65 6e 74 01 21 fe", r.info);
  ck("the 5050 acknowledgement is exact", r.ack5050 === "09 00 88 13 ba 13 00 51 4e", r.ack5050);
  ck("the host configuration is exact",
     r.hostCfg === "15 00 ba 13 0e 00 02 00 00 00 00 00 00 00 00 02 80 00 02 1e a0", r.hostCfg);
  ck("ours says Element26 and still decodes", /45 6c 65 6d 65 6e 74 32 36/.test(r.ours) && r.decoded === 5000,
     String(r.decoded));
  ck("a compact header keeps its tag", JSON.stringify(r.tagged) === "[5000,3]", JSON.stringify(r.tagged));
}

console.log("\n3 - EVERY COMMAND PAYLOAD IS THE TESTED ONE");
{
  const r = await ev(()=>({
    start: bandHex(Uint8Array.from(smartActivityCommand("START"))),
    pause: bandHex(Uint8Array.from(smartActivityCommand("PAUSE"))),
    resume: bandHex(Uint8Array.from(smartActivityCommand("RESUME"))),
    save: bandHex(Uint8Array.from(smartActivityCommand("SAVE"))),
    discard: bandHex(Uint8Array.from(smartActivityCommand("DISCARD"))),
    caps: bandHex(Uint8Array.from(smartLiveCapabilities())),
    alerts: bandHex(Uint8Array.from(smartSupportedAlerts())),
    sub: bandHex(Uint8Array.from(smartSubscribeEvents()))
  }));
  console.log("   ", JSON.stringify(r, null, 0).slice(0, 200));
  ck("Start Strength, sport 10 sub-sport 20", r.start === "c2 03 0b 8a 01 08 0a 04 08 0a 10 14 10 00", r.start);
  ck("Pause", r.pause === "c2 03 05 8a 01 02 10 02", r.pause);
  ck("Resume", r.resume === "c2 03 05 8a 01 02 10 01", r.resume);
  ck("Save", r.save === "c2 03 05 8a 01 02 10 03", r.save);
  ck("Discard, the one nobody has run on a band", r.discard === "c2 03 05 8a 01 02 10 04", r.discard);
  ck("LiveSession capabilities", r.caps === "6a 05 42 03 9a 02 00", r.caps);
  ck("EventSharing supported alerts", r.alerts === "f2 01 02 22 00", r.alerts);
  ck("subscribe to LiveSession events", r.sub === "f2 01 06 0a 04 0a 02 08 13", r.sub);
}

console.log("\n4 - TWELVE REAL PACKETS FROM ONE REAL WORKOUT, REPLAYED");
{
  const r = await ev(fix=>{
    /* Driven through the session's own notification path, with the handle the band
       actually assigned that day, so the routing and the decoders are both exercised. */
    const out = {states:[], uuid:null, profile:null, responses:[], events:0};
    const sess = makeBandSession({connect:async()=>{}, write:async()=>{}, close(){}});
    sess.snapshot.routingHandle = fix.assignedHandle;
    sess.snapshot.state = "ready";
    sess.onSmart(m=>{
      if(m.kind === "request"){
        let evs = [];
        try{ evs = decodeLiveSessionEvents(m.fields); }catch(e){ out.states.push("THREW: " + e.message); }
        evs.forEach(e=>{
          out.events++;
          if(e.kind === "state") out.states.push(e.state + (e.endReason ? "/" + e.endReason : ""));
          if(e.kind === "start"){ out.uuid = e.uuid; out.profile = [e.sport, e.subSport]; }
        });
        return evs.length > 0;
      }
      try{ out.responses.push(decodeCommandResponse(m.fields).accepted); }
      catch(e){ out.responses.push("not a command response"); }
    });
    fix.notifications.forEach(n=> sess.deliver(bandFromHex(n.hex)));
    return out;
  }, FIX);
  console.log("   ", JSON.stringify(r));
  ck("the states are the ones the band reported, in order",
     r.states.join(" ") === "START WORKOUT_ACTIVE STOP START STOP SAVING ENDED/SAVED", r.states.join(" "));
  ck("the activity UUID's high half is exact", r.uuid && r.uuid.mostSignificant === "a3 48 c4 b0 74 08 1f 6e",
     r.uuid && r.uuid.mostSignificant);
  ck("and its low half", r.uuid && r.uuid.leastSignificant === "62 f7 e3 ed f1 58 8d 8c",
     r.uuid && r.uuid.leastSignificant);
  ck("the profile is Strength, 10/20", JSON.stringify(r.profile) === "[10,20]", JSON.stringify(r.profile));
  ck("all four command responses were accepted",
     r.responses.length === 4 && r.responses.every(x=> x === true), JSON.stringify(r.responses));
}

console.log("\n5 - A SIMULATED BAND, FROM REGISTRATION TO SAVED");
{
  /* A stand-in that speaks the protocol back: it answers registration with a handle that
     is NOT the default, opens the handshake itself, and replies to each Smart request.
     Everything between the app and the radio is exercised; only the radio is absent. */
  const r = await ev(async ()=>{
    const fake = {writes: [], frames: [], handle: 7, configBits: [9, 58, 81, 90, 95, 105],
                  started: false, sess: null};
    const stream = cobsStream();
    /* ANSWERED ASYNCHRONOUSLY, because a real band cannot reply inside our own write call.
       Replying synchronously let the fake's frames interleave with the fragments the app
       was still writing, which no radio would do and which only the fake could cause. */
    const send = frame=> Promise.resolve().then(()=>
      bandFragment(fake.handle, cobsEncode(frame)).forEach(w=> fake.sess.deliver(w)));
    const smartReply = (requestId, bytes)=>{
      const data = Uint8Array.from(bytes);
      send(gfdiEncode(GFDI.PB_RESPONSE, pbPayload({requestId, offset:0, total:data.length, data})));
    };
    /* The band's own event, in the shape the capture showed: EventSharing 30 -> 3 -> 1012. */
    const bandEvent = inner=>{
      const body = plfield(SMART.EVENT_SHARING, plfield(3, plfield(1012, inner)));
      const data = Uint8Array.from(body);
      send(gfdiEncode(GFDI.PB_REQUEST, pbPayload({requestId: 900, offset:0, total:data.length, data})));
    };
    const stateEvent = (state, reason)=> bandEvent(plfield(2,
      pvfield(1, state).concat(reason == null ? [] : pvfield(2, reason))));
    const io = {
      async connect(S2){ S2.deviceName = "CIRQA Smart Band"; },
      async write(bytes){
        fake.writes.push(bandHex(bytes));
        if(bytes[0] === 0){
          /* Registration, answered with handle 7 — not 4, 5 or 18, so nothing may have
             hardcoded one — and then the band opens the handshake straight away. */
          fake.sess.deliver(bandConcat([0,1], bytes.slice(2,10), bU16(1), [0, fake.handle, 0]));
          send(gfdiEncode(GFDI.DEVICE_INFO, bandConcat(bU16(151), bU16(1), [0,0,0,0], bU16(1), bU16(512),
            [5].concat(Array.from(new TextEncoder().encode("CIRQA"))))));
          return;
        }
        stream.push(bytes.slice(1)).forEach(raw=>{
          const d = gfdiDecode(raw);
          if(!d.ok){ fake.frames.push("BAD: " + d.error); return; }
          const f = d.frame;
          fake.frames.push(f.messageId);
          if(f.messageId === GFDI.ACK && f.payload[0] === 0xa0 && f.payload[1] === 0x13){
            send(gfdiEncode(GFDI.CONFIGURATION, bandConfigPayload(fake.configBits, 15)));
          } else if(f.messageId === GFDI.CONFIGURATION){
            send(gfdiEncode(GFDI.ACK, Uint8Array.from([0xba, 0x13, 0x00])));
          } else if(f.messageId === GFDI.PB_REQUEST){
            const c = pbParse(f.payload);
            send(gfdiEncode(GFDI.ACK, Uint8Array.from(bU16(GFDI.PB_REQUEST).concat([0], bU16(c.requestId), [0,0,0,0,0,0]))));
            const body = pDecode(c.data) || [];
            const top = body[0] ? body[0].field : 0;
            if(top === SMART.CORE)                     // LiveSession capabilities: yes, remote terminate
              smartReply(c.requestId, plfield(SMART.CORE, plfield(9, plfield(35, pvfield(1,1).concat(pvfield(2,1))))));
            else if(top === SMART.EVENT_SHARING){
              const inner = pDecode(body[0].value) || [];
              if(inner[0] && inner[0].field === 4)     // supported alerts: 19 among them
                smartReply(c.requestId, plfield(SMART.EVENT_SHARING, plfield(5, pvfield(1,19))));
              else                                      // subscription confirmed for 19
                smartReply(c.requestId, plfield(SMART.EVENT_SHARING, plfield(2,
                  plfield(1, pvfield(1,0).concat(plfield(2, pvfield(1,19)))))));
            } else if(top === SMART.LIVE_SESSION){
              smartReply(c.requestId, plfield(SMART.LIVE_SESSION, plfield(18, [])));
              const cmd = pDecode(pDecode(body[0].value)[0].value);
              const which = (cmd.find(x=> x.field === 2) || {}).value;
              if(which === 0){ fake.started = true; setTimeout(()=> stateEvent(0), 5); }
              else if(which === 2) setTimeout(()=> stateEvent(1), 5);
              else if(which === 3) setTimeout(()=> stateEvent(5), 5);
            }
          }
        });
      },
      close(){}
    };
    BAND = makeBandSession(io);
    fake.sess = BAND;
    BAND.onSmart(bandHandleMessage);
    await BAND.open();
    const afterOpen = {state: BAND.state, handle: BAND.snapshot.routingHandle};
    await bandPrepareActivity();
    const support = JSON.parse(JSON.stringify(BAND_ACT.support));
    /* A workout is running, so the start has somewhere to stamp its activity id. */
    S.active = {id:"w1", workoutId:ROTATION[0], date:todayStr(), startedAt:Date.now(), entries:[]};
    const first = bandSendCommand("START");
    const second = bandSendCommand("START");       // the double tap
    await new Promise(r2=> setTimeout(r2, 120));
    const afterStart = JSON.parse(JSON.stringify(BAND_ACT.command));
    bandSendCommand("SAVE");
    await new Promise(r2=> setTimeout(r2, 150));
    const afterSave = JSON.parse(JSON.stringify(BAND_ACT.command));
    return {afterOpen, support, first, second, afterStart, afterSave,
            bandState: BAND_ACT.bandState,
            sawRegister: fake.writes[0], frames: fake.frames};
  });
  /* No BAD entries here is itself the assertion that a frame is atomic on the wire:
     the fake rejects anything whose length prefix disagrees with what it reassembled. */
  ck("every frame the band received was intact",
     (r.frames||[]).every(f=> String(f).indexOf("BAD") < 0), (r.frames||[]).join(","));
  console.log("   ", JSON.stringify(r.afterOpen), JSON.stringify(r.support), "| start:",
              JSON.stringify(r.afterStart), "| save:", JSON.stringify(r.afterSave));
  ck("it registers and finishes the handshake", r.afterOpen.state === "ready", r.afterOpen.state);
  ck("ON THE HANDLE THE BAND CHOSE, not a hardcoded one", r.afterOpen.handle === 7, String(r.afterOpen.handle));
  ck("the registration write is the tested one",
     r.sawRegister === "00 00 01 00 00 00 00 00 00 00 01 00 00", r.sawRegister);
  ck("workout control checks out", r.support.state === "ready", JSON.stringify(r.support));
  ck("Start is sent", r.first === true, String(r.first));
  ck("A SECOND START IS REFUSED, so a double tap cannot open two activities",
     r.second === false, String(r.second));
  ck("and it reaches confirmed, not merely acknowledged",
     r.afterStart && r.afterStart.stage === "confirmed", r.afterStart && r.afterStart.stage);
  ck("Save confirms on SAVING", r.afterSave && r.afterSave.stage === "confirmed"
     && /SAVING/.test(r.afterSave.confirmedBy || ""), r.afterSave && r.afterSave.confirmedBy);
}

console.log("\n6 - AND THE WORKOUT NEVER DEPENDS ON ANY OF IT");
{
  const r = await ev(()=>{
    /* The band vanishes mid-session, which is the ordinary case: a dead battery, a walk
       out of range, a phone that slept. */
    BAND.lost();
    const lostState = BAND.state;
    const sent = bandSendCommand("SAVE");
    S.active.entries = [{name:"Barbell Bench Press", reps:"8-12",
      sets:[{weight:"100", reps:"10", rpe:"8", done:true, at: Date.now()}]}];
    save();
    const before = S.sessions.length;
    finishWorkout();
    return {lostState, sent, logged: S.sessions.length - before,
            kept: !!(S.sessions[S.sessions.length-1] || {}).entries,
            uuidStored: !!(S.sessions[S.sessions.length-1] || {}).bandActivity,
            chip: bandChipHTML()};
  });
  console.log("   ", JSON.stringify(r).slice(0, 200));
  ck("the session is marked disconnected", r.lostState === "disconnected", r.lostState);
  ck("a command to a band that is gone simply says no", r.sent === false, String(r.sent));
  ck("THE WORKOUT STILL SAVES", r.logged === 1 && r.kept, r.logged + " session, entries " + r.kept);
  ck("and nothing invents an activity id it never received", r.uuidStored === false, String(r.uuidStored));
  ck("the chip says the band is gone rather than lying about it",
     r.chip === "" || /disconnected/i.test(r.chip), r.chip.slice(0, 80));
}

console.log("\n7 - THE ACTIVITY ID IS STORED WHEN THE BAND REPORTS ONE, AND ONLY THEN");
{
  const r = await ev(()=>{
    S.active = {id:"w2", workoutId:ROTATION[0], date:todayStr(), startedAt:Date.now(), entries:[]};
    const before = S.active.bandActivity;
    /* The UUID halves exactly as the real band sent them, as fixed64 wire bytes. */
    bandStampWorkout({mostSignificant:"a3 48 c4 b0 74 08 1f 6e", leastSignificant:"62 f7 e3 ed f1 58 8d 8c"});
    const after = S.active.bandActivity;
    S.active.bandActivity = undefined;
    bandStampWorkout(null);
    return {before, after, afterNull: S.active.bandActivity};
  });
  console.log("   ", JSON.stringify(r));
  ck("nothing is stored before the band says anything", r.before === undefined, String(r.before));
  ck("the halves are kept as the band sent them, not as numbers",
     r.after && r.after.mostSignificant === "a3 48 c4 b0 74 08 1f 6e"
     && r.after.leastSignificant === "62 f7 e3 ed f1 58 8d 8c", JSON.stringify(r.after));
  ck("AND NOTHING IS GUESSED when no id ever arrives", r.afterNull === undefined, String(r.afterNull));
}

console.log("\n8 - THE SETTINGS PAGE SAYS WHAT IT IS");
{
  const r = await ev(()=>{
    BAND = null;
    TAB="sync"; SET_PAGE=null; render();
    const tile = document.querySelector('[data-setopen="band"]');
    if(!tile) return {none:true};
    tile.click();
    const t = document.body.textContent || "";
    return {label: tile.getAttribute("aria-label") || "", page: SET_PAGE,
            experimental: /experimental/i.test(t),
            firstRule: /Element 26 always comes first/i.test(t),
            noCloud: /no Garmin account, no cloud/i.test(t),
            connect: !!document.getElementById("bandConnect"),
            showAll: !!document.getElementById("bandShowAll"),
            control: /Workout control:/.test(t),
            log: /Protocol log/.test(t),
            help: /Apps allowed to connect/.test(t),
            noForget: !/forget, unpair or reset/i.test(t) || /Never forget, unpair or reset/i.test(t)};
  });
  console.log("   ", JSON.stringify(r));
  ck("there is a row for it", !r.none, String(!r.none));
  ck("it opens", r.page === "band", String(r.page));
  ck("LABELLED EXPERIMENTAL, because that is what it is", r.experimental, String(r.experimental));
  ck("and says the workout comes first", r.firstRule, String(r.firstRule));
  ck("and that no account or cloud is involved", r.noCloud, String(r.noCloud));
  ck("connect and show-all are both offered", r.connect && r.showAll, "connect:"+r.connect+" all:"+r.showAll);
  ck("workout control has its own line", r.control, String(r.control));
  ck("the protocol log is there for a bug report", r.log, String(r.log));
  ck("the Garmin Connect clash is explained", r.help, String(r.help));
  ck("and nobody is told to forget or reset the band", r.noForget, String(r.noForget));
}

console.log(errs.length ? ("PAGE ERRORS: "+errs.join(" | ")) : "no page errors");
if(errs.length) bad++;
console.log(bad ? ("BROKEN: "+bad) : "all good");
await b.close();
process.exit(bad ? 1 : 0);
