import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
globalThis.window = {};
const {matchesSession, findSpeakerSessions} = await import('../js/render.js');
const root = new URL('../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('data/ikigai_schedule.json', root)));
const baseline = JSON.parse(execFileSync('git', ['show', '4e107f3:data/ikigai_schedule.json'], {cwd:root, encoding:'utf8'}));
assert.equal(data.sessions.length, baseline.sessions.length);
const approvedFields = new Set(['time','room_label','who','community_slug','description','description_source']);
for (const [i, session] of data.sessions.entries()) {
  for (const key of new Set([...Object.keys(session), ...Object.keys(baseline.sessions[i])])) {
    if (key === 'banner' && session.presentation === 'invitation') {
      assert.equal(session.banner, 'assets/gathering-banner-no-confidential.png');
      continue;
    }
    if (!approvedFields.has(key)) assert.deepEqual(session[key], baseline.sessions[i][key], `${session.title}: preserve ${key}`);
  }
}
const session = slug => data.sessions.find(s => s.community_slug === slug);
assert.equal(session('gut-health-breakfast-koji-co-creati').day, '2026-10-01');
assert.equal(session('lunch-buffet').time, '12:35-14:00');
assert.equal(session('lunch-buffet-2').time, '12:15-13:30');
for (const slug of ['lunch-buffet','lunch-buffet-2']) assert.equal(session(slug).room_label, 'GRAND GARDEN');
assert.equal(session('opening-talk').time, '10:20-10:30');
const matcha = session('matcha-crisis-by-yumi-imamura');
assert.equal(matcha.time, '11:10-11:50');
assert.deepEqual(matcha.photos, ['imamura','goda','yamashina']);
for (const s of data.sessions.filter(s=>s.title === 'Bus Transportation')) assert.equal(s.time, '18:30-18:45');
assert.equal(session('a-conscious-pause-closing-meditatio').time, '16:30-18:00');
assert.ok(session('a-conscious-pause-closing-meditatio').who.includes('16:30-18:00'));
assert.ok(matchesSession(data, session('ask-a-digital-nomad'), new Set(), 'Maria Kinoshita'));
const maria = data.speakers.find(s=>s.name === 'Maria Kinoshita');
assert.ok(maria.bio);
assert.ok(findSpeakerSessions({...data, sessions:data.sessions.map((s,_index)=>({...s,_index}))}, maria).some(s=>s.community_slug === 'ask-a-digital-nomad'));
assert.ok(!/Nika Rey|Micaela Anne|Motojima|Mitsui|Harley Kennedy/.test(JSON.stringify(data)));
assert.ok(!data.sessions.some(s=>/Thursday Gathering/i.test(s.title)));
assert.deepEqual(data.event, baseline.event);
assert.deepEqual(data.categories, baseline.categories);
assert.deepEqual(data.rooms, {...baseline.rooms, BEACH: 'GRAND GARDEN'});
console.log('PASS: approved October corrections, booking URLs, three Matcha speakers, Maria profile, and protected structure.');
