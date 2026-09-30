import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {specialEvents} from '../js/special-events.js';
const root = new URL('../', import.meta.url);
const schedule = fs.readFileSync(new URL('data/ikigai_schedule.json', root), 'utf8');
assert.equal(schedule, execFileSync('git', ['show', '8fa459e:data/ikigai_schedule.json'], {cwd: root, encoding: 'utf8'}), 'Existing schedule must remain untouched');
assert.equal(specialEvents.length, 5);
assert.equal(new Set(specialEvents.map(e=>e.slug)).size, 5);
for (const event of specialEvents) {
  assert.ok(event.title && event.where && event.when.includes('JST'));
  assert.ok(event.image.endsWith('.jpg') && event.details.length);
  assert.ok(!JSON.parse(schedule).sessions.some(s=>s.community_slug === event.slug));
  assert.ok(!/Thursday Gathering/i.test(event.title));
}
const html=fs.readFileSync(new URL('index.html', root),'utf8');
assert.ok(html.indexOf('id="special-events"') < html.indexOf('id="timeline"'));
console.log('PASS: five special events, unique booking destinations, placed above timeline; schedule unchanged.');
