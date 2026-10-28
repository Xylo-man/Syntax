import { formats, applyFormat, insertLink, EditHistory } from './formatting.js';
import { renderPreview } from './preview.js';
import { createStorage } from './storage.js';
import { STYLES, deviceZone, validZone, zones, resolveTime, fieldsFor, timestamp, previewTime, offsetLabel } from './time.js';
import { starterMessage, templates, guide } from './content.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const storage = createStorage();
const saved = storage.load();
const state = { draft: saved.draft ?? starterMessage, tab: saved.tab || 'formatter', timezone: validZone(saved.timezone) ? saved.timezone : deviceZone() };
const editor = $('#message');
editor.value = state.draft;
const snapshot = () => ({ text: editor.value, start: editor.selectionStart, end: editor.selectionEnd });
const history = new EditHistory(snapshot());
let toastTimer;
let currentTime = null;
let timeIdentity = '';
let linkSelection;

function notify(message) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
}
function updateSaveStatus() { $('#save-status').textContent = storage.available ? 'Saved on this device' : 'Draft stays in this tab'; }
function persist() { storage.save(state); updateSaveStatus(); }
function updateEditor() {
  state.draft = editor.value;
  renderPreview($('#preview'), editor.value);
  const count = editor.value.length;
  $('#character-count').textContent = `${count.toLocaleString()} character${count === 1 ? '' : 's'}${count > 2000 ? ' · over 2,000 (standard message limit)' : ''}`;
  $('#character-count').classList.toggle('over-limit', count > 2000);
  $('#undo').disabled = history.position === 0;
  $('#redo').disabled = history.position === history.entries.length - 1;
  $('#copy-message').disabled = !editor.value;
  updateSaveStatus();
}
function commit(next) {
  history.push(snapshot()); editor.value = next.text; editor.focus(); editor.setSelectionRange(next.start, next.end); history.push(next); updateEditor(); persist();
}
function restore(next) { if (!next) return; editor.value = next.text; editor.focus(); editor.setSelectionRange(next.start, next.end); updateEditor(); persist(); }
function switchTab(tab, save = true) {
  if (!$(`#tab-${tab}`)) return;
  state.tab = tab;
  $$('[data-tab]').forEach(button => { const active = button.dataset.tab === tab; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; $(`#panel-${button.dataset.tab}`).hidden = !active; });
  if (save) persist();
}
function confirmAction(title, description) {
  return new Promise(resolve => {
    const dialog = $('#confirm-dialog'); $('#confirm-title').textContent = title; $('#confirm-description').textContent = description;
    dialog.returnValue = 'cancel'; dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }); dialog.showModal();
  });
}

async function copy(text) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text); notify('Copied. Your next message is ready.');
  } catch {
    $('#copy-fallback').value = text; $('#copy-dialog').showModal(); $('#copy-fallback').focus(); $('#copy-fallback').select();
  }
}
$$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('[data-tab]').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
$$('[data-switch]').forEach(button => button.addEventListener('click', () => { switchTab(button.dataset.switch); $(`#tab-${button.dataset.switch}`).focus(); }));
$('.tool-tabs').addEventListener('keydown', event => {
  const tabs = $$('[data-tab]'); const index = tabs.indexOf(document.activeElement); if (index < 0) return;
  const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
  if (next !== null) { event.preventDefault(); switchTab(tabs[next].dataset.tab); tabs[next].focus(); }
});
formats.forEach((format, index) => {
  if ([5, 9, 12].includes(index)) { const separator = document.createElement('span'); separator.className = 'separator'; separator.setAttribute('aria-hidden', 'true'); $('#toolbar').append(separator); }
  const button = document.createElement('button'); button.type = 'button'; button.dataset.format = format.id; button.textContent = format.label; button.title = format.title; button.setAttribute('aria-label', format.title);
  button.addEventListener('mousedown', event => event.preventDefault());
  button.addEventListener('click', () => {
    if (format.id === 'link') {
      linkSelection = { start: editor.selectionStart, end: editor.selectionEnd };
      $('#link-label').value = editor.value.slice(linkSelection.start, linkSelection.end) || 'Your link'; $('#link-url').value = ''; $('#link-error').hidden = true; $('#link-dialog').showModal(); $('#link-url').focus();
    } else commit(applyFormat(editor.value, editor.selectionStart, editor.selectionEnd, format.id));
  }); $('#toolbar').append(button);
});
$('#toolbar').addEventListener('keydown', event => {
  const buttons = [...$('#toolbar').querySelectorAll('button')]; const index = buttons.indexOf(document.activeElement);
  if (index >= 0 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); buttons[(index + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length].focus(); }
});
$('#link-form').addEventListener('submit', event => {
  event.preventDefault();
  try { const next = insertLink(editor.value, linkSelection.start, linkSelection.end, $('#link-label').value, $('#link-url').value); $('#link-dialog').close(); commit(next); }
  catch { $('#link-error').hidden = false; }
});
editor.addEventListener('input', () => { history.push(snapshot()); updateEditor(); persist(); });
$('#undo').addEventListener('click', () => restore(history.undo()));
$('#redo').addEventListener('click', () => restore(history.redo()));
editor.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey)) return;
  const key = event.key.toLowerCase();
  if (key === 'z' || key === 'y') { event.preventDefault(); restore(key === 'y' || event.shiftKey ? history.redo() : history.undo()); }
  else if (['b', 'i', 'u'].includes(key)) { event.preventDefault(); commit(applyFormat(editor.value, editor.selectionStart, editor.selectionEnd, { b: 'bold', i: 'italic', u: 'underline' }[key])); }
});
$('#copy-message').addEventListener('click', () => copy(editor.value));
$('#clear-draft').addEventListener('click', async () => {
  if (editor.value && await confirmAction('Clear your message?', 'Your current draft will be removed. You can undo this while the page stays open.')) commit({ text: '', start: 0, end: 0 });
});
$('#clear-storage').addEventListener('click', async () => {
  if (!await confirmAction('Clear saved data?', 'Remove the saved message and preferences from this browser. The editor and its undo history will also be cleared.')) return;
  const removed = storage.clear(); state.draft = ''; state.timezone = deviceZone(); editor.value = ''; history.entries = [snapshot()]; history.position = 0;
  switchTab('formatter', false); $('#timezone').value = state.timezone; setMoment(Date.now()); updateEditor();
  if (removed) $('#save-status').textContent = 'Saved data cleared';
  notify(removed ? 'Saved data cleared from this browser.' : 'Draft cleared. Browser storage is unavailable.');
});

