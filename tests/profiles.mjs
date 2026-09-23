import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

// The renderer only needs window for its optional lazy-image observer at import time.
globalThis.window = {};
const { findSpeakerSessions } = await import('../js/render.js');
const root = new URL('../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('data/ikigai_schedule.json', root)));
const baseline = JSON.parse(execFileSync('git', ['show', '02b3998af26dfa385389712e3e5ed909badc0b3b:data/ikigai_schedule.json'], { cwd: root, encoding: 'utf8' }));

// Preserve the program; only the explicitly requested group and bus data may change.
const { speakers, ...other } = data;
const { speakers: previous, ...previousOther } = baseline;
const { bus_reservations, lounge, ...event } = other.event;
assert.deepEqual(lounge.free_for, ['Premium Pass holders', 'Business Pass holders', 'Co-Creators']);
assert.equal(lounge.price_eur, 6.99);
assert.equal(lounge.purchase_url, 'https://community.colivefukuoka.com/portal/shop');
previousOther.rooms.LOUNGE = 'LOUNGE';
previousOther.rooms.MAIN = 'BALLROOM A+B';
previousOther.sessions.splice(1, 0, {
  day: '2026-10-01',
  kind: 'workshop',
  time: '10:00-12:30',
  room: 'G',
  room_label: 'GARDEN',
  title: 'Booth Open',
  who: 'Meet the sponsors in the garden · drop in any time',
  category: null,
  photos: [],
  community_slug: null,
  note: null,
});
previousOther.sessions.find(s => s.title === 'Community Dinner Motsunabe').community_slug = 'https://entrytickets.be/colive-fukuoka/community-dinner-motsunabe-2';
previousOther.rooms.ALL = 'ALL VENUES';
previousOther.sessions.filter(s => s.title.startsWith('Lunch Buffet')).forEach(s => {
  s.room = 'ALL'; s.room_label = 'ALL VENUES';
  s.who = s.day === '2026-10-01' ? 'All pass holders · All venues' : 'Academy lunch buffet · All venues';
});
previousOther.sessions.forEach(s => { s.title = s.title.replace('CHATEA Workshop', 'ChaTea Workshop'); });
previous.forEach(s => { s.session = s.session?.replace('CHATEA Workshop', 'ChaTea Workshop'); });
const previousGathering = previousOther.sessions.find(s => s.community_slug === 'vipdinner');
previousGathering.presentation = 'invitation';
previousGathering.community_slug = 'https://entrytickets.be/colive-fukuoka/vipdinner';
previousGathering.banner = 'assets/gathering-banner.png';
previousOther.sessions.find(s => s.title === 'Community Dinner Motsunabe').banner = 'assets/motsunabe-banner.png';
previousGathering.who = 'For invited guests only. Please follow your personal invitation for attendance and event details.';
assert.deepEqual({ ...other, event }, previousOther);
assert.equal(Object.keys(bus_reservations).length, 2);
for (const [index, day] of data.event.dates.entries()) {
  assert.equal(bus_reservations[day].outbound_slug, `oct-${index + 1}bus-reservation-outbound`);
  assert.equal(bus_reservations[day].return_slug, `oct-${index + 1}bus-reservation-return-trip`);
}
const identity = ({ bio, role, search_aliases, ...speaker }) => speaker;
const isUkiha = speaker => speaker.photos.some(photo => photo.startsWith('obaachan'));
assert.deepEqual(speakers.filter(s => !isUkiha(s)).map(identity), previous.filter(s => !isUkiha(s)).map(identity));
assert.equal(speakers.length, 46);
assert.equal(speakers.filter(speaker => speaker.bio).length, 45);
const ukiha = speakers.filter(isUkiha);
assert.equal(ukiha.length, 1);
assert.equal(ukiha[0].name, 'Ukiha no Takara');
assert.deepEqual(ukiha[0].photos, ['obaachan1', 'obaachan2']);
assert.match(ukiha[0].members, /Okuma Mitsuru/);
assert.ok(fs.existsSync(new URL(ukiha[0].group_image, root)));
assert.equal(speakers.find(speaker => speaker.name === 'Cihan Boz').bio, undefined);
assert.equal(speakers.find(speaker => speaker.photos[0] === 'gen').name, 'Gen Lee');

data.sessions = data.sessions.map((session, index) => ({ ...session, _index: index }));
const byPhoto = photo => findSpeakerSessions(data, speakers.find(speaker => speaker.photos[0] === photo));
assert.equal(byPhoto('nikoleta').length, 2);
for (const photo of ['sakata', 'obaachan1']) {
  assert.deepEqual(byPhoto(photo).map(session => session.day), data.event.dates);
}
for (const [photo, time] of [['gil', '15:00-16:45'], ['moe', '10:30-12:15'], ['vitto', '10:30-12:15']]) {
  assert.equal(byPhoto(photo).length, 1);
  assert.equal(byPhoto(photo)[0]._displayTime, time);
}
for (const speaker of speakers) {
  const sessions = findSpeakerSessions(data, speaker);
  assert.ok(sessions.length, `${speaker.name} needs a program link`);
  assert.ok(sessions.every(session => session.note !== 'cont'));
  assert.equal(new Set(sessions.map(session => session._index)).size, sessions.length);
}
console.log('PASS: 46 cards; Ukiha trio merged; 45 bios; program unchanged; four bus URLs; all profile links; merged continuation times.');
