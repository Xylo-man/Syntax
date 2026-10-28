// Lightweight event-wiring checks. The small browser API shims below do not
// exercise layout, native date-input validation, real clipboard permissions,
// focus trapping, or browser selection behavior; those need a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { parseHTML } = await import(process.env.DISCORD_SYNTAX_DOM_MODULE || 'linkedom');
const { window, document } = parseHTML(readFileSync(new URL('../index.html',import.meta.url),'utf8'));
globalThis.document = document; globalThis.window = window;
globalThis.luxon = new Function(`${readFileSync(new URL('../assets/vendor/luxon-3.7.2.min.js', import.meta.url), 'utf8')}; return luxon;`)();
const saved = new Map();
Object.defineProperty(window, 'localStorage', { value: { getItem:key=>saved.get(key) ?? null, setItem:(key,value)=>saved.set(key,value), removeItem:key=>saved.delete(key) } });
globalThis.Option = function(text,value) { const option = document.createElement('option'); option.textContent = text; option.value = value; return option; };
const prototype = window.HTMLSelectElement.prototype;
Object.defineProperty(prototype,'value',{ configurable:true, get() { return [...this.querySelectorAll('option')].some(option=>option.value===this._value) ? this._value : this.querySelector('option')?.value ?? ''; }, set(value) { this._value = String(value); } });
prototype.add = function(option) { this.append(option); };
window.HTMLTextAreaElement.prototype.setSelectionRange = function(start,end) { this.selectionStart = start; this.selectionEnd = end; };
window.HTMLTextAreaElement.prototype.select = function() { this.setSelectionRange(0,this.value.length); };
document.querySelector('#message').setSelectionRange(0,0);
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.showModal = function() { this.open = true; };
  dialog.close = function(value) { this.open = false; if (value) this.returnValue=value; this.dispatchEvent(new window.Event('close')); };
}
const nativeInterval = globalThis.setInterval;
globalThis.setInterval = () => 0;
await import('../assets/js/app.js');
globalThis.setInterval = nativeInterval;
const $ = s=>document.querySelector(s);
const event = (element,type)=>element.dispatchEvent(new window.Event(type,{ bubbles:true, cancelable:true }));
const click = selector=>event($(selector),'click');
const input = (selector,value)=>{ $(selector).value=value; event($(selector),'input'); };

test('app boots and connects editor formatting, preview, undo, and saved draft', () => {
  assert.equal(document.querySelectorAll('#toolbar button').length,15);
  input('#message','hello world'); $('#message').setSelectionRange(6,11); click('[data-format="bold"]');
  assert.equal($('#message').value,'hello **world**'); assert.equal($('#preview strong').textContent,'world');
  assert.equal(JSON.parse([...saved.values()][0]).draft,'hello **world**');
  click('#undo'); assert.equal($('#message').value,'hello world'); click('#redo'); assert.equal($('#message').value,'hello **world**');
});
test('tab controls and guide search toggle the expected panels', () => {
  click('#tab-guide'); assert.equal($('#panel-guide').hidden,false); assert.equal($('#panel-formatter').hidden,true);
  input('#guide-search','strikethrough'); assert.equal(document.querySelectorAll('.guide-card').length,1);
  input('#guide-search','does-not-exist'); assert.equal($('#guide-empty').hidden,false);
  input('#guide-search','');
});
test('timestamp UI blocks gaps and overlaps and inserts the selected instant', () => {
  click('#tab-timestamps'); input('#timezone','Europe/London'); input('#event-date','2026-03-29'); input('#event-time','01:30:00');
  assert.equal($('#time-error').hidden,false); assert.equal($('#timestamp-styles button').disabled,true);
  input('#event-date','2026-10-25'); assert.equal($('#offset-choice').hidden,false); assert.equal($('#timestamp-styles button').disabled,true);
  const choices = $('#offset-select').querySelectorAll('option'); assert.equal(choices.length,3);
  $('#offset-select').value = choices[1].value; event($('#offset-select'),'change');
  assert.equal($('#timestamp-styles button').disabled,false);
  $('#message').setSelectionRange($('#message').value.length,$('#message').value.length);
  click('#timestamp-styles .timestamp-buttons button:nth-child(2)');
  assert.equal($('#panel-formatter').hidden,false); assert.ok($('#message').value.endsWith(`<t:${choices[1].value}:t>`));
});
test('template replacement is confirmed and can be undone', async () => {
  const original = $('#message').value; click('#tab-templates'); click('.template-card button'); assert.equal($('#confirm-dialog').open,true);
  $('#confirm-dialog').close('cancel'); await Promise.resolve(); assert.equal($('#message').value,original);
  click('.template-card button'); $('#confirm-dialog').close('confirm'); await Promise.resolve(); assert.ok($('#message').value.startsWith('# You’re invited!'));
  click('#undo'); assert.equal($('#message').value,original);
});
test('link dialog inserts safe syntax and rejects javascript URLs', () => {
  $('#message').setSelectionRange(0,5); click('[data-format="link"]'); $('#link-label').value='example'; $('#link-url').value='javascript:alert(1)'; event($('#link-form'),'submit');
  assert.equal($('#link-error').hidden,false); $('#link-url').value='https://example.com'; event($('#link-form'),'submit');
  assert.ok($('#message').value.startsWith('[example](https://example.com/)')); assert.equal($('#link-dialog').open,false);
});
test('clipboard denial exposes exact message in a manual-copy dialog', async () => {
  click('#copy-message'); await Promise.resolve(); assert.equal($('#copy-dialog').open,true); assert.equal($('#copy-fallback').value,$('#message').value);
});
test('clearing saved data also clears editor, history, and preferences', async () => {
  click('#clear-storage'); $('#confirm-dialog').close('confirm'); await Promise.resolve();
  assert.equal(saved.size,0); assert.equal($('#message').value,''); assert.equal($('#undo').disabled,true); assert.equal($('#redo').disabled,true);
  assert.equal($('#panel-formatter').hidden,false);
});