// Timezone selection retains the entered wall-clock date and time.
const allZones = zones();
allZones.forEach(zone => {
  const option = document.createElement('option'); option.value = zone; $('#timezone-options').append(option);
  const previewOption = document.createElement('option'); previewOption.value = zone; previewOption.textContent = zone.replaceAll('_', ' '); $('#preview-zone').append(previewOption);
});
$('#timezone').value = state.timezone;
$('#preview-zone').value = deviceZone();
function setMoment(millis) {
  const zone = validZone($('#timezone').value.trim()) ? $('#timezone').value.trim() : deviceZone();
  const fields = fieldsFor(millis, zone); $('#event-date').value = fields.date; $('#event-time').value = fields.time;
  timeIdentity = ''; updateTime(Math.floor(millis / 1000));
}
function updateTime(preferredSeconds = null) {
  const date = $('#event-date').value; const time = $('#event-time').value; const zone = $('#timezone').value.trim();
  const identity = `${date}|${time}|${zone}`;
  const resolution = resolveTime(date, time, zone);
  const error = $('#time-error'); error.hidden = !resolution.error; error.textContent = resolution.error || '';
  const offsetSelect = $('#offset-select');
  if (identity !== timeIdentity) {
    offsetSelect.replaceChildren(new Option('Choose a UTC offset…', ''));
    resolution.candidates?.forEach(candidate => offsetSelect.add(new Option(offsetLabel(candidate), String(Math.floor(candidate.toSeconds())))));
    if (preferredSeconds !== null && resolution.candidates?.some(candidate => Math.floor(candidate.toSeconds()) === preferredSeconds)) offsetSelect.value = String(preferredSeconds);
    timeIdentity = identity;
  }
  $('#offset-choice').hidden = !resolution.candidates || resolution.candidates.length < 2;
  currentTime = resolution.error ? null : resolution.candidates.length === 1 ? Math.floor(resolution.candidates[0].toSeconds()) : offsetSelect.value ? Number(offsetSelect.value) : null;
  $('#unix-value').textContent = currentTime === null ? '' : `UNIX ${currentTime}`;
  renderTimes();
}
function renderTimes() {
  const target = $('#timestamp-styles'); target.replaceChildren();
  STYLES.forEach(([style, name]) => {
    const row = document.createElement('div'); row.className = 'timestamp-row';
    const info = document.createElement('div');
    const label = document.createElement('div'); label.className = 'timestamp-name'; label.textContent = name;
    const preview = document.createElement('div'); preview.className = 'timestamp-preview'; preview.dataset.style = style; preview.textContent = currentTime === null ? 'Choose a valid moment above' : previewTime(currentTime, style, $('#preview-zone').value);
    const syntax = document.createElement('div'); syntax.className = 'timestamp-syntax'; syntax.textContent = currentTime === null ? '—' : timestamp(currentTime, style);
    info.append(label, preview, syntax);
    const buttons = document.createElement('div'); buttons.className = 'timestamp-buttons';
    const copyButton = document.createElement('button'); copyButton.textContent = 'Copy'; copyButton.setAttribute('aria-label', `Copy ${name.toLowerCase()} syntax`); copyButton.disabled = currentTime === null; copyButton.addEventListener('click', () => copy(timestamp(currentTime, style)));
    const insertButton = document.createElement('button'); insertButton.textContent = '+'; insertButton.title = 'Insert into your message'; insertButton.setAttribute('aria-label', `Insert ${name.toLowerCase()} into message`); insertButton.disabled = currentTime === null;
    insertButton.addEventListener('click', () => {
      const syntax = timestamp(currentTime, style); const start = editor.selectionStart; const end = editor.selectionEnd;
      switchTab('formatter'); commit({ text: editor.value.slice(0, start) + syntax + editor.value.slice(end), start: start + syntax.length, end: start + syntax.length }); notify('Timestamp added to your message.');
    });
    buttons.append(copyButton, insertButton); row.append(info, buttons); target.append(row);
  });
}
['#event-date', '#event-time', '#timezone'].forEach(selector => $(selector).addEventListener('input', () => updateTime()));
$('#timezone').addEventListener('change', () => {
  const zone = $('#timezone').value.trim();
  if (validZone(zone)) { state.timezone = zone; persist(); }
});
$('#offset-select').addEventListener('change', () => updateTime());
$('#preview-zone').addEventListener('change', renderTimes);
$('#time-now').addEventListener('click', () => setMoment(Date.now()));
$$('[data-adjust]').forEach(button => button.addEventListener('click', () => {
  if (currentTime === null) { notify('Choose a valid moment and resolve any repeated time first.'); return; }
  const current = globalThis.luxon.DateTime.fromSeconds(currentTime, { zone: $('#timezone').value.trim() });
  if (button.dataset.adjust === 'day') {
    // Calendar-day arithmetic preserves wall-clock time; revalidate gaps and overlaps.
    const nextDate = current.plus({ days: 1 }).toISODate(); $('#event-date').value = nextDate; updateTime();
  } else setMoment(current.plus({ minutes: Number(button.dataset.adjust) }).toMillis());
}));

