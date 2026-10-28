const KEY = 'discord-syntax:v1';
export function createStorage(getStorage = () => window.localStorage) {
  let available = true;
  return {
    get available() { return available; },
    load() {
      try {
        const saved = JSON.parse(getStorage().getItem(KEY));
        if (!saved || typeof saved !== 'object') return {};
        return {
          ...(typeof saved.draft === 'string' ? { draft: saved.draft } : {}),
          ...(['formatter', 'timestamps', 'templates', 'guide'].includes(saved.tab) ? { tab: saved.tab } : {}),
          ...(typeof saved.timezone === 'string' ? { timezone: saved.timezone } : {}),
        };
      } catch { available = false; return {}; }
    },
    save(state) { try { getStorage().setItem(KEY, JSON.stringify(state)); return true; } catch { available = false; return false; } },
    clear() { try { getStorage().removeItem(KEY); return true; } catch { available = false; return false; } },
  };
}
