const { DateTime } = globalThis.luxon;
export const STYLES = [
  ['t', 'Short time'], ['T', 'Time with seconds'], ['d', 'Short date'], ['D', 'Long date'],
  ['f', 'Date and time'], ['F', 'Full date and time'], ['s', 'Short date and time'], ['S', 'Short date, time and seconds'], ['R', 'Relative time'],
];
export const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export const validZone = zone => typeof zone === 'string' && DateTime.now().setZone(zone).isValid;
export function zones() {
  const fallback = ['UTC', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];
  return [...new Set(['UTC', deviceZone(), ...(Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : fallback)])].sort();
}

export function resolveTime(date, time, zone) {
  if (!validZone(zone)) return { error: 'Choose a valid timezone, such as Europe/London.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) return { error: 'Enter a complete date and time.' };
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second = 0] = time.split(':').map(Number);
  if (year < 1970) return { error: 'Choose a date from 1970 onwards.' };
  const requested = { year, month, day, hour, minute, second };
  const value = DateTime.fromObject(requested, { zone });
  if (!value.isValid) return { error: 'That date or time is invalid. Please check the fields.' };
  if (Object.entries(requested).some(([key, part]) => value[key] !== part)) return { error: 'That local time does not exist because the clocks change. Choose another time.' };
  return { candidates: value.getPossibleOffsets().sort((a, b) => a.toMillis() - b.toMillis()) };
}

export function fieldsFor(millis, zone) {
  const dt = DateTime.fromMillis(millis, { zone });
  return { date: dt.toISODate(), time: dt.toFormat('HH:mm:ss') };
}
export const timestamp = (seconds, style) => `<t:${Math.floor(seconds)}:${style}>`;
export function offsetLabel(value) { return `${value.offsetNameShort} · UTC${value.toFormat('ZZ')} · ${value.toUTC().toFormat('HH:mm')} UTC`; }
export function previewTime(seconds, style, zone = deviceZone(), now = Date.now()) {
  const millis = Number(seconds) * 1000;
  if (!Number.isFinite(millis) || !DateTime.fromMillis(millis).isValid) return 'Invalid timestamp';
  if (style === 'R') {
    const diff = (millis - now) / 1000;
    const magnitude = Math.abs(diff);
    const [unit, divisor] = magnitude < 60 ? ['second', 1] : magnitude < 3600 ? ['minute', 60] : magnitude < 86400 ? ['hour', 3600] : magnitude < 2592000 ? ['day', 86400] : magnitude < 31536000 ? ['month', 2592000] : ['year', 31536000];
    return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(diff / divisor), unit);
  }
  const options = {
    t: { hour: 'numeric', minute: '2-digit' }, T: { hour: 'numeric', minute: '2-digit', second: '2-digit' },
    d: { year: 'numeric', month: '2-digit', day: '2-digit' }, D: { year: 'numeric', month: 'long', day: 'numeric' },
    f: { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' },
    F: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' },
    s: { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit' },
    S: { year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', second: '2-digit' },
  };
  return new Intl.DateTimeFormat(undefined, { ...options[style] || options.f, timeZone: zone }).format(new Date(millis));
}
