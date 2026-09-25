import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
globalThis.window = {};
const {mergeContinuationSlots} = await import('../js/render.js');
const root = new URL('../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('data/ikigai_schedule.json', root)));
const before = JSON.parse(execFileSync('git', ['show', '998d933:data/ikigai_schedule.json'], {cwd:root, encoding:'utf8'}));
const title = 'Connection & Collaboration: Turning Networking Into Life Opportunities';
for (const [i, session] of data.sessions.entries()) {
  if (session.photos.includes('gil')) {
    assert.equal(session.title, title);
    assert.equal(session.who, 'Gil Petersil');
    assert.equal(session.note, null);
    assert.ok(session.description.length > 300);
    assert.ok(session.description_source.endsWith('range=G4'));
    for (const key of ['title','who','note','description','description_source']) before.sessions[i][key] = session[key];
  } else if (session.who === 'Gil Petersil' && session.note === 'cont') {
    assert.equal(session.title, title + ' (continued)');
    before.sessions[i].title = session.title;
  }
}
const speaker = data.speakers.find(s => s.name === 'Gil Petersil');
assert.equal(speaker.session, title);
assert.ok(speaker.bio.includes('ChaTea'));
Object.assign(before.speakers.find(s => s.name === speaker.name), {session:speaker.session, bio:speaker.bio});
assert.deepEqual(data, before, 'Only Gil content may change; all times, images, booking links and other data remain unchanged');
const merged = mergeContinuationSlots(data.sessions.map((s,_index)=>({...s,_index})));
const gil = merged.filter(s => s.who === 'Gil Petersil');
assert.equal(gil.length, 1);
assert.equal(gil[0]._displayTime, '15:00-16:45');
console.log('PASS: Gil details, no coming-soon, one 15:00–16:45 session, unrelated data preserved.');
