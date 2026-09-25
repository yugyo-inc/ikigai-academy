import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('data/ikigai_schedule.json', root)));
const previous = JSON.parse(execFileSync('git', ['show', 'a9f16b7:data/ikigai_schedule.json'], {cwd: root, encoding: 'utf8'}));
// Approved September 25 portrait addition; all descriptions and other fields remain protected.
previous.sessions.find(s => s.who === 'Christian Pedersen').photos = ['christian-pedersen'];
previous.speakers.find(s => s.name === 'Christian Pedersen').photos = ['christian-pedersen'];
const stripDescriptions = input => ({...input, sessions: input.sessions.map(({description, description_source, ...rest}) => rest)});
assert.deepEqual(stripDescriptions(data), stripDescriptions(previous), 'Only descriptions and their provenance may change');
const described = data.sessions.filter(s => s.description);
assert.equal(described.length, 31);
assert.equal(described.length - previous.sessions.filter(s => s.description).length, 27);
for (const session of described) {
  const words = session.description.trim().split(/\s+/).length;
  assert.ok(words >= (session.title.startsWith('Latino Dance') ? 60 : 100) && words <= 150, session.title + ': ' + words);
  const url = new URL(session.description_source);
  assert.ok(['community.colivefukuoka.com', 'docs.google.com'].includes(url.hostname));
  assert.ok(!/tbd|coming soon|≈|JP \(/i.test(session.description), 'No draft markers: ' + session.title);
}
assert.ok(data.sessions.filter(s => s.note === 'soon' || s.note === 'cont').every(s => !s.description));
assert.ok(data.sessions.filter(s => s.kind === 'evening' || s.title === 'Bus Transportation').every(s => !s.description), 'Keep banner-only services minimal');
console.log('PASS: 31 sourced session descriptions; 27 additions; 100–150 words except the brief dance source; all other data unchanged.');
