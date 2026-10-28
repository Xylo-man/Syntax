import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyFormat, insertLink, safeUrl, EditHistory } from '../assets/js/formatting.js';
import { createStorage } from '../assets/js/storage.js';

globalThis.luxon = new Function(`${readFileSync(new URL('../assets/vendor/luxon-3.7.2.min.js', import.meta.url), 'utf8')}; return luxon;`)();
const { resolveTime, timestamp, STYLES, fieldsFor, previewTime } = await import('../assets/js/time.js');
const one = (date, time, zone) => resolveTime(date, time, zone).candidates[0];

test('inline formatting preserves selection and composes styles', () => {
  const bold = applyFormat('hello world', 6, 11, 'bold');
  assert.deepEqual(bold, { text: 'hello **world**', start: 8, end: 13 });
  assert.equal(applyFormat(bold.text, 6, 15, 'underline').text, 'hello __**world**__');
  assert.equal(applyFormat('', 0, 0, 'italic').text, '*Your text*');
});
test('line formatting covers full selected lines without changing the following line', () => {
  assert.equal(applyFormat('first\nsecond\nthird', 1, 13, 'list').text, '- first\n- second\nthird');
  assert.equal(applyFormat('first\nsecond', 0, 12, 'ordered').text, '1. first\n2. second');
  assert.equal(applyFormat('\nsecond', 0, 0, 'h1').text, '# Your text\nsecond');
});
test('code formatting creates valid standalone fences and neutralises pasted fences', () => {
  assert.equal(applyFormat('hello world', 6, 11, 'code').text, 'hello \n```\nworld\n```');
  assert.ok(applyFormat('```danger```', 0, 12, 'code').text.includes('``\u200b`danger'));
  assert.equal(applyFormat('a\nb`c', 0, 5, 'inline').text, '`a bˋc`');
});
test('links reject active protocols and encode delimiter characters', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'file:///tmp/a', '/relative']) assert.equal(safeUrl(url), null);
  assert.equal(insertLink('hello', 0, 5, 'site', 'https://example.com/a(b)').text, '[site](https://example.com/a%28b%29)');
  assert.throws(() => insertLink('', 0, 0, 'bad', 'javascript:alert(1)'));
});
test('history restores text and selection, and new edits discard redo', () => {
  const h = new EditHistory({ text: 'a', start: 1, end: 1 });
  h.push({ text: '**a**', start: 2, end: 3 });
  assert.equal(h.undo().text, 'a'); assert.equal(h.redo().start, 2);
  h.undo(); h.push({ text: 'b', start: 1, end: 1 }); assert.equal(h.redo(), null);
});
test('timestamps use Unix seconds and expose all nine styles', () => {
  assert.equal(one('2026-10-28', '18:30:00', 'UTC').toSeconds(), 1793212200);
  assert.equal(timestamp(1793212200.8, 'f'), '<t:1793212200:f>');
  assert.deepEqual(STYLES.map(([s]) => s), ['t','T','d','D','f','F','s','S','R']);
  for (const [style] of STYLES) assert.ok(previewTime(1793212200, style, 'UTC').length);
});
test('invalid dates, zones and daylight-saving gaps are rejected', () => {
  for (const args of [['2026-02-30','10:00','UTC'],['2026-10-28','25:00','UTC'],['2026-10-28','10:00','Invalid/Zone'],['2026-03-29','01:30','Europe/London'],['2026-03-08','02:30','America/New_York'],['1969-01-01','00:00','UTC']]) assert.ok(resolveTime(...args).error, args.join(' '));
});
test('fall-back times expose both instants in chronological order', () => {
  const { candidates } = resolveTime('2026-10-25','01:30','Europe/London');
  assert.equal(candidates.length, 2); assert.equal(candidates[1].toSeconds() - candidates[0].toSeconds(), 3600);
  assert.deepEqual(candidates.map(c => c.offset), [60, 0]);
});
test('fractional offsets, leap dates and cross-date conversions are correct', () => {
  assert.equal(one('2026-10-28','12:00','Asia/Kathmandu').toUTC().toFormat('HH:mm'), '06:15');
  assert.equal(one('2026-10-28','12:00','Asia/Kolkata').toUTC().toFormat('HH:mm'), '06:30');
  const instant = one('2026-01-01','00:15','Asia/Tokyo').toMillis();
  assert.deepEqual(fieldsFor(instant,'America/Los_Angeles'), { date:'2025-12-31', time:'07:15:00' });
  assert.equal(one('2028-02-29','12:00','UTC').day, 29);
});
test('relative previews update against the supplied current instant', () => {
  const now = Date.UTC(2026,9,28,12); const future = now / 1000 + 3600;
  assert.match(previewTime(future,'R','UTC',now), /1 hour/);
  assert.match(previewTime(future,'R','UTC',now+7200000), /ago/);
});
test('storage validates saved fields and preserves empty drafts', () => {
  const map = new Map(); const storage = createStorage(() => ({ getItem:k=>map.get(k) ?? null, setItem:(k,v)=>map.set(k,v), removeItem:k=>map.delete(k) }));
  storage.save({ draft:'', tab:'timestamps', timezone:'UTC' }); assert.equal(storage.load().draft,''); assert.equal(storage.load().tab,'timestamps');
  storage.save({ draft:123, tab:'bad' }); assert.deepEqual(storage.load(),{});
  storage.clear(); assert.equal(map.size,0);
});
test('storage denial and corrupt data never break the application', () => {
  const denied = createStorage(() => { throw new Error('denied'); });
  assert.deepEqual(denied.load(),{}); assert.equal(denied.save({}),false); assert.equal(denied.clear(),false); assert.equal(denied.available,false);
  assert.deepEqual(createStorage(()=>({getItem:()=>'{bad json'})).load(),{});
});
