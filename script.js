const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
  }));
}

const flags = {LV: '🇱🇻', LT: '🇱🇹', EE: '🇪🇪'};
const countries = {LV: 'Latvia', LT: 'Lithuania', EE: 'Estonia'};

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

// Rankings: independent X, Metal and Burst tabs.
const rankingTabs = Array.from(document.querySelectorAll('.ranking-tab'));
if (rankingTabs.length) {
  const formats = ['x', 'metal', 'burst'];
  const data = window.bbaRankings || {x: [], metal: [], burst: []};
  const filters = document.querySelectorAll('[data-country-filter]');

  function renderFormat(format) {
    const body = document.querySelector(`[data-rankings-body="${format}"]`);
    if (!body) return;
    const country = document.querySelector(`[data-country-filter="${format}"]`).value;
    const list = Array.isArray(data[format]) ? [...data[format]] : [];
    const eligible = list
      .filter(player => typeof player.name === 'string' && player.name.trim() && countries[player.country] && Number.isFinite(player.points) && Number.isFinite(player.events))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
    const ranked = eligible.map((player, index) => ({...player, rank: 1 + eligible.findIndex(p => p.points === player.points)}));
    const visible = ranked.filter(player => country === 'all' || player.country === country);
    body.replaceChildren();
    const empty = document.querySelector(`[data-ranking-empty="${format}"]`);
    empty.hidden = visible.length > 0;
    if (!visible.length) {
      empty.textContent = country === 'all'
        ? 'No ranked players yet.'
        : 'No ranked players from this country yet.';
      return;
    }
    for (const player of visible) {
      const row = document.createElement('tr');
      const fields = [`#${player.rank}`, player.name, `${flags[player.country]} ${countries[player.country]}`, player.events, player.points];
      for (const [index, value] of fields.entries()) {
        const cell = document.createElement('td');
        cell.textContent = String(value);
        if (index === 4) cell.className = 'ranking-points';
        row.appendChild(cell);
      }
      body.appendChild(row);
    }
  }

  function activateRanking(format, updateHash = true) {
    if (!formats.includes(format)) return;
    for (const tab of rankingTabs) {
      const selected = tab.dataset.format === format;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const panel of document.querySelectorAll('.ranking-panel')) {
      panel.hidden = panel.dataset.format !== format;
    }
    renderFormat(format);
    if (updateHash && window.location.hash !== `#${format}`) {
      // Keep deep links bookmarkable without scrolling past the tabs.
      history.replaceState(null, '', `#${format}`);
    }
  }

  rankingTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateRanking(tab.dataset.format));
    tab.addEventListener('keydown', event => {
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % rankingTabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + rankingTabs.length) % rankingTabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = rankingTabs.length - 1;
      else return;
      event.preventDefault();
      rankingTabs[nextIndex].focus();
      activateRanking(rankingTabs[nextIndex].dataset.format);
    });
  });
  filters.forEach(select => select.addEventListener('change', () => renderFormat(select.dataset.countryFilter)));
  window.addEventListener('hashchange', () => {
    const chosen = window.location.hash.slice(1);
    if (formats.includes(chosen)) activateRanking(chosen, false);
  });
  const initial = window.location.hash.slice(1);
  activateRanking(formats.includes(initial) ? initial : 'x', false);
}

// Theme: black by default; a light choice lasts only for this browser tab session.
const themeToggle = document.querySelector('.theme-toggle');
const themeColor = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  const isLight = theme === 'light';
  if (isLight) document.documentElement.dataset.theme = 'light';
  else delete document.documentElement.dataset.theme;
  if (themeColor) themeColor.content = isLight ? '#f7f7f5' : '#000000';
  if (themeToggle) themeToggle.setAttribute('aria-label', isLight ? 'Switch to black theme' : 'Switch to light theme');
}

if (themeToggle) {
  applyTheme(document.documentElement.dataset.theme);
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { sessionStorage.setItem('bba-theme', next); } catch (e) {}
  });
}

