import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { parseHTML } = await import(process.env.DISCORD_SYNTAX_DOM_MODULE || 'linkedom');
const { document, window } = parseHTML('<!doctype html><html><body><div id="preview"></div></body></html>');
globalThis.document = document;
globalThis.luxon = new Function(`${readFileSync(new URL('../assets/vendor/luxon-3.7.2.min.js', import.meta.url), 'utf8')}; return luxon;`)();
const { renderPreview } = await import('../assets/js/preview.js');
const target = document.querySelector('#preview');
const render = text => { renderPreview(target,text); return target; };

test('preview renders combined and nested inline styles', () => {
  assert.equal(render('__**hello**__').querySelector('u strong').textContent,'hello');
  assert.equal(render('***hello***').querySelector('strong em').textContent,'hello');
  assert.equal(render('**bold *italic***').querySelector('strong em').textContent,'italic');
  assert.equal(render('*italic **bold***').querySelector('em strong').textContent,'bold');
});
test('preview renders headings, subtext, list nesting, and quotes', () => {
  render('# title\n## next\n### small\n-# footnote\n- first\n  - nested\n- second\n> quote\n>>> multiline\ncontinued');
  assert.equal(target.querySelector('h1').textContent,'title'); assert.equal(target.querySelector('small').textContent,'footnote');
  assert.equal(target.querySelector('ul li ul li').textContent,'nested'); assert.equal(target.querySelectorAll('blockquote').length,2);
  assert.ok(target.lastElementChild.textContent.includes('continued'));
});
test('raw HTML, event attributes and active URLs remain inert text', () => {
  render('<img src=x onerror="alert(1)"> <script>alert(1)</script> [bad](javascript:alert(1)) [bad](data:text/html,bad) [safe](https://example.com)');
  assert.equal(target.querySelector('img, script, [onerror]'),null); assert.equal(target.querySelectorAll('a').length,1);
  assert.equal(target.querySelector('a').getAttribute('href'),'https://example.com/'); assert.ok(target.textContent.includes('<script>'));
});
test('code blocks and inline code do not format or activate their contents', () => {
  render('`**literal**`\n```html\n<script>hello</script>\n||not a spoiler||\n```');
  assert.equal(target.querySelector('code').textContent,'**literal**'); assert.equal(target.querySelector('strong,script,button'),null);
  assert.ok(target.querySelector('pre code').textContent.includes('<script>'));
});
test('spoilers are keyboard-addressable buttons with reversible reveal state', () => {
  const button = render('||surprise||').querySelector('button');
  assert.equal(button.getAttribute('aria-expanded'),'false'); button.dispatchEvent(new window.Event('click'));
  assert.equal(button.getAttribute('aria-expanded'),'true'); button.dispatchEvent(new window.Event('click')); assert.equal(button.getAttribute('aria-expanded'),'false');
});
test('incomplete formatting remains visible and escaped markers stay literal', () => {
  assert.equal(render('**unfinished').textContent,'**unfinished');
  assert.equal(render('\\*literal\\*').textContent,'*literal*'); assert.equal(target.querySelector('em'),null);
});
test('timestamps render as localised text, and long previews are bounded', () => {
  assert.ok(render('<t:1793212200:f>').querySelector('.timestamp-chip').textContent.length);
  render('x'.repeat(21000)); assert.ok(target.textContent.includes('Preview limited')); assert.ok(target.textContent.length < 21000);
});
test('all local page assets resolve and GitHub project paths stay relative', () => {
  const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const { document: page } = parseHTML(html);
  for (const element of page.querySelectorAll('script[src],link[href]')) {
    const path = element.getAttribute('src') || element.getAttribute('href'); assert.ok(path.startsWith('./'),path);
    assert.ok(readFileSync(new URL(`../${path}`,import.meta.url)).length);
  }
  assert.equal(page.querySelectorAll('[role="tab"]').length,4);
  for (const tab of page.querySelectorAll('[role="tab"]')) assert.ok(page.getElementById(tab.getAttribute('aria-controls')));
});
