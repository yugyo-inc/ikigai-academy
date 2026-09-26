import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.window = {};
const {buildTimelineLayout} = await import('../js/render.js');
const data = JSON.parse(fs.readFileSync(new URL('../data/ikigai_schedule.json', import.meta.url)));
for (const [day, time] of [['2026-10-01', '12:30-14:00'], ['2026-10-02', '12:15-13:30']]) {
  const source = data.sessions.filter(s => s.day === day);
  const snapshot = JSON.stringify(source);
  const layout = buildTimelineLayout(source);
  const lunch = layout.sessions.filter(s => /^Lunch Buffet\b/i.test(s.title));
  assert.equal(lunch.length, 1);
  assert.equal(lunch[0].room, 'ALL');
  assert.equal(lunch[0].time, time);
  assert.ok(lunch[0].community_slug);
  assert.equal(JSON.stringify(source), snapshot, 'Source venue and session data remain intact');
}
console.log('PASS: both lunches use the shared timeline row, retain time and booking, and preserve source data.');
