/* BBA static competition interface — all information comes from local data files.
   No accounts, backend calls, web APIs or live scores. */
(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = String(text);
    return el;
  };
  const append = (parent, ...nodes) => { for (const node of nodes) if (node) parent.append(node); return parent; };
  const countryNames = {LV: 'Latvia', LT: 'Lithuania', EE: 'Estonia'};
  const countryFlag = {LV: '🇱🇻', LT: '🇱🇹', EE: '🇪🇪'};
  const formatNames = {x: 'Beyblade X', metal: 'Metal Fight', burst: 'Beyblade Burst'};
  const rankingData = window.bbaRankings || {x: [], metal: [], burst: []};
  const tournaments = Array.isArray(window.bbaTournaments) ? window.bbaTournaments : [];
  const news = Array.isArray(window.bbaNews) ? window.bbaNews : [];
  const matchSource = window.bbaMatches || {};
  const upcomingMatches = Array.isArray(matchSource.upcoming) ? matchSource.upcoming : [];
  const recentResults = Array.isArray(matchSource.results) ? matchSource.results : [];
  const filters = {upcoming: 'all', results: 'all'};

  function normalizeFormat(value) {
    const v = String(value || '').toLowerCase();
    if (v === 'x' || v.includes('beyblade x')) return 'x';
    if (v.includes('metal')) return 'metal';
    if (v.includes('burst')) return 'burst';
    return 'x';
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
    const date = new Date(value + 'T12:00:00');
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function dateLabel(value, options = {day:'numeric',month:'short',year:'numeric'}) {
    const date = validDate(value);
    return date ? date.toLocaleDateString('en-GB', options) : 'Date TBA';
  }
  function dayKey(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? value : ''; }
  function safeLink(url) {
    if (typeof url !== 'string' || !url.trim()) return null;
    try {
      const parsed = new URL(url, location.href);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
    } catch (_) { return null; }
  }
  function empty(container, title, description, compact = false) {
    const wrap = make('div', 'empty-state' + (compact ? ' compact' : ''));
    append(wrap, make('strong', '', title), make('p', '', description));
    container.replaceChildren(wrap);
  }
  function limitList(items, limit) {
    const n = Number(limit);
    return Number.isFinite(n) && n > 0 ? items.slice(0, n) : items;
  }
  function meta(text) { return make('span', '', text); }

  function newsItem(post) {
    const article = make('article', 'news-item');
    const marker = (post.title || 'news').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    article.id = 'article-' + marker;
    const top = make('div','meta-line');
    append(top, make('span','tag','BBA NEWS'),meta(dateLabel(post.date)));
    const title = make('h3', '', post.title || 'Untitled announcement');
    const summary = make('p','',post.summary || '');
    append(article,top,title,summary);
    if (Array.isArray(post.body) && post.body.length) {
      const details = make('details','news-expanded');
      const summaryToggle = make('summary','', 'Read full story');
      details.append(summaryToggle);
      for (const paragraph of post.body) details.append(make('p','',paragraph));
      article.append(details);
    }
    return article;
  }
  function renderNews() {
    for (const container of $$('[data-news-list]')) {
      const list = [...news].sort((a,b) => dayKey(b.date).localeCompare(dayKey(a.date)));
      const posts = limitList(list, container.dataset.limit);
      if (!posts.length) {
        empty(container, 'No announcements published yet', 'Official BBA news will appear here when there is something to report.', container.dataset.newsList === 'home');
        continue;
      }
      container.replaceChildren(...posts.map(newsItem));
    }
  }

  function matchRow(item, result = false) {
    const row = make('article', 'match-row');
    const head = make('div','match-head');
    append(head, meta(dateLabel(item.date) + (item.time ? ' · ' + item.time : '')), meta(formatNames[normalizeFormat(item.format)]));
    const pair = make('div','match-pair');
    const first = make('span','match-team', item.player1 || item.home || 'TBA');
    const second = make('span','match-team', item.player2 || item.away || 'TBA');
    const mid = result && Number.isFinite(Number(item.score1)) && Number.isFinite(Number(item.score2))
      ? make('span', 'match-score', Number(item.score1) + ' : ' + Number(item.score2))
      : make('small', '', 'VS');
    append(pair,first,mid,second);
    append(row,head,pair);
    if (item.event || item.stage) row.append(make('div','subline', [item.event,item.stage].filter(Boolean).join(' · ')));
    return row;
  }
  function renderMatches(kind) {
    const all = kind === 'results' ? recentResults : upcomingMatches;
    const sorted = [...all].sort((a,b) => kind === 'results'
      ? dayKey(b.date).localeCompare(dayKey(a.date))
      : dayKey(a.date).localeCompare(dayKey(b.date)));
    for (const container of $$('[data-match-list="' + kind + '"]')) {
      const full = container.classList.contains('match-full-list');
      const list = sorted.filter(x => !full || filters[kind] === 'all' || normalizeFormat(x.format) === filters[kind]);
      const matches = limitList(list, container.dataset.limit);
      if (!matches.length) {
        empty(container, kind === 'results' ? 'No results recorded' : 'No matches scheduled',
          kind === 'results' ? 'Verified match scores will appear here.' : 'Confirmed match fixtures will appear here.', !full);
        continue;
      }
      container.replaceChildren(...matches.map(x => matchRow(x,kind === 'results')));
    }
  }
  function setupMatchFilters() {
    for (const bar of $$('[data-filter-scope]')) {
      const kind = bar.dataset.filterScope;
      for (const button of $$('button[data-format]',bar)) {
        button.addEventListener('click', () => {
          filters[kind] = button.dataset.format;
          for (const b of $$('button[data-format]',bar)) {
            b.classList.toggle('is-active', b === button);
            b.setAttribute('aria-pressed',String(b === button));
          }
          renderMatches(kind);
        });
      }
    }
  }

  function eventRow(event) {
    const link = safeLink(event.link);
    const row = make(link ? 'a' : 'div','event-row');
    if (link) {
      row.href = link;
      if (new URL(link).origin !== location.origin) { row.target = '_blank'; row.rel = 'noopener noreferrer'; }
    }
    const date = validDate(event.date);
    const box = make('div','event-date');
    append(box,make('strong','',date ? String(date.getDate()) : '—'),make('small','',date ? date.toLocaleDateString('en-GB',{month:'short'}).toUpperCase() : 'TBA'));
    const info = make('div','event-info');
    append(info,make('strong','',event.name || 'BBA tournament'),make('small','',[
      (countryFlag[event.country] || '') + (event.city || countryNames[event.country] || 'Location TBA'),
      event.time || ''
    ].filter(Boolean).join(' · ')),make('span','badge',(event.format || 'Format TBA') + ' · ' + (event.ranked ? 'RANKED' : 'UNRANKED')));
    append(row,box,info);
    return row;
  }
  function renderEvents() {
    const now = new Date();
    const today = [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    for(const container of $$('[data-event-list]')){
      const past = container.dataset.eventList === 'past';
      const list = tournaments.filter(e => past ? dayKey(e.date) && dayKey(e.date) < today : !dayKey(e.date) || dayKey(e.date) >= today)
        .sort((a,b) => past ? dayKey(b.date).localeCompare(dayKey(a.date)) : dayKey(a.date).localeCompare(dayKey(b.date)));
      const items = limitList(list, container.dataset.limit);
      if(!items.length) { empty(container,past?'No past events listed':'No upcoming events','Tournament announcements will appear here when confirmed.',!container.classList.contains('event-full-list'));continue; }
      container.replaceChildren(...items.map(eventRow));
    }
  }

  function sortedRanking(key) {
    const values = rankingData[key];
    return Array.isArray(values) ? [...values].sort((a,b) => (Number(b.points)||0)-(Number(a.points)||0)) : [];
  }
  function drawMiniRanking(key) {
    const el = $('[data-mini-ranking]');
    if (!el) return;
    const items = sortedRanking(key).slice(0,5);
    if (!items.length) {
      empty(el, 'No ranked players yet', 'Rankings start after official events.',true);
      return;
    }
    const rows = items.map((p,i) => {
      const row = make('div','mini-ranking-row');
      append(row,make('span','number','#'+(i+1)),make('span','player',p.name||'Player'),make('span','country',countryFlag[p.country]||p.country||''),make('span','points',String(Number(p.points)||0)));
      return row;
    });
    el.replaceChildren(...rows);
  }
  function setupMiniRanking() {
    const tabs = $$('[data-mini-tab]');
    if (!tabs.length) return;
    const render = key => {
      drawMiniRanking(key);
      for (const tab of tabs) {
        const selected = tab.dataset.miniTab === key;
        tab.classList.toggle('is-active',selected);
        tab.setAttribute('aria-pressed',String(selected));
      }
    };
    for (const tab of tabs) tab.addEventListener('click',()=>render(tab.dataset.miniTab));
    render('x');
  }
  function renderRankings(key) {
    const tbody = $('[data-ranking-table]');
    if(!tbody)return;
    const country = $('[data-rank-country]')?.value || 'all';
    const data = sortedRanking(key);
    const filtered = data.filter(p => country === 'all' || p.country === country);
    const label = $('[data-rank-label]');
    if(label) label.textContent = formatNames[key] + ' ranking';
    const emptyBox = $('[data-rank-empty]');
    if (!filtered.length) {
      tbody.replaceChildren();
      if(emptyBox) {
        emptyBox.hidden = false;
        empty(emptyBox,'No ranked players yet','Rankings will appear after verified results are published.');
      }
      return;
    }
    if(emptyBox)emptyBox.hidden = true;
    const rows = filtered.map(p => {
      const tr = make('tr');
      const overallIndex = data.indexOf(p);
      const rank = data.filter(x => (Number(x.points)||0) > (Number(p.points)||0)).length + 1;
      const rankNum = Number.isFinite(rank) ? rank : overallIndex+1;
      for (const value of ['#'+rankNum,p.name||'Player',(countryFlag[p.country]||'')+' '+(countryNames[p.country]||p.country||'—'),p.events??0,p.points??0])
        tr.append(make('td','',value));
      return tr;
    });
    tbody.replaceChildren(...rows);
  }
  function setupRankings() {
    const tabs = $$('[data-rank-tab]');
    if(!tabs.length)return;
    let active=['x','metal','burst'].includes(location.hash.replace('#','')) ? location.hash.substring(1) : 'x';
    const show = key => {
      active=key;
      for (const tab of tabs) {
        const isActive=tab.dataset.rankTab===key;
        tab.setAttribute('aria-selected',String(isActive));
        tab.tabIndex=isActive?0:-1;
      }
      renderRankings(key);
    };
    for(const tab of tabs) {
      tab.addEventListener('click',()=>{
        const key=tab.dataset.rankTab;
        if(history.replaceState)history.replaceState(null,'','#'+key);
        show(key);
      });
      tab.addEventListener('keydown',e=>{
        if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
        e.preventDefault();
        const keys=['x','metal','burst'];
        const index=keys.indexOf(active);
        const next=keys[(index+(e.key==='ArrowRight'?1:2))%3];
        const nextButton=tabs.find(x=>x.dataset.rankTab===next);
        nextButton?.focus();
        nextButton?.click();
      });
    }
    $('[data-rank-country]')?.addEventListener('change',()=>renderRankings(active));
    show(active);
    window.addEventListener('hashchange',()=>{
      const key=location.hash.substring(1);
      if(['x','metal','burst'].includes(key))show(key);
    });
  }

  const nav = $('#primary-nav');
  const menu = $('.menu-button');
  if(nav && menu) {
    menu.addEventListener('click',()=>{
      const open=nav.classList.toggle('is-open');
      menu.setAttribute('aria-expanded',String(open));
      menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');
    });
    $$('a',nav).forEach(link=>link.addEventListener('click',()=>{
      nav.classList.remove('is-open');
      menu.setAttribute('aria-expanded','false');
    }));
  }

  const year = $('[data-year]');
  if(year)year.textContent=String(new Date().getFullYear());
  renderNews();
  setupMatchFilters();
  renderMatches('upcoming');
  renderMatches('results');
  renderEvents();
  setupMiniRanking();
  setupRankings();
})();
