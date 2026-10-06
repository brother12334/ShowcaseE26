/* AFTER — THE SESSION AS A STACK, not a form.

   The redesign in one sentence: only the set you are on is a form. Sets behind you are
   records, sets ahead of you are prescriptions, exercises behind you are one line each.
   Built here out of the app's own classes and tokens. */
import { mockPage, LIVE, OUT } from './_mock.mjs';

const {b, p, shot, errs} = await mockPage();
await p.evaluate(LIVE, 6);

/* BEFORE, for the pair. */
await shot("A-logger-BEFORE");
await p.evaluate(()=> window.scrollTo(0, 700));
await shot("A-logger-BEFORE-scrolled");
await p.evaluate(()=> window.scrollTo(0, 0));


console.log('errors:', errs.length ? errs.slice(0,3).join(' | ') : 'none');
await b.close();
