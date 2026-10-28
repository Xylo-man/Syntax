export const formats = [
  { id: 'bold', label: 'B', title: 'Bold', before: '**', after: '**' },
  { id: 'italic', label: 'I', title: 'Italic', before: '*', after: '*' },
  { id: 'underline', label: 'U', title: 'Underline', before: '__', after: '__' },
  { id: 'strike', label: 'S', title: 'Strikethrough', before: '~~', after: '~~' },
  { id: 'spoiler', label: '▥', title: 'Spoiler', before: '||', after: '||' },
  { id: 'h1', label: 'H₁', title: 'Large heading', line: '# ' },
  { id: 'h2', label: 'H₂', title: 'Medium heading', line: '## ' },
  { id: 'h3', label: 'H₃', title: 'Small heading', line: '### ' },
  { id: 'subtext', label: '₋#', title: 'Subtext', line: '-# ' },
  { id: 'list', label: '≡', title: 'Bulleted list', line: '- ' },
  { id: 'ordered', label: '1.', title: 'Numbered list', line: 'ordered' },
  { id: 'quote', label: '❞', title: 'Block quote', line: '> ' },
  { id: 'inline', label: '</>', title: 'Inline code', before: '`', after: '`' },
  { id: 'code', label: '{ }', title: 'Code block', before: '```\n', after: '\n```' },
  { id: 'link', label: '↗', title: 'Labelled link' },
];

// Return both the changed text and its selection so the UI and history stay in sync.
export function applyFormat(text, start, end, id) {
  const format = formats.find(item => item.id === id);
  if (!format || id === 'link') throw new Error('Unknown formatting action');
  let selected = text.slice(start, end) || (id === 'code' ? 'Your code here' : 'Your text');
  if (format.line) {
    start = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
    const lastSelected = end > start && text[end - 1] === '\n' ? end - 1 : end;
    const nextLine = text.indexOf('\n', lastSelected);
    end = nextLine === -1 ? text.length : nextLine;
    selected = text.slice(start, end) || 'Your text';
    const replacement = selected.split('\n').map((line, index) => {
      const prefix = format.line === 'ordered' ? `${index + 1}. ` : format.line;
      return prefix + line;
    }).join('\n');
    return { text: text.slice(0, start) + replacement + text.slice(end), start, end: start + replacement.length };
  }
  if (id === 'code') {
    // A fence needs its own line; backticks in pasted code cannot close it accidentally.
    selected = selected.replaceAll('```', '``\u200b`');
    const leading = start > 0 && text[start - 1] !== '\n' ? '\n' : '';
    const trailing = end < text.length && text[end] !== '\n' ? '\n' : '';
    const before = leading + format.before;
    return { text: text.slice(0, start) + before + selected + format.after + trailing + text.slice(end), start: start + before.length, end: start + before.length + selected.length };
  }
  if (id === 'inline') selected = selected.replaceAll('`', 'ˋ').replaceAll('\n', ' ');
  const replacement = format.before + selected + format.after;
  return { text: text.slice(0, start) + replacement + text.slice(end), start: start + format.before.length, end: start + format.before.length + selected.length };
}

export function safeUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

export function insertLink(text, start, end, label, url) {
  const valid = safeUrl(url);
  if (!valid) throw new Error('Only HTTP and HTTPS links are supported');
  const cleanLabel = label.replaceAll('\\', '\\\\').replace(/([\[\]])/g, '\\$1').replace(/\r?\n/g, ' ');
  const replacement = `[${cleanLabel}](${valid.replaceAll('(', '%28').replaceAll(')', '%29')})`;
  return { text: text.slice(0, start) + replacement + text.slice(end), start: start + replacement.length, end: start + replacement.length };
}

export class EditHistory {
  constructor(initial) { this.entries = [initial]; this.position = 0; }
  push(state) {
    if (state.text === this.entries[this.position].text) { this.entries[this.position] = state; return; }
    this.entries.splice(this.position + 1);
    this.entries.push(state);
    if (this.entries.length > 120) this.entries.shift();
    this.position = this.entries.length - 1;
  }
  undo() { return this.position > 0 ? this.entries[--this.position] : null; }
  redo() { return this.position < this.entries.length - 1 ? this.entries[++this.position] : null; }
}