// News: newest first. "latest" shows a short preview on the homepage, "all" the full news page.
const newsLists = document.querySelectorAll('[data-news-list]');
if (newsLists.length) {
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
  const posts = (Array.isArray(window.bbaNews) ? window.bbaNews : [])
    .filter(post => typeof post.title === 'string' && post.title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(post.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(post => ({...post, slug: `${post.date}-${post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}));

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function dateLabel(post) {
    const [y, m, d] = post.date.split('-').map(Number);
    const time = make('time', 'news-date', new Date(y, m - 1, d).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'}));
    time.dateTime = post.date;
    return time;
  }

  for (const list of newsLists) {
    const isPreview = list.dataset.newsList === 'latest';
    list.replaceChildren();
    if (!posts.length) {
      // The homepage hides its news section entirely until there is a post.
      const section = list.closest('[data-news-section]');
      if (section) { section.hidden = true; continue; }
      const empty = make('div', 'content-card news-empty');
      empty.append(make('p', '', 'No news yet.'));
      list.appendChild(empty);
      continue;
    }
    for (const post of isPreview ? posts.slice(0, 3) : posts) {
      const article = make('article', isPreview ? 'news-card' : 'content-card news-post');
      article.append(dateLabel(post));
      if (isPreview) {
        article.append(make('h3', '', post.title));
        if (post.summary) article.append(make('p', '', post.summary));
        if (post.body && post.body.length) {
          const link = make('a', 'text-link', 'Read more ');
          link.href = `news.html#${post.slug}`;
          link.insertAdjacentHTML('beforeend', arrow);
          article.append(link);
        }
      } else {
        article.id = post.slug;
        article.append(make('h2', '', post.title));
        if (post.summary) article.append(make('p', 'news-summary', post.summary));
        const body = Array.isArray(post.body) ? post.body : post.body ? [post.body] : [];
        for (const paragraph of body) article.append(make('p', '', paragraph));
      }
      list.appendChild(article);
    }
  }
  // Posts are added after load, so jump to a linked post once it exists.
  const target = window.location.hash && document.getElementById(window.location.hash.slice(1));
  if (target) target.scrollIntoView();
}

// Tournaments: date badge rows split into upcoming (soonest first) and past (latest first).
const tournamentLists = document.querySelectorAll('[data-tournament-list]');
if (tournamentLists.length) {
  const icons = {
    time: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>',
    ranked: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
    format: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>'
  };
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const events = (Array.isArray(window.bbaTournaments) ? window.bbaTournaments : [])
    .filter(event => /^\d{4}-\d{2}-\d{2}$/.test(event.date) && typeof event.city === 'string' && event.city.trim() && countries[event.country])
    .map(event => ({...event, slug: `${event.date}-${event.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}));
  const upcoming = events.filter(event => event.date >= today).sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')));
  const past = events.filter(event => event.date < today).sort((a, b) => b.date.localeCompare(a.date));

  function metaItem(icon, text) {
    const item = document.createElement('span');
    item.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[icon]}</svg>`;
    item.append(` ${text}`);
    return item;
  }

  function eventRow(event, linkToPage) {
    const [, m, d] = event.date.split('-').map(Number);
    const href = linkToPage ? `tournaments.html#${event.slug}` : event.link;
    const row = document.createElement(href ? 'a' : 'div');
    row.className = 'event-row';
    if (href) {
      row.href = href;
      if (!linkToPage) { row.target = '_blank'; row.rel = 'noopener'; }
    }
    if (!linkToPage) row.id = event.slug;

    const badge = document.createElement('time');
    badge.className = 'date-badge';
    badge.dateTime = event.date;
    const month = document.createElement('span');
    month.className = 'date-badge-month';
    month.textContent = monthNames[m - 1];
    const day = document.createElement('span');
    day.className = 'date-badge-day';
    day.textContent = String(d);
    badge.append(month, day);

    const info = document.createElement('div');
    info.className = 'event-info';
    const place = document.createElement('p');
    place.className = 'event-place';
    const city = document.createElement('strong');
    city.textContent = `${event.city},`;
    place.append(`${flags[event.country]} `, city, ` ${countries[event.country]}`);
    info.append(place);
    if (event.name) {
      const name = document.createElement('p');
      name.className = 'event-name';
      name.textContent = event.name;
      info.append(name);
    }
    const meta = document.createElement('div');
    meta.className = 'event-meta';
    if (event.time) meta.append(metaItem('time', event.time));
    meta.append(metaItem('ranked', event.ranked ? 'Ranked' : 'Unranked'));
    if (event.format) meta.append(metaItem('format', event.format));
    info.append(meta);

    row.append(badge, info);
    return row;
  }

  for (const list of tournamentLists) {
    const isPast = list.dataset.tournamentList === 'past';
    const isPreview = Boolean(list.dataset.limit);
    const items = isPast ? past : upcoming.slice(0, Number(list.dataset.limit) || undefined);
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-message';
      empty.innerHTML = isPast
        ? '<p>No past tournaments yet.</p>'
        : '<p>No tournaments announced yet.</p>';
      list.appendChild(empty);
      continue;
    }
    for (const event of items) list.appendChild(eventRow(event, isPreview));
  }

  const target = window.location.hash && document.getElementById(window.location.hash.slice(1));
  if (target) target.scrollIntoView();
}

// Account links are rendered in both the desktop header and small-screen menu.
// Only show Profile when the server confirms an authenticated session.
(async function bbaAccountNavigation() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const guestLinks = Array.from(header.querySelectorAll('[data-auth-guest]'));
  const profileLinks = Array.from(header.querySelectorAll('[data-auth-profile], [data-auth-settings]'));
  if (!guestLinks.length || !profileLinks.length) return;

  const currentPage = location.pathname.split('/').pop() || 'index.html';
  function showState(authenticated) {
    for (const link of guestLinks) link.hidden = authenticated;
    for (const link of profileLinks) link.hidden = !authenticated;
    for (const link of [...guestLinks, ...profileLinks]) {
      if (!link.hidden && link.getAttribute('href') === currentPage)
        link.setAttribute('aria-current', 'page');
      else
        link.removeAttribute('aria-current');
    }
  }

  // All account links start hidden in the HTML. Reveal only the correct
  // links after the session check, so logged-in players never see Register flash.
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) throw Error('Account status unavailable');
    const data = await response.json();
    showState(data.authenticated === true);
  } catch (_) {
    // If verification fails, offer guest links rather than hiding navigation.
    showState(false);
  }
})();
