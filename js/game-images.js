(() => {
  const CACHE_KEY = 'stranniki-openverse-images-v1';
  const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
  const queries = {
    slime: 'fantasy green slime monster game art',
    goblin: 'fantasy goblin game art',
    wolf: 'fantasy shadow wolf monster game art',
    golem: 'fantasy stone golem monster game art',
    'Оружие': 'fantasy sword equipment game art',
    'Обувь': 'fantasy leather boots equipment game art',
    'Ноги': 'fantasy leg armor equipment game art',
    'Торс': 'fantasy chest armor equipment game art',
    'Шлем': 'fantasy helmet equipment game art',
    'Рюкзак': 'fantasy adventurer backpack game art'
  };
  const fallback = { slime: '🟢', goblin: '👺', wolf: '🐺', golem: '🗿', 'Оружие': '⚔️', 'Обувь': '🥾', 'Ноги': '🦵', 'Торс': '🛡️', 'Шлем': '🪖', 'Рюкзак': '🎒' };
  const itemIcons = {
    'Оружие': ['sword-clash', 'Lorc'], '2 рука': ['crenulated-shield', 'Lorc'], 'Обувь': ['boots', 'Lorc'],
    'Ноги': ['greaves', 'Delapouite'], 'Торс': ['breastplate', 'Lorc'], 'Шлем': ['barbute', 'Lorc'], 'Рюкзак': ['backpack', 'Delapouite']
  };
  const pending = new Map();
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch {}

  function getImage(kind) {
    const key = String(kind || '').toLowerCase();
    const gameIcon = itemIcons[kind];
    if (gameIcon) {
      const [icon, creator] = gameIcon;
      const slug = icon;
      const author = creator.toLowerCase();
      return Promise.resolve({ src: `https://api.iconify.design/game-icons/${slug}.svg?color=%23ffd166`, page: `https://game-icons.net/1x1/${author}/${slug}.html`, license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/', creator });
    }
    const cached = cache[key];
    if (cached && Date.now() - cached.savedAt < CACHE_TTL) return Promise.resolve(cached.image);
    if (pending.has(key)) return pending.get(key);
    const query = queries[kind] || queries[key];
    if (!query) return Promise.resolve(null);
    const url = new URL('https://api.openverse.org/v1/images/');
    url.searchParams.set('q', query);
    url.searchParams.set('page_size', '8');
    url.searchParams.set('license', 'cc0,by,by-sa,by-nc,by-nc-sa');
    const request = fetch(url, { headers: { Accept: 'application/json' }, mode: 'cors' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        const results = Array.isArray(data?.results) ? data.results : [];
        const image = results.find(result => typeof (result.thumbnail || result.url) === 'string' && /^https:\/\//i.test(result.thumbnail || result.url));
        if (!image) return null;
        const record = {
          src: image.thumbnail || image.url,
          page: /^https:\/\//i.test(image.foreign_landing_url || '') ? image.foreign_landing_url : '',
          license: String(image.license || '').toUpperCase(),
          licenseUrl: /^https:\/\//i.test(image.license_url || '') ? image.license_url : '',
          creator: String(image.creator || image.attribution || '').slice(0, 100)
        };
        cache[key] = { savedAt: Date.now(), image: record };
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
        return record;
      })
      .catch(() => null)
      .finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  }

  function show(target, kind, textFallback = fallback[kind] || '🎒', creditTarget = null) {
    if (!target) return;
    const requestKind = String(kind || '');
    target.dataset.imageRequestKind = requestKind;
    target.replaceChildren(document.createTextNode(textFallback));
    target.classList.remove('has-game-image');
    if (creditTarget) creditTarget.replaceChildren();
    getImage(kind).then(image => {
      if (!image || !target.isConnected || target.dataset.imageRequestKind !== requestKind) return;
      const img = document.createElement('img');
      img.src = image.src;
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => { img.remove(); if (!target.childNodes.length) target.append(document.createTextNode(textFallback)); }, { once: true });
      target.replaceChildren(img);
      target.classList.add('has-game-image');
      if (creditTarget) {
        const links = [];
        if (image.page) links.push({ text: 'Источник', href: image.page });
        if (image.license && image.licenseUrl) links.push({ text: image.license, href: image.licenseUrl });
        if (image.creator) {
          const creator = document.createElement('span');
          creator.textContent = image.creator;
          creditTarget.append(creator);
        }
        links.forEach((entry, index) => {
          if (creditTarget.childNodes.length || index) creditTarget.append(document.createTextNode(' · '));
          const link = document.createElement('a');
          link.href = entry.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = entry.text;
          creditTarget.append(link);
        });
      }
    });
  }

  window.GameImages = { get: getImage, show };
})();
