import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
globalThis.window = {};
const { findSpeakerSessions } = await import('../js/render.js');
const root = new URL('../', import.meta.url);
const read = ref => JSON.parse(execFileSync('git', ['show', ref + ':data/ikigai_schedule.json'], { cwd: root, encoding: 'utf8' }));
const data = JSON.parse(fs.readFileSync(new URL('data/ikigai_schedule.json', root)));
const main = read('34a28314eac997d55997717ff2ff9302834e5b61');
const prior = read('4a62b7e');
const { lounge, bus_reservations, program_updates, ...event } = data.event;
assert.deepEqual(event, main.event, 'Preserve unrelated latest-main event data');
assert.deepEqual(lounge, prior.event.lounge);
assert.deepEqual(bus_reservations, prior.event.bus_reservations);
assert.equal(program_updates.length, 4);
assert.deepEqual(data.rooms, { ...main.rooms, LOUNGE: prior.rooms.LOUNGE });
assert.deepEqual(data.categories, main.categories);
assert.equal(data.sessions.length, main.sessions.length);
const moved = {
  stella: ['2026-10-02', '11:30-12:15'],
  tessei: ['2026-10-01', '16:00-16:45'],
  iguchi: ['2026-10-02', '10:30-11:15'],
};
for (const [i, session] of data.sessions.entries()) {
  const baseline = main.sessions[i];
  assert.deepEqual(session.photos, baseline.photos, 'Do not replace images');
  const key = Object.keys(moved).find(key => session.photos.includes(key));
  if (key) {
    assert.deepEqual([session.day, session.time], moved[key]);
    assert.equal(session.room, 'A');
    assert.ok(session.description.length > 100);
    assert.ok(session.update_note);
    const { day, time, title, description, update_note, ...rest } = session;
    const { day: d, time: t, title: tt, ...before } = baseline;
    assert.deepEqual(rest, before);
    if (key !== 'stella') assert.equal(title, baseline.title);
  } else if (session.who === 'Christian Pedersen') {
    assert.equal(baseline.title, 'Booth Time');
    assert.deepEqual([session.day, session.time, session.room], ['2026-10-02', '13:30-14:15', 'G']);
    assert.equal(session.title, 'Why Being Yourself Is Your Superpower');
    assert.ok(session.description.length > 100);
    assert.equal(session.category, null, 'Do not invent category');
    assert.ok(session.update_note);
  } else if (session.kind === 'evening') {
    assert.deepEqual(session, prior.sessions.find(s => s.day === session.day && s.title === session.title));
  } else {
    assert.deepEqual(session, baseline, 'Keep unrelated main sessions: ' + baseline.title);
  }
}
assert.equal(data.speakers.length, main.speakers.length + 1);
for (const [i, speaker] of main.speakers.entries()) {
  const updated = data.speakers[i];
  assert.equal(updated.name, speaker.name, 'Keep latest main identity');
  assert.deepEqual(updated.photos, speaker.photos);
  const previous = prior.speakers.find(p => p.photos.some(photo => speaker.photos.includes(photo)));
  if (speaker.bio) assert.ok(updated.bio);
  if (!speaker.bio && previous?.bio) assert.ok(updated.bio, 'Restore missing bio');
}
assert.equal(data.speakers.find(s => s.name === 'Cihan Boz').bio, undefined);
const christian = data.speakers.find(s => s.name === 'Christian Pedersen');
assert.deepEqual(christian.photos, []);
assert.ok(christian.bio.length > 100);
assert.equal(data.speakers.filter(s => s.bio).length, data.speakers.length - 1);
for (const [photo, [day, time]] of Object.entries(moved)) {
  const speaker = data.speakers.find(s => s.photos.includes(photo));
  assert.equal(speaker.when, 'Day ' + (day.endsWith('01') ? 1 : 2) + ' · ' + time.split('-')[0]);
}
data.sessions = data.sessions.map((s, _index) => ({ ...s, _index }));
for (const speaker of data.speakers) {
  const sessions = findSpeakerSessions(data, speaker);
  assert.ok(sessions.length, speaker.name + ' needs a program link');
  assert.ok(sessions.every(s => s.note !== 'cont'));
}
for (const day of data.event.dates) {
  const occupied = new Set();
  for (const session of data.sessions.filter(s => s.day === day && s.room === 'A' && s.kind === 'workshop')) {
    assert.ok(!occupied.has(session.time), 'No duplicate Ballroom A slots');
    occupied.add(session.time);
  }
}
for (const asset of [lounge.image, 'assets/bus-booking-banner.png', ...data.sessions.map(s => s.banner).filter(Boolean)]) {
  assert.ok(fs.existsSync(new URL(asset, root)), asset);
}
console.log('PASS: latest main preserved outside approved fields; four speakers; unchanged portraits; restored services, dinners and bios; profile links; no Ballroom A duplicates.');
