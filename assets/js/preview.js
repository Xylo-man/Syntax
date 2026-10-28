import { safeUrl } from './formatting.js';
import { previewTime } from './time.js';

const delimiters = [['***', ['strong', 'em']], ['__', ['u']], ['**', ['strong']], ['~~', ['s']], ['||', ['spoiler']], ['*', ['em']], ['_', ['em']]];
function inline(parent, text, depth = 0) {
  if (depth > 12) { parent.append(document.createTextNode(text)); return; }
  let plain = '';
  const flush = () => { if (plain) { parent.append(document.createTextNode(plain)); plain = ''; } };
  for (let i = 0; i < text.length;) {
    const rest = text.slice(i);
    if (text[i] === '\\' && i + 1 < text.length) { plain += text[i + 1]; i += 2; continue; }
    if (text[i] === '`') {
      const close = text.indexOf('`', i + 1);
      if (close > i + 1) {
        flush(); const code = document.createElement('code'); code.textContent = text.slice(i + 1, close); parent.append(code); i = close + 1; continue;
      }
    }
    const stamp = rest.match(/^<t:(-?\d{1,13})(?::([tTdDfFsSR]))?>/);
    if (stamp) {
      flush(); const span = document.createElement('span'); span.className = 'timestamp-chip';
      span.textContent = previewTime(Number(stamp[1]), stamp[2] || 'f'); span.title = stamp[0]; parent.append(span); i += stamp[0].length; continue;
    }
    const link = rest.match(/^\[((?:\\.|[^\]\\])+)\]\(([^\s)]+)\)/);
    if (link && safeUrl(link[2])) {
      flush(); const a = document.createElement('a'); a.href = safeUrl(link[2]); a.target = '_blank'; a.rel = 'noopener noreferrer';
      inline(a, link[1], depth + 1); parent.append(a); i += link[0].length; continue;
    }
    let matched = false;
    for (const [marker, tags] of delimiters) {
      if (!rest.startsWith(marker)) continue;
      let close = text.indexOf(marker, i + marker.length);
      while (close !== -1) {
        let run = marker.length;
        while (text[close + run] === marker[0]) run++;
        if (text[close - 1] === '\\' || (marker.length === 1 && run === 2)) { close = text.indexOf(marker, close + run); continue; }
        if ((marker[0] === '*' || marker[0] === '_') && run > marker.length) close += run - marker.length;
        break;
      }
      if (close <= i + marker.length) continue;
      flush(); let outer; let inner;
      for (const tag of tags) {
        const element = document.createElement(tag === 'spoiler' ? 'button' : tag);
        if (tag === 'spoiler') {
          element.type = 'button'; element.className = 'spoiler'; element.setAttribute('aria-label', 'Reveal spoiler'); element.setAttribute('aria-expanded', 'false');
          element.addEventListener('click', () => { const revealed = element.getAttribute('aria-expanded') !== 'true'; element.setAttribute('aria-expanded', String(revealed)); element.setAttribute('aria-label', revealed ? 'Hide spoiler' : 'Reveal spoiler'); });
        }
        if (inner) inner.append(element); else outer = element;
        inner = element;
      }
      inline(inner, text.slice(i + marker.length, close), depth + 1); parent.append(outer); i = close + marker.length; matched = true; break;
    }
    if (!matched) { plain += text[i]; i++; }
  }
  flush();
}

function blocks(parent, lines, depth = 0) {
  let listStack = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^( *)([-*]|\d+\.) (.*)$/);
    if (!listMatch) listStack = [];
    if (/^```/.test(line)) {
      const code = []; const language = line.slice(3).trim(); let closed = false;
      for (i++; i < lines.length; i++) { if (/^```\s*$/.test(lines[i])) { closed = true; break; } code.push(lines[i]); }
      const pre = document.createElement('pre'); const element = document.createElement('code');
      element.textContent = code.join('\n'); if (language) pre.setAttribute('aria-label', `${language} code block`); pre.append(element); parent.append(pre);
      if (!closed) i = lines.length;
    } else if (/^>>> /.test(line) && depth < 8) {
      const quote = document.createElement('blockquote'); blocks(quote, [line.slice(4), ...lines.slice(i + 1)], depth + 1); parent.append(quote); break;
    } else if (/^> /.test(line) && depth < 8) {
      const quoted = [line.slice(2)];
      while (i + 1 < lines.length && /^> /.test(lines[i + 1])) quoted.push(lines[++i].slice(2));
      const quote = document.createElement('blockquote'); blocks(quote, quoted, depth + 1); parent.append(quote);
    } else if (/^(#{1,3}) /.test(line)) {
      const match = line.match(/^(#{1,3}) (.*)$/); const h = document.createElement(`h${match[1].length}`); inline(h, match[2]); parent.append(h);
    } else if (line.startsWith('-# ')) {
      const p = document.createElement('p'); const small = document.createElement('small'); inline(small, line.slice(3)); p.append(small); parent.append(p);
    } else if (listMatch) {
      const indent = Math.floor(listMatch[1].length / 2); const tag = /\d/.test(listMatch[2]) ? 'ol' : 'ul';
      while (listStack.length && (listStack.at(-1).indent > indent || (listStack.at(-1).indent === indent && listStack.at(-1).tag !== tag))) listStack.pop();
      if (!listStack.length || listStack.at(-1).indent < indent) {
        const list = document.createElement(tag);
        if (tag === 'ol') list.start = Number.parseInt(listMatch[2]);
        const ancestor = listStack.at(-1)?.last || parent; ancestor.append(list);
        listStack.push({ indent, tag, list, last: null });
      }
      const li = document.createElement('li'); inline(li, listMatch[3]); listStack.at(-1).list.append(li); listStack.at(-1).last = li;
    } else {
      const p = document.createElement('p'); if (line) inline(p, line); else p.append(document.createElement('br')); parent.append(p);
    }
  }
}

export function renderPreview(target, text) {
  const fragment = document.createDocumentFragment();
  if (!text) {
    const p = document.createElement('p'); p.className = 'preview-placeholder'; p.textContent = 'Your message will appear here. A little formatting goes a long way.'; fragment.append(p);
  } else {
    blocks(fragment, text.slice(0, 20000).replace(/\r\n?/g, '\n').split('\n'));
    if (text.length > 20000) { const p = document.createElement('p'); p.textContent = 'Preview limited to the first 20,000 characters. Copy includes the full message.'; fragment.append(p); }
  }
  target.replaceChildren(fragment);
}