templates.forEach(template => {
  const article = document.createElement('article'); article.className = 'card template-card';
  const icon = document.createElement('div'); icon.className = 'template-icon'; icon.textContent = template.icon; icon.setAttribute('aria-hidden', 'true');
  const title = document.createElement('h3'); title.textContent = template.name;
  const description = document.createElement('p'); description.textContent = template.description;
  const example = document.createElement('pre'); example.textContent = template.text;
  const button = document.createElement('button'); button.className = 'primary'; button.textContent = 'Use this template ↗'; button.setAttribute('aria-label', `Use ${template.name.toLowerCase()} template`);
  button.addEventListener('click', async () => {
    if (editor.value && !await confirmAction('Replace your draft?', `Load the ${template.name.toLowerCase()} template into the formatter? You can undo this while the page stays open.`)) return;
    switchTab('formatter'); commit({ text: template.text, start: template.text.length, end: template.text.length }); notify('Template loaded. Make it yours.');
  }); article.append(icon, title, description, example, button); $('#templates').append(article);
});
function renderGuide() {
  const search = $('#guide-search').value.toLowerCase().trim(); const matches = guide.filter(item => item.join(' ').toLowerCase().includes(search)); $('#guide').replaceChildren();
  matches.forEach(([name, syntax, note]) => {
    const card = document.createElement('article'); card.className = 'card guide-card';
    const top = document.createElement('div'); top.className = 'guide-top'; const title = document.createElement('h3'); title.textContent = name;
    const button = document.createElement('button'); button.textContent = 'Copy'; button.setAttribute('aria-label', `Copy ${name.toLowerCase()} example`); button.addEventListener('click', () => copy(syntax)); top.append(title, button);
    const code = document.createElement('code'); code.textContent = syntax;
    const preview = document.createElement('div'); preview.className = 'markdown'; renderPreview(preview, syntax);
    const help = document.createElement('p'); help.className = 'muted'; help.textContent = note;
    card.append(top, code, preview, help); $('#guide').append(card);
  }); $('#guide-empty').hidden = matches.length > 0;
}
$('#guide-search').addEventListener('input', renderGuide);

updateEditor(); switchTab(state.tab, false); setMoment(Date.now()); renderGuide();
setInterval(() => {
  if (currentTime !== null) {
    const relative = $('.timestamp-preview[data-style="R"]'); if (relative) relative.textContent = previewTime(currentTime, 'R', $('#preview-zone').value);
  }
  $$('.timestamp-chip').forEach(chip => { const match = chip.title.match(/^<t:(-?\d+):R>$/); if (match) chip.textContent = previewTime(Number(match[1]), 'R'); });
}, 15000);
