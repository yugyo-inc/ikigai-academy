import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
globalThis.window = {};
const { matchesSession, mergeContinuationSlots, buildTimelineLayout } = await import('../js/render.js');
const { getProgramStatus } = await import('../js/tokyo-time.js');
const root = new URL('../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('data/ikigai_schedule.json', root)));
data.sessions = data.sessions.map((s, _index) => ({ ...s, _index }));
const sessions = mergeContinuationSlots(data.sessions);
const search = (query, categories = []) => sessions.filter(s => matchesSession(data, s, new Set(categories), query));
assert.deepEqual(search('Nikoletta').map(s => s.title), ['Opening: Chikuzen Hakata Koma', 'Day 1 Closing']);
assert.deepEqual(search(' NIKOLETTA  KOULI ').map(s => s._index), search('Nikoleta').map(s => s._index));
assert.equal(search('nikoletta', ['world']).length, 0);
assert.equal(search('Sakata').length, 2);
assert.equal(search('Connection & Collaboration').length, 1);
assert.equal(search('Gil')[0]._displayTime, '15:00-16:45');
assert.equal(search('MOE')[0]._displayTime, '10:30-12:15');
assert.equal(search('missing_zzzz').length, 0);
assert.equal(search('Japan').length > 0, true);
assert.ok(search('', ['world', 'senses']).every(s => ['world', 'senses'].includes(s.category)));
assert.equal(data.sessions.filter(s => s.room === 'LOUNGE').length, 0, 'Never invent pending sessions');
// Unrelated titles remain as supplied by the latest main.
assert.ok(data.sessions.every(s => data.rooms[s.room]), 'Every session room must be registered');
assert.equal(data.sessions.filter(s => s.title.startsWith('Lunch Buffet')).length, 2);
assert.ok(fs.existsSync(new URL(data.event.lounge.image, root)));
for (const day of data.event.dates) {
  const daily = sessions.filter(s => s.day === day);
  const layout = buildTimelineLayout(daily);
  assert.equal(layout.sessions.length, daily.filter(s => s.presentation !== 'invitation').length);
  assert.ok(layout.points.every((p, i) => i === 0 || p > layout.points[i - 1]));
  assert.ok(layout.widths.every(w => w >= 40));
  assert.equal(layout.points.at(-1), 19 * 60, 'Do not invent an end for an open-ended dinner');
}
const now = getProgramStatus(data, new Date('2026-10-01T06:15:00Z'));
assert.equal(now.nowParts.clock, '15:15');
assert.equal(now.type, 'current');
assert.equal(now.sessions.length, 3);
assert.ok(now.sessions.some(s => /connection & collaboration/i.test(s.title)));
assert.equal(getProgramStatus(data, new Date('2026-10-01T06:50:00Z')).type, 'idle');

const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const main = execFileSync('git', ['show', 'origin/main:index.html'], { cwd: root, encoding: 'utf8' });
assert.equal(html.match(/<head>[\s\S]*?<\/head>/)[0], main.match(/<head>[\s\S]*?<\/head>/)[0], 'Keep SEO / OG / favicon');
const approvedVenueLink = 'href="https://venue-map.colivefukuoka.com/" target="_blank" rel="noopener noreferrer"';
const hero = html.match(/<header[\s\S]*?<\/header>/)[0];
const mainHeroWithApprovedLink = main.match(/<header[\s\S]*?<\/header>/)[0].replace('href="#venue-map"', approvedVenueLink);
assert.equal(hero, mainHeroWithApprovedLink, 'Keep hero except the approved direct Venue Map link');
assert.ok(hero.includes(approvedVenueLink), 'Hero Venue Map must open the external floor map directly');
const sponsorSection = source => source.slice(source.indexOf('<section class="sponsors-section"'), source.indexOf('<div class="partners-subgroups">'));
const kotoriCard = /<a class="partner(?: partner--text)?" href="https:\/\/(?:www\.facebook\.com\/p\/Kotori-CoworkingHostel-Kotohira-61567819704314\/|kotori-japan\.com\/en\/kotohira\/)"[\s\S]*?<\/a>/;
assert.equal(sponsorSection(html).replace(kotoriCard, '[Kotori]'), sponsorSection(main).replace(kotoriCard, '[Kotori]'), 'Keep existing sponsors except approved Kotori logo');
assert.ok(html.includes('src="assets/partners/kotori-kotohira.svg"'));
assert.ok(html.includes('src="assets/partners/lululu-design-works.jpg"'));
const collaboratorCards = [...html.matchAll(/<article class="local-collaborator[^"]*">([\s\S]*?)<\/article>/g)].map(match => match[1]);
assert.equal(collaboratorCards.length, 6);
assert.ok(collaboratorCards.some(card => card.includes('Koji Prince') && !card.includes('Ukiha')));
assert.ok(collaboratorCards.some(card => card.includes('Ukiha') && !card.includes('Koji Prince')));
for (const match of html.matchAll(/(?:src|href)="((?:assets\/)[^"]+)"/g)) {
  assert.ok(fs.existsSync(new URL(match[1], root)), 'Missing local asset: ' + match[1]);
}
// Production readback is verified separately against the release commit, never stale /tmp files.
console.log('PASS: aliases, both-day results, category intersection, no fabricated Lounge sessions, merged spans, JST, baseline content, local assets, live/main agreement.');
