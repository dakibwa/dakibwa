const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2,
});

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const compactGbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dtf = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const longDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
});

const APP_NAME = 'Akibwa';
const LIFE_CONFIG = {
  mode: 'local',
  dataUrl: '/api/life.json',
  noteFileUrl: '/api/journal/note-file',
  transcribeUrl: '/api/journal/transcribe',
  readOnly: false,
  ...(window.AKIBWA_LIFE_CONFIG || {}),
};
const IS_READ_ONLY = Boolean(LIFE_CONFIG.readOnly);
const DictationCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const JOURNAL_DRAFT_STORAGE_KEY = 'akibwa.journalDraft.v1';
const APPEARANCE_STORAGE_KEY = 'akibwa.appearance.v1';
const VALID_SECTIONS = ['overview', 'profile', 'onebag', 'fashion', 'running', 'finances', 'investments', 'creative', 'journal', 'people', 'employment', 'soul'];
const FASHION_GROUP_ORDER = ['Tops', 'Bottoms', 'Outerwear', 'Footwear', 'Accessories'];
const INVESTMENT_RANGES = {
  '1M': 31,
  '3M': 92,
  '6M': 183,
  '1Y': 366,
};

const SECTION_META = {
  overview: {
    label: APP_NAME,
    title: 'Private knowledge base',
    copy: 'A private agent-readable life knowledge base with capture built into the front door.',
  },
  profile: {
    label: 'Profile',
    title: 'Taste, canon, and influences',
    copy: 'A compact profile layer for books, quotes, influences, television, and films that future agents can use as reference context.',
  },
  onebag: {
    label: 'Onebag system',
    title: 'Carry setup and weight pressure',
    copy: 'See what is currently driving weight, value, and packing pressure in the bag setup.',
  },
  fashion: {
    label: 'Fashion',
    title: 'Current wardrobe',
    copy: 'A cleaner wardrobe view pulled from the clothing, footwear, and wearable accessories in your inventory.',
  },
  running: {
    label: 'Running',
    title: 'Shoe options',
    copy: 'A lighter carousel of contenders for the one shoe that can handle everyday life and still feel quick enough to run in.',
  },
  finances: {
    label: 'Finances',
    title: 'Cash flow and current pressure',
    copy: 'Use this area for cash, liabilities, and the monthly shape of everyday money.',
  },
  investments: {
    label: 'Investments',
    title: 'Portfolio shape and trend',
    copy: 'This section keeps holdings visible and lets private history build over time.',
  },
  creative: {
    label: 'Creative',
    title: 'Writing shelf',
    copy: 'A lighter place for titles, fragments, and the parts of the creative doc worth surfacing.',
  },
  journal: {
    label: 'Journal',
    title: 'Recent journal movement',
    copy: 'Review recent entries and the themes that are currently surfacing.',
  },
  people: {
    label: 'People',
    title: 'Relationships and people records',
    copy: 'The journal is now being compiled into a people layer so names, relationship patterns, and evidence-backed facts can accumulate over time.',
  },
  employment: {
    label: 'Employment',
    title: 'Work rhythm and compensation',
    copy: 'Comp, work pattern, and recent payslip movement sit together here.',
  },
  soul: {
    label: 'Soul',
    title: 'North star and values',
    copy: 'The orienting layer beneath the rest of the dashboard lives in this section.',
  },
};

const state = {
  snapshot: null,
  activeSection: 'overview',
  selectedPersonSlug: '',
  activeWikiPath: '',
  navBound: false,
  captureBound: false,
  investmentBound: false,
  creativeBound: false,
  runningBound: false,
  appearanceBound: false,
  drawerOpen: false,
  currentCaptureSource: 'typed',
  investmentRange: '6M',
  creativeSelectedTitle: '',
  recognition: null,
  isDictating: false,
  dictationBaseText: '',
  dictationFinalText: '',
  mediaRecorder: null,
  mediaStream: null,
  mediaChunks: [],
  isRecording: false,
  appearance: {
    textSize: 'standard',
    width: 'standard',
  },
};

const el = (id) => document.getElementById(id);

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const fmtKg = (value) => `${Number(value || 0).toFixed(2)} kg`;
const fmtG = (value) => `${Math.round(Number(value || 0))} g`;
const fmtPct = (value) => `${value > 0 ? '+' : ''}${Number(value || 0).toFixed(1)}%`;
const fmtDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || '') : dtf.format(date);
};
const fmtIsoDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value || '') : dtf.format(date);
};
const fmtDelta = (value) => `${value > 0 ? '+' : ''}${gbp.format(value)}`;
const truncate = (value, max = 180) =>
  value && value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
const relationshipLabel = (value) => String(value || 'acquaintance').replaceAll('-', ' ');
const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function isoDate(value) {
  return new Date(`${value}T00:00:00`);
}

function filterSeriesByRange(series, rangeKey) {
  const days = INVESTMENT_RANGES[rangeKey];
  if (!series?.length || !days) return series || [];

  const latestDate = isoDate(series[series.length - 1].date);
  if (Number.isNaN(latestDate.getTime())) return series;

  const cutoff = new Date(latestDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const filtered = series.filter((point) => {
    const pointDate = isoDate(point.date);
    return !Number.isNaN(pointDate.getTime()) && pointDate >= cutoff;
  });
  return filtered.length >= 2 ? filtered : series.slice(Math.max(series.length - 2, 0));
}

function valueOnOrBefore(history, targetDate) {
  let value = null;
  (history || []).forEach((point) => {
    if (!point?.date || point.date > targetDate) return;
    value = Number(point.valueGbp || 0);
  });
  return value;
}

function nativePriceLabel(position) {
  const value = Number(position?.latestPriceNative || 0);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (position.currency === 'USD') return usd.format(value);
  if (position.currency === 'GBp') return `${value.toFixed(value >= 100 ? 0 : 1)}p`;
  return gbp.format(value);
}

function signedClass(value) {
  if (value > 0) return 'is-positive';
  if (value < 0) return 'is-negative';
  return 'is-flat';
}

function desktopDrawerAllowed() {
  return window.innerWidth > 1120;
}

function readJournalDraft() {
  try {
    const raw = window.localStorage.getItem(JOURNAL_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') return null;
    return {
      content: typeof payload.content === 'string' ? payload.content : '',
      updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : '',
    };
  } catch (_error) {
    return null;
  }
}

function writeJournalDraft(content) {
  try {
    const trimmed = String(content || '');
    if (!trimmed.trim()) {
      window.localStorage.removeItem(JOURNAL_DRAFT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(JOURNAL_DRAFT_STORAGE_KEY, JSON.stringify({
      content: trimmed,
      updatedAt: new Date().toISOString(),
    }));
  } catch (_error) {
    // Ignore storage failures and keep the current in-memory draft.
  }
}

function clearJournalDraft() {
  try {
    window.localStorage.removeItem(JOURNAL_DRAFT_STORAGE_KEY);
  } catch (_error) {
    // Ignore storage failures and continue.
  }
}

function readAppearancePrefs() {
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') return null;
    const textSize = ['small', 'standard', 'large'].includes(payload.textSize) ? payload.textSize : 'standard';
    const width = ['standard', 'wide'].includes(payload.width) ? payload.width : 'standard';
    return { textSize, width };
  } catch (_error) {
    return null;
  }
}

function writeAppearancePrefs() {
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(state.appearance));
  } catch (_error) {
    // Ignore storage failures and continue.
  }
}

function applyAppearancePrefs() {
  document.body.dataset.textSize = state.appearance.textSize || 'standard';
  document.body.dataset.contentWidth = state.appearance.width || 'standard';
}

function syncAppearanceControls() {
  document.querySelectorAll('input[name="appearance-text-size"]').forEach((input) => {
    input.checked = input.value === state.appearance.textSize;
  });
  document.querySelectorAll('input[name="appearance-width"]').forEach((input) => {
    input.checked = input.value === state.appearance.width;
  });
}

function relativeTime(value) {
  if (!value) return '';
  const diffMs = Math.max(0, Date.now() - new Date(value).getTime());
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}

function creativeEntries(data) {
  return Array.isArray(data?.creative?.entries) ? data.creative.entries : [];
}

function selectedCreativeEntry(data) {
  const entries = creativeEntries(data);
  if (!entries.length) return null;
  const selected = entries.find((entry) => entry.title === state.creativeSelectedTitle);
  if (selected) return selected;
  state.creativeSelectedTitle = entries[0].title;
  return entries[0];
}


function fashionGroupForCategory(category) {
  const value = String(category || '').trim().toLowerCase();
  if (['t-shirt', 'tank top', 'polo shirt', 'base layer', 'overshirt'].includes(value)) return 'Tops';
  if (['trousers', 'shorts', 'swim shorts', 'jeans', 'underwear'].includes(value)) return 'Bottoms';
  if (['rain jacket', 'down jacket'].includes(value)) return 'Outerwear';
  if (['trail shoes', 'running shoes', 'socks'].includes(value)) return 'Footwear';
  if (['belt', 'watch', 'glasses'].includes(value)) return 'Accessories';
  return null;
}

function buildFashionData(items) {
  const fashionItems = (items || [])
    .map((item) => ({ ...item, fashionGroup: fashionGroupForCategory(item.category) }))
    .filter((item) => item.fashionGroup);

  const groups = new Map();
  FASHION_GROUP_ORDER.forEach((group) => {
    groups.set(group, { group, count: 0, valueGbp: 0, weightG: 0 });
  });

  fashionItems.forEach((item) => {
    const current = groups.get(item.fashionGroup);
    if (!current) return;
    current.count += 1;
    current.valueGbp += Number(item.priceGbp || 0);
    current.weightG += Number(item.weightG || 0);
  });

  const populatedGroups = [...groups.values()].filter((group) => group.count > 0);
  return {
    items: fashionItems,
    categories: populatedGroups,
    totalValueGbp: fashionItems.reduce((sum, item) => sum + Number(item.priceGbp || 0), 0),
    totalWeightG: fashionItems.reduce((sum, item) => sum + Number(item.weightG || 0), 0),
    footwearCount: fashionItems.filter((item) => item.fashionGroup === 'Footwear').length,
  };
}

function readRouteFromHash() {
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (!raw) {
    return { section: 'overview', personSlug: '', wikiPath: '' };
  }

  if (raw.toLowerCase().startsWith('wiki/')) {
    const encodedPath = raw.slice(5);
    let wikiPath = '';
    try {
      wikiPath = decodeURIComponent(encodedPath);
    } catch (_error) {
      wikiPath = encodedPath;
    }
    return {
      section: 'overview',
      personSlug: '',
      wikiPath,
    };
  }

  const [sectionPart, ...rest] = raw.split('/').filter(Boolean);
  const section = String(sectionPart || '').toLowerCase();
  const normalizedSection = !section || section === 'overview' || section === 'home'
    ? 'overview'
    : VALID_SECTIONS.includes(section)
    ? section
    : 'overview';

  return {
    section: normalizedSection,
    personSlug: normalizedSection === 'people' ? slugify(rest.join('/')) : '',
    wikiPath: '',
  };
}

function readSectionFromHash() {
  return readRouteFromHash().section;
}

function writeSectionHash(section, mode = 'push', personSlug = '') {
  const hash = section === 'overview'
    ? ''
    : section === 'people' && personSlug
    ? `#people/${personSlug}`
    : `#${section}`;
  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) {
    return;
  }

  const method = mode === 'replace' ? 'replaceState' : 'pushState';
  window.history[method]({}, '', nextUrl);
}

function writeWikiHash(path, mode = 'push') {
  const hash = path ? `#wiki/${encodeURIComponent(path)}` : '';
  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) {
    return;
  }

  const method = mode === 'replace' ? 'replaceState' : 'pushState';
  window.history[method]({}, '', nextUrl);
}

function peopleDirectory(data) {
  return Array.isArray(data?.people?.directory) ? data.people.directory : [];
}

function selectedPerson(data) {
  const directory = peopleDirectory(data);
  if (!directory.length) return null;
  if (!state.selectedPersonSlug) return null;
  return directory.find((item) => item.slug === state.selectedPersonSlug) || null;
}

function wikiPages(data) {
  return Array.isArray(data?.aiContext?.site?.pages) ? data.aiContext.site.pages : [];
}

function wikiSources(data) {
  return Array.isArray(data?.aiContext?.sources) ? data.aiContext.sources : [];
}

function wikiPageByPath(data, path) {
  if (!path) return null;
  return wikiPages(data).find((page) => page.path === path) || null;
}

function wikiSourceByKey(data, key) {
  if (!key) return null;
  return wikiSources(data).find((source) => source.key === key) || null;
}

function pagePathForSectionView(section, data) {
  const normalized = VALID_SECTIONS.includes(section) ? section : 'overview';
  if (normalized === 'people') {
    const person = selectedPerson(data);
    return person?.slug ? `People/${person.slug}.md` : 'Domains/people.md';
  }
  return `Domains/${normalized}.md`;
}

function currentWikiPath(data) {
  if (state.activeWikiPath) return state.activeWikiPath;
  return pagePathForSectionView(state.activeSection, data);
}

function currentWikiRecord(data) {
  return wikiPageByPath(data, currentWikiPath(data));
}

function routeTargetForPath(path) {
  if (!path) return null;

  const domainMatch = /^Domains\/([a-z0-9-]+)\.md$/i.exec(path);
  if (domainMatch) {
    return { attr: 'data-nav-section', value: domainMatch[1].toLowerCase() };
  }

  const personMatch = /^People\/([a-z0-9-]+)\.md$/i.exec(path);
  if (personMatch) {
    return { attr: 'data-person-slug', value: personMatch[1].toLowerCase() };
  }

  return { attr: 'data-wiki-path', value: path };
}

function titleForPath(path, data) {
  const record = wikiPageByPath(data || state.snapshot, path);
  if (record?.title) return record.title;

  const filename = String(path || '').split('/').pop() || '';
  const stem = filename.replace(/\.md$/i, '');
  return stem
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || path;
}

function wikiButtonForPath(path, label, className = 'wiki-link-button') {
  const target = routeTargetForPath(path);
  if (!target) return '';
  return `<button class="${escapeHtml(className)}" type="button" ${target.attr}="${escapeHtml(target.value)}">${escapeHtml(label || titleForPath(path))}</button>`;
}

function wikiBrowseButton(path, title, note, isActive = false) {
  const target = routeTargetForPath(path);
  if (!target) return '';
  return `
    <button class="wiki-browse-link ${isActive ? 'is-active' : ''}" type="button" ${target.attr}="${escapeHtml(target.value)}">
      <span class="wiki-browse-link-title">${escapeHtml(title || titleForPath(path))}</span>
      ${note ? `<span class="wiki-browse-link-note">${escapeHtml(note)}</span>` : ''}
    </button>
  `;
}

function humanizeKey(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function formatStructuredCellValue(value) {
  if (value == null || value === '') return '';
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) return '';
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') return String(item);
        if (typeof item === 'object') {
          if (item.title) return item.title;
          if (item.name) return item.name;
          if (item.path) return titleForPath(item.path);
          return Object.values(item).filter((inner) => typeof inner === 'string' || typeof inner === 'number').join(' · ');
        }
        return '';
      })
      .filter(Boolean)
      .join(', ');
  }
  if (typeof value === 'object') {
    if (value.title) return String(value.title);
    if (value.name) return String(value.name);
    return Object.entries(value)
      .filter(([, item]) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
      .map(([key, item]) => `${humanizeKey(key)}: ${item}`)
      .join(' · ');
  }
  return String(value);
}

function scalarObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every((item) => item == null || ['string', 'number', 'boolean'].includes(typeof item));
}

function tabularKeys(rows) {
  const ordered = [];
  (rows || []).forEach((row) => {
    Object.entries(row || {}).forEach(([key, value]) => {
      if (value == null || value === '' || Array.isArray(value) || (value && typeof value === 'object')) return;
      if (!ordered.includes(key)) ordered.push(key);
    });
  });
  return ordered;
}

function personByName(data, name) {
  const target = String(name || '').trim().toLowerCase();
  if (!target) return null;
  return peopleDirectory(data).find((person) => String(person.name || '').trim().toLowerCase() === target) || null;
}

function stackItem(title, metric, note) {
  return `
    <article class="wiki-record stack-item">
      <div class="wiki-record-head stack-top">
        <div class="wiki-record-title stack-title">${escapeHtml(title)}</div>
        ${metric ? `<div class="wiki-record-meta stack-metric">${escapeHtml(metric)}</div>` : ''}
      </div>
      ${note ? `<p class="wiki-record-note stack-note">${escapeHtml(note)}</p>` : ''}
    </article>
  `;
}

function statCard(label, value, note = '') {
  return `
    <article class="wiki-record wiki-record-stat stat-card">
      <div class="wiki-record-head">
        <p class="wiki-record-title stat-card-label">${escapeHtml(label)}</p>
        <p class="wiki-record-meta stat-card-value">${escapeHtml(value)}</p>
      </div>
      ${note ? `<p class="wiki-record-note stack-note">${escapeHtml(note)}</p>` : ''}
    </article>
  `;
}

function bulletRows(items) {
  if (!items?.length) {
    return '<div class="empty-state">Nothing surfaced from this document section yet.</div>';
  }
  return items
    .map(
      (item) => `
        <div class="bullet-row">
          <span class="bullet-dot"></span>
          <div>${escapeHtml(item)}</div>
        </div>
      `,
    )
    .join('');
}

function articleBlock(id, title, content) {
  return `
    <section class="article-block">
      <h2 class="wiki-subhead" id="${escapeHtml(id)}">${escapeHtml(title)}</h2>
      ${content}
    </section>
  `;
}

function wikiParagraphs(items) {
  const lines = (items || []).filter(Boolean);
  return lines.length
    ? lines.map((item) => `<p class="wiki-body-copy">${escapeHtml(item)}</p>`).join('')
    : '<div class="empty-state">No narrative text is available yet.</div>';
}

function wikiList(items) {
  const rows = (items || []).filter(Boolean);
  return rows.length
    ? `<ul class="wiki-list">${rows.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<div class="empty-state">No items are available yet.</div>';
}

function wikiDefinitionTable(rows) {
  const items = (rows || []).filter((row) => row && row[0] && row[1] !== undefined && row[1] !== null && String(row[1]).trim());
  return items.length
    ? `
      <table class="wiki-definition-table">
        <tbody>
          ${items.map(([label, value]) => `
            <tr>
              <th>${escapeHtml(label)}</th>
              <td>${escapeHtml(value)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '<div class="empty-state">No fact table is available yet.</div>';
}

function wikiTable(headers, rows) {
  const items = (rows || []).filter((row) => Array.isArray(row) && row.some((value) => String(value ?? '').trim()));
  return items.length
    ? `
      <table class="wiki-table">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${items.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell ?? '')}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `
    : '<div class="empty-state">No table rows are available yet.</div>';
}

function inlineSectionLink(section, label) {
  const nextSection = VALID_SECTIONS.includes(section) ? section : 'overview';
  return `<button class="wiki-link-inline" type="button" data-nav-section="${escapeHtml(nextSection)}">${escapeHtml(label)}</button>`;
}

function inlinePersonLink(person) {
  if (!person?.slug || !person?.name) return '';
  return `<button class="wiki-link-inline" type="button" data-person-slug="${escapeHtml(person.slug)}">${escapeHtml(person.name)}</button>`;
}

function wikiInlineLinks(items) {
  const links = (items || []).filter(Boolean);
  return links.length
    ? `<div class="wiki-inline-links">${links.join('')}</div>`
    : '<div class="empty-state">No linked pages are available yet.</div>';
}

function wikiLinkGrid(items) {
  const links = (items || []).filter(Boolean);
  return links.length
    ? `<div class="related-pages">${links.join('')}</div>`
    : '<div class="empty-state">No linked pages are available yet.</div>';
}

function renderStructuredBlocks(payload, prefix = '') {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';

  return Object.entries(payload)
    .map(([key, value]) => renderStructuredBlock(key, value, prefix))
    .filter(Boolean)
    .join('');
}

function renderStructuredBlock(key, value, prefix = '') {
  const title = prefix ? `${prefix} ${humanizeKey(key)}` : humanizeKey(key);
  const id = slugify(prefix ? `${prefix}-${key}` : key);

  if (Array.isArray(value)) {
    const items = value.filter((item) => item != null && String(formatStructuredCellValue(item)).trim());
    if (!items.length) return '';

    if (items.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) {
      return articleBlock(id, title, wikiList(items.map((item) => String(item))));
    }

    if (items.every((item) => item && typeof item === 'object' && item.path)) {
      return articleBlock(
        id,
        title,
        wikiLinkGrid(items.map((item) => wikiButtonForPath(item.path, item.title || item.label || titleForPath(item.path), 'wiki-link-button'))),
      );
    }

    if (items.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
      const headers = tabularKeys(items).slice(0, 6);
      if (headers.length) {
        return articleBlock(
          id,
          title,
          wikiTable(
            headers.map((header) => humanizeKey(header)),
            items.map((item) => headers.map((header) => formatStructuredCellValue(item?.[header]))),
          ),
        );
      }
    }

    return articleBlock(id, title, wikiList(items.map((item) => formatStructuredCellValue(item)).filter(Boolean)));
  }

  if (scalarObject(value)) {
    return articleBlock(
      id,
      title,
      wikiDefinitionTable(
        Object.entries(value)
          .map(([label, cell]) => [humanizeKey(label), formatStructuredCellValue(cell)])
          .filter((row) => row[1]),
      ),
    );
  }

  if (value && typeof value === 'object') {
    return renderStructuredBlocks(value, title);
  }

  if (value == null || value === '') return '';
  return articleBlock(id, title, wikiParagraphs([String(value)]));
}

function buildWikiRecordBody(record) {
  if (!record) {
    return articleBlock('wiki-missing', 'Page unavailable', wikiParagraphs([
      'This wiki page could not be found in the current Akibwa snapshot.',
    ]));
  }

  const blocks = [];
  if (record.summary) {
    blocks.push(articleBlock('wiki-overview', 'Overview', wikiParagraphs([record.summary])));
  }
  if ((record.highlights || []).length) {
    blocks.push(articleBlock('wiki-highlights', 'Highlights', wikiList(record.highlights)));
  }

  const structuredBlocks = renderStructuredBlocks(record.structured_state || {});
  if (structuredBlocks) {
    blocks.push(structuredBlocks);
  }

  if ((record.source_notes || []).length) {
    const rows = record.source_notes.map((item) => [
      item.date || '',
      item.title || '',
      item.snippet || item.note || '',
    ]);
    blocks.push(articleBlock('wiki-source-notes', 'Source notes', wikiTable(['Date', 'Title', 'Note'], rows)));
  }

  if ((record.next_questions || []).length) {
    blocks.push(articleBlock('wiki-next-questions', 'Next questions', wikiList(record.next_questions)));
  }

  return blocks.join('') || articleBlock('wiki-empty', 'Overview', wikiParagraphs([
    'This page does not have structured article blocks yet, but it is part of the wiki graph.',
  ]));
}

function renderWikiBrowse(data) {
  const node = el('wikiBrowse');
  if (!node) return;

  const pages = wikiPages(data);
  if (!pages.length) {
    node.innerHTML = '<div class="empty-state">No wiki pages have been surfaced yet.</div>';
    return;
  }

  const activePath = currentWikiPath(data);
  const groups = [
    ['root', 'Entry points'],
    ['domains', 'Domains'],
    ['concepts', 'Concepts'],
    ['people', 'People'],
    ['places', 'Places'],
    ['events', 'Events'],
    ['indexes', 'Indexes'],
    ['outputs', 'Outputs'],
    ['meta', 'Meta'],
  ];

  node.innerHTML = groups.map(([groupKey, label]) => {
    const items = pages.filter((page) => page.group === groupKey);
    if (!items.length) return '';

    return `
      <section class="wiki-browse-group" data-browse-group="${escapeHtml(groupKey)}">
        <h3 class="wiki-browse-label">${escapeHtml(label)}</h3>
        <div class="wiki-browse-list">
          ${items.map((page) => wikiBrowseButton(page.path, page.title, page.summary, page.path === activePath)).join('')}
        </div>
      </section>
    `;
  }).join('');
}

function renderArticleBody(data) {
  const node = el('pageArticleBody');
  if (!node || !data) return;

  const section = VALID_SECTIONS.includes(state.activeSection) ? state.activeSection : 'overview';
  const person = section === 'people' ? selectedPerson(data) : null;
  const fashion = buildFashionData(data.onebag?.items || []);
  const creative = selectedCreativeEntry(data);
  const running = data.running || {};
  const market = data.marketPerformance || {};
  const people = peopleDirectory(data);
  const compiledCount = (data.aiContext?.files || []).length;
  const extractedCount = (data.aiContext?.extracted?.files || []).length;
  const topPerson = people[0] || null;
  const featuredTitle = running.recommendation?.pick ? 'One-shoe strategy' : 'OneBag system';
  const featuredSection = running.recommendation?.pick ? 'running' : 'onebag';
  const featuredImage = buildInfoboxArtwork(featuredTitle, featuredSection, 'featured article');
  const currentRole = data.work?.jobTitle || data.work?.linkedinTitle || '';
  const currentEmployer = data.work?.employer || '';
  const currentDevelopments = [
    currentRole ? `${currentRole} at ${currentEmployer || 'current employer'} remains the active work chapter.` : '',
    market.ok ? `The tracked portfolio is at ${gbp.format(market.marketValueGbp || 0)} as of ${market.asOfDate ? fmtIsoDate(market.asOfDate) : 'the latest close'}.` : '',
    data.onebag?.weightGapKg != null ? `The onebag system is ${data.onebag.weightGapKg > 0 ? '+' : ''}${Number(data.onebag.weightGapKg || 0).toFixed(2)} kg against the current target.` : '',
    (data.journal?.themes || []).length ? `Current journal themes include ${(data.journal.themes || []).slice(0, 3).map((item) => item.theme || item.label || String(item)).join(', ')}.` : '',
  ].filter(Boolean);
  const didYouKnowItems = [
    data.profileLibrary?.summary?.book_count ? `... that ${data.profileLibrary.summary.book_count} books are currently filed in the profile canon, including ${data.profileLibrary.booksRead?.[0]?.title || 'recent reading'}?` : '',
    topPerson ? `... that ${topPerson.name} is currently one of the most evidenced people pages in the wiki?` : '',
    data.onebag?.trackedItemCount ? `... that the onebag inventory currently tracks ${data.onebag.trackedItemCount} items worth ${gbp.format(data.onebag.trackedValueGbp || 0)}?` : '',
    running.recommendation?.pick ? `... that ${running.recommendation.pick} is the current leading answer to the one-shoe problem?` : '',
  ].filter(Boolean);
  const recentUpdates = [
    ...(data.journal?.latestEntries || []).slice(0, 4).map((entry) => ({
      label: entry.date || 'Recent',
      note: entry.title || 'Journal entry',
    })),
    ...(data.work?.history || []).filter((item) => item.isCurrent).slice(0, 1).map((item) => ({
      label: item.range || 'Current',
      note: `${item.role || 'Role'} at ${item.employer || 'Employer'}`,
    })),
  ].slice(0, 5);

  const builders = {
    overview: () => `
      <section class="main-page-welcome" id="main-page">
        <h2 class="main-page-welcome-title">Welcome to <span>Akibwa</span>,</h2>
        <p class="main-page-welcome-copy">
          the private encyclopedia for your life systems, people, places, work, writing, and current decisions.
        </p>
        <p class="main-page-welcome-stats">
          ${people.length} people pages • ${compiledCount} compiled wiki files • ${extractedCount} extracted records
        </p>
      </section>

      <div class="main-page-grid">
        <section class="main-page-panel main-page-panel-featured" id="featured-article">
          <header class="main-page-panel-header">From today’s featured article</header>
          <div class="main-page-panel-body">
            <div class="main-page-featured-layout">
              <figure class="main-page-thumb">
                <img src="${featuredImage}" alt="${escapeHtml(featuredTitle)}" class="main-page-thumb-image">
              </figure>
              <div class="main-page-featured-copy">
                <p class="main-page-featured-title">${escapeHtml(featuredTitle)}</p>
                ${wikiParagraphs([
                  featuredSection === 'running'
                    ? `${running.recommendation?.pick || 'The current recommendation'} is the leading answer to the one-shoe problem: find a shoe that works with the wardrobe, at work, and on semi-fast runs without feeling compromised in any setting.`
                    : `The OneBag system is the tracked carry setup that holds together wardrobe, work gear, and travel choices in one portable system.`,
                  featuredSection === 'running'
                    ? running.recommendation?.summary || 'The decision remains active and is currently being evaluated through style, comfort, and run-feel.'
                    : `The current compiled state records ${fmtKg(data.onebag?.trackedWeightKg || 0)} across ${data.onebag?.trackedItemCount || 0} items, with the bag target still acting as a strong design constraint.`,
                ])}
                <div class="main-page-links">
                  ${inlineSectionLink(featuredSection, `Open ${featuredTitle}`)}
                  ${inlineSectionLink('fashion', 'Related: Fashion')}
                  ${inlineSectionLink('people', 'Related: People')}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="main-page-panel main-page-panel-news" id="current-developments">
          <header class="main-page-panel-header">Current developments</header>
          <div class="main-page-panel-body">
            <ul class="main-page-list">
              ${currentDevelopments.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
            <p class="main-page-panel-footer">
              Source updated ${escapeHtml(fmtDateTime(data.sourceUpdatedAt || data.generatedAt))}
            </p>
          </div>
        </section>

        <section class="main-page-panel main-page-panel-facts" id="did-you-know">
          <header class="main-page-panel-header">Did you know ...</header>
          <div class="main-page-panel-body">
            <ul class="main-page-list">
              ${didYouKnowItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
            <div class="main-page-links">
              ${inlineSectionLink('profile', 'Profile')}
              ${topPerson ? inlinePersonLink(topPerson) : ''}
              ${inlineSectionLink('onebag', 'OneBag')}
            </div>
          </div>
        </section>

        <section class="main-page-panel main-page-panel-updates" id="recently-updated">
          <header class="main-page-panel-header">Recently updated</header>
          <div class="main-page-panel-body">
            <div class="main-page-updates">
              ${recentUpdates.map((item) => `
                <div class="main-page-update-row">
                  <strong class="main-page-update-label">${escapeHtml(item.label)}</strong>
                  <span class="main-page-update-note">${escapeHtml(item.note)}</span>
                </div>
              `).join('')}
            </div>
            <div class="main-page-links">
              ${inlineSectionLink('journal', 'Journal')}
              ${inlineSectionLink('employment', 'Employment')}
              ${inlineSectionLink('people', 'People')}
            </div>
          </div>
        </section>
      </div>
    `,
    profile: () => [
      articleBlock('profile-summary', 'Overview', `
        ${wikiParagraphs([
          'The profile page collects the declared reading history, quote bank, influences, and screen canon that shape the wider Akibwa knowledge base.',
          'It acts as a stable reference article for taste, intellectual lineage, and recurring source material rather than a diary of recent events.',
        ])}
        ${wikiDefinitionTable([
          ['Books', String(data.profileLibrary?.summary?.book_count || 0)],
          ['Quotes', String(data.profileLibrary?.summary?.quote_count || 0)],
          ['Public influences', String(data.profileLibrary?.summary?.public_influence_count || 0)],
          ['Personal influences', String(data.profileLibrary?.summary?.personal_influence_count || 0)],
          ['Films', String(data.profileLibrary?.summary?.film_count || 0)],
        ])}
      `),
      articleBlock('profile-books', 'Books', wikiTable(
        ['Title', 'Author'],
        (data.profileLibrary?.booksRead || []).map((book) => [book.title || '', book.author || ''])
      )),
      articleBlock('profile-influences', 'Influences', wikiTable(
        ['Name', 'Type', 'Context'],
        [
          ...(data.profileLibrary?.personalInfluences || []).map((item) => [item.name || '', relationshipLabel(item.relationship || 'personal'), item.whyInfluential || item.notes || '']),
          ...(data.profileLibrary?.publicInfluences || []).map((item) => [item.name || '', 'public', item.notes || item.summary || '']),
        ]
      )),
      articleBlock('profile-quotes', 'Favourite quotes', wikiTable(
        ['Attribution', 'Quote'],
        (data.profileLibrary?.favoriteQuotes || []).map((item) => [item.attribution || '', item.quote || ''])
      )),
      articleBlock('profile-screen-canon', 'Television and film', wikiTable(
        ['Type', 'Title', 'Creator'],
        [
          ...(data.profileLibrary?.favoriteTelevision || []).map((item) => ['Television', item.title || '', item.creator || '']),
          ...(data.profileLibrary?.favoriteFilms || []).map((item) => ['Film', item.title || '', item.director || '']),
        ]
      )),
    ].join(''),
    people: () => {
      if (!person) {
        return [
          articleBlock('people-overview', 'Overview', wikiParagraphs([
            'The people layer compiles named individuals from the journal and other ingests into reusable articles.',
            'Select a person from the index below to open their page. Each person page is intended to explain who they are in relation to Daniel, what is known about them, and where they sit in the wider graph.',
          ])),
          articleBlock('people-directory', 'People index', wikiInlineLinks(
            people.map((entry) => inlinePersonLink(entry))
          )),
        ].join('');
      }
      return [
        articleBlock('people-overview', 'Overview', wikiParagraphs([
          person.articleLead || '',
          ...(person.relationSummary || []).slice(0, 2),
        ])),
        articleBlock('people-facts', 'Core facts', wikiDefinitionTable([
          ['Relation to Daniel', relationshipLabel(person.relationToDan || person.primaryRelationship || 'person')],
          ['Primary relationship', relationshipLabel(person.primaryRelationship || 'acquaintance')],
          ['Mentions', String(person.mentions || 0)],
          ['First mention', person.firstMentionDate || 'Unknown'],
          ['Last mention', person.lastMentionDate || 'Unknown'],
          ['Aliases', (person.aliases || []).join(', ') || 'None'],
        ])),
        articleBlock('people-context', 'Current context', wikiList(person.contextNotes || [])),
        articleBlock('people-notes', 'Source notes', wikiTable(
          ['Date', 'Note'],
          (person.evidence || []).map((item) => [item.date || 'Undated', item.snippet || ''])
        )),
        articleBlock('people-directory', 'People index', wikiInlineLinks(
          people.map((entry) => inlinePersonLink(entry))
        )),
      ].join('');
    },
    journal: () => [
      articleBlock('journal-overview', 'Overview', wikiParagraphs([
        'The journal article surfaces recurring themes and recent entries from the main journal documents.',
        'Its purpose inside Akibwa is to reveal live patterns and new names that should later be absorbed into fuller articles elsewhere in the wiki.',
      ])),
      articleBlock('journal-themes', 'Current themes', wikiList((data.journal?.themes || []).map((item) => item.theme || item.label || String(item)))),
      articleBlock('journal-entries', 'Recent entries', wikiTable(
        ['Date', 'Title', 'Excerpt'],
        (data.journal?.latestEntries || []).map((entry) => [entry.date || '', entry.title || 'Journal entry', truncate(entry.text || '', 220)])
      )),
    ].join(''),
    creative: () => [
      articleBlock('creative-overview', 'Overview', wikiParagraphs([
        `${(data.creative?.entries || []).length || 0} pieces are currently surfaced from the creative writing document.`,
        'This article acts as an index into the writing shelf rather than a drafting environment. Individual pieces can later become their own standalone pages if the source base gets deeper.',
        creative?.title ? `The current selected piece is ${creative.title}.` : 'No current piece is selected.',
      ])),
      articleBlock('creative-shelf', 'Writing shelf', wikiTable(
        ['Title', 'Excerpt'],
        (data.creative?.entries || []).map((entry) => [entry.title || '', truncate(entry.excerpt || '', 180)])
      )),
      articleBlock('creative-piece', 'Selected piece', creative
        ? `
          <p class="wiki-body-copy">${escapeHtml(creative.title || '')}</p>
          ${wikiParagraphs(creative.paragraphs || [creative.excerpt || ''])}
        `
        : '<div class="empty-state">No creative piece is available yet.</div>'),
    ].join(''),
    onebag: () => [
      articleBlock('onebag-overview', 'Overview', `
        ${wikiParagraphs([
          `The OneBag system is the tracked carry setup used as the main portable wardrobe and gear loadout. The current compiled state records ${fmtKg(data.onebag?.trackedWeightKg || 0)} across ${data.onebag?.trackedItemCount || 0} items.`,
          data.onebag?.targetWeightKg != null
            ? `The working target remains ${fmtKg(data.onebag.targetWeightKg)}. The current gap is ${data.onebag?.weightGapKg > 0 ? '+' : ''}${Number(data.onebag?.weightGapKg || 0).toFixed(2)} kg.`
            : 'No target carry weight has been surfaced yet.',
          data.onebag?.backpack?.item
            ? `The currently tracked bag is ${data.onebag.backpack.item}.`
            : 'The current bag has not been identified from the source material.',
        ])}
        ${wikiDefinitionTable([
          ['Tracked weight', fmtKg(data.onebag?.trackedWeightKg || 0)],
          ['Target weight', data.onebag?.targetWeightKg != null ? fmtKg(data.onebag.targetWeightKg) : 'Not set'],
          ['Items', String(data.onebag?.trackedItemCount || 0)],
          ['Tracked value', gbp.format(data.onebag?.trackedValueGbp || 0)],
          ['Backpack', data.onebag?.backpack?.item || 'Not identified'],
        ])}
      `),
      articleBlock('onebag-categories', 'Category split', wikiTable(
        ['Category', 'Count', 'Weight'],
        (data.onebag?.categoryBreakdown || []).map((item) => [item.category || '', String(item.count || 0), fmtG(item.weightG || 0)])
      )),
      articleBlock('onebag-heavy', 'Heaviest items', wikiTable(
        ['Item', 'Category', 'Weight', 'Status'],
        (data.onebag?.heaviestItems || []).map((item) => [item.item || '', item.category || '', fmtG(item.weightG || 0), item.status || ''])
      )),
      articleBlock('onebag-value', 'Highest-value items', wikiTable(
        ['Item', 'Category', 'Value', 'Weight'],
        (data.onebag?.mostExpensiveItems || []).map((item) => [item.item || '', item.category || '', gbp.format(item.priceGbp || 0), fmtG(item.weightG || 0)])
      )),
    ].join(''),
    fashion: () => [
      articleBlock('fashion-overview', 'Overview', `
        ${wikiParagraphs([
          'The fashion article compiles the currently tracked wearable items from the wider inventory. It exists to keep the wardrobe legible as a system instead of as a spreadsheet only.',
          'The page is especially relevant to onebag and running decisions, because footwear and palette choices need to stay coherent across the whole capsule.',
        ])}
        ${wikiDefinitionTable([
          ['Pieces surfaced', String(fashion.items.length || 0)],
          ['Tracked value', gbp.format(fashion.totalValueGbp || 0)],
          ['Tracked weight', fmtKg((fashion.totalWeightG || 0) / 1000)],
          ['Footwear items', String(fashion.footwearCount || 0)],
        ])}
      `),
      articleBlock('fashion-groups', 'Wardrobe breakdown', wikiTable(
        ['Group', 'Pieces', 'Value', 'Weight'],
        (fashion.categories || []).map((group) => [group.group || '', String(group.count || 0), gbp.format(group.valueGbp || 0), fmtG(group.weightG || 0)])
      )),
      articleBlock('fashion-pieces', 'Current wardrobe', wikiTable(
        ['Item', 'Category', 'Status'],
        fashion.items.map((item) => [item.item || '', item.category || '', item.status || ''])
      )),
    ].join(''),
    running: () => [
      articleBlock('running-brief', 'Overview', wikiParagraphs([
        running.goal || '',
        running.statusLine || '',
        running.recommendation?.summary || '',
        'This page currently functions as a decision article for the one-shoe strategy rather than a training log. It compares current shoes, shortlist options, and wardrobe fit.',
      ])),
      articleBlock('running-requirements', 'Requirements', wikiList(running.requirements || [])),
      articleBlock('running-current', 'Current shoes', wikiTable(
        ['Shoe', 'Role', 'Verdict', 'Issue'],
        (running.currentShoes || []).map((item) => [item.name || '', item.role || '', item.verdict || '', item.issue || ''])
      )),
      articleBlock('running-options', 'Contenders', wikiTable(
        ['Shoe', 'Verdict', 'Best for', 'Price', 'Style / daily / run'],
        (running.shortlist || []).map((item) => [item.name || '', item.verdict || '', item.bestFor || '', item.price || '', `${item.scores?.style || '-'} / ${item.scores?.daily || '-'} / ${item.scores?.run || '-'}`])
      )),
      articleBlock('running-palette', 'Color direction', wikiParagraphs([
        running.paletteDirection?.best || '',
        running.paletteDirection?.note || '',
      ])),
    ].join(''),
    finances: () => [
      articleBlock('finances-position', 'Overview', `
        ${wikiParagraphs([
          'The finances article records the current liquid position, recurring outgoings, and liabilities as parsed from the finance workbook.',
          'It sits alongside the investments and employment pages because the money picture is distributed across cash, compensation, and market holdings rather than one isolated account.',
        ])}
        ${wikiDefinitionTable([
          ['Cash', gbp.format(data.money?.cashTotal || 0)],
          ['Investments total', gbp.format(data.money?.investmentsTotal || 0)],
          ['Recurring outgoings', gbp.format(data.money?.monthlyOutgoingsTotal || 0)],
          ['GBP liabilities', gbp.format(data.money?.liabilitiesGbpTotal || 0)],
          ['Medical bill', data.money?.medicalBillUsd ? usd.format(data.money.medicalBillUsd) : 'None logged'],
        ])}
      `),
      articleBlock('finances-liabilities', 'Liabilities', wikiTable(
        ['Item', 'Value', 'Notes'],
        (data.money?.liabilities || []).map((item) => [item.item || '', item.value ? gbp.format(item.value) : item.value === 0 ? gbp.format(0) : '', item.notes || ''])
      )),
      articleBlock('finances-outgoings', 'Recurring outgoings', wikiTable(
        ['Item', 'Amount', 'Notes'],
        (data.money?.monthlyOutgoings || []).map((item) => [item.item || '', gbp.format(item.amountGbp || 0), item.notes || ''])
      )),
    ].join(''),
    investments: () => [
      articleBlock('investments-summary', 'Overview', `
        ${wikiParagraphs([
          'The investments article tracks held positions and recent market value using cached close data and workbook holdings.',
          market.asOfDate ? `The current market snapshot is recorded as of ${fmtIsoDate(market.asOfDate)}.` : 'The current market snapshot is not available.',
        ])}
        ${wikiDefinitionTable([
          ['Market value', gbp.format(market.marketValueGbp || 0)],
          ['With ISA cash', gbp.format(market.totalWithCashGbp || data.money?.investmentsTotal || 0)],
          ['Positions', String(market.positions?.length || 0)],
          ['As of', market.asOfDate ? fmtIsoDate(market.asOfDate) : 'Unavailable'],
        ])}
      `),
      articleBlock('investments-holdings', 'Held positions', wikiTable(
        ['Holding', 'Value', 'Day change', 'Price'],
        (market.positions || []).map((item) => [
          `${item.label || item.symbol || ''}`,
          gbp.format(item.marketValueGbp || 0),
          `${fmtPct(item.dayChangePct || 0)} / ${gbp.format(item.dayChangeGbp || 0)}`,
          nativePriceLabel(item) || '',
        ])
      )),
      articleBlock('investments-notes', 'Market notes', wikiList([
        market.rangeNote || '',
        ...(market.warnings || []),
        data.marketPerformance?.priceSource ? `Price source: ${data.marketPerformance.priceSource}.` : '',
      ])),
    ].join(''),
    employment: () => [
      articleBlock('employment-current', 'Overview', `
        ${wikiParagraphs([
          'The employment article records the current role, compensation, and the earlier career path that leads into it.',
          data.work?.jobTitle || data.work?.linkedinTitle
            ? `${data.work.jobTitle || data.work.linkedinTitle} is the currently surfaced role.`
            : 'The current role has not been identified.',
        ])}
        ${wikiDefinitionTable([
          ['Role', data.work?.jobTitle || data.work?.linkedinTitle || 'Unknown'],
          ['Employer', data.work?.employer || 'Unknown'],
          ['Office', data.work?.officeAddress || 'Unknown'],
          ['Working pattern', data.work?.workingPattern || 'Unknown'],
          ['Annual gross salary', gbp.format(data.work?.annualGrossSalary || 0)],
          ['Total annual comp', gbp.format(data.work?.totalAnnualCompGross || 0)],
        ])}
      `),
      articleBlock('employment-payslips', 'Recent payslips', wikiTable(
        ['Payslip', 'Net pay', 'Notes'],
        (data.work?.recentPayslips || []).map((item) => [item.label || '', gbp.format(item.netPay || 0), item.notes || ''])
      )),
      articleBlock('employment-history', 'Career timeline', wikiTable(
        ['Range', 'Role', 'Employer', 'Location'],
        (data.work?.history || []).map((item) => [item.range || '', item.role || '', item.employer || '', item.location || ''])
      )),
    ].join(''),
    soul: () => [
      articleBlock('soul-north-star', 'North star', wikiParagraphs([data.soul?.northStar || ''])),
      articleBlock('soul-values', 'Values', (data.soul?.values || []).map((value, index) => `
        <h3 class="wiki-subhead" id="soul-value-${index + 1}">${escapeHtml(value.name || `Value ${index + 1}`)}</h3>
        <p class="wiki-body-copy">${escapeHtml(value.text || '')}</p>
      `).join('') || '<div class="empty-state">No values are available yet.</div>'),
      articleBlock('soul-becoming', 'Becoming', wikiList(data.soul?.becoming || [])),
      articleBlock('soul-non-negotiables', 'Non-negotiables', wikiList(data.soul?.nonNegotiables || [])),
      articleBlock('soul-question', 'Question', wikiParagraphs([data.soul?.question || ''])),
    ].join(''),
  };

  node.innerHTML = (builders[section] || builders.overview)();
}

function setStatus(message, kind = 'neutral') {
  const node = el('journalStatus');
  if (!node) return;
  node.textContent = message;
  node.classList.remove('is-error', 'is-success');
  if (kind === 'error') node.classList.add('is-error');
  if (kind === 'success') node.classList.add('is-success');
}

function setCaptureMode(label) {
  const node = el('captureMode');
  if (node) node.textContent = label;
}

function persistJournalDraftFromDom() {
  const input = el('journalContentInput');
  if (!input) return;
  writeJournalDraft(input.value);
}

function hydrateJournalDraft() {
  const input = el('journalContentInput');
  if (!input || input.value.trim()) return false;

  const draft = readJournalDraft();
  if (!draft?.content) return false;

  input.value = draft.content;
  setStatus(
    draft.updatedAt
      ? `Restored your local draft from ${relativeTime(draft.updatedAt)}.`
      : 'Restored your local draft from this browser.',
    'success',
  );
  return true;
}

function mediaRecordingAvailable() {
  return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

function preferredAudioMimeType() {
  if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  const options = [
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];
  return options.find((option) => MediaRecorder.isTypeSupported(option)) || '';
}

function renderError(data) {
  const searched = [...(data.missing || []), ...(data.searched || [])].filter(Boolean);

  if (el('pageBreadcrumb')) el('pageBreadcrumb').textContent = APP_NAME;
  if (el('pageTitle')) {
    el('pageTitle').textContent = IS_READ_ONLY
      ? 'Hosted snapshot unavailable'
      : 'Akibwa could not load';
  }
  if (el('pageLead')) el('pageLead').textContent = data.error || 'Unknown error.';
  if (el('pageMeta')) {
    el('pageMeta').textContent = IS_READ_ONLY
      ? 'Refresh the hosted site or redeploy the latest snapshot.'
      : 'Start the local launcher from this repo so the page can read your private files and serve /api/life.json.';
  }
  if (el('sidebarUpdated')) {
    el('sidebarUpdated').textContent = searched.join(' · ') || 'No extra details were returned.';
  }
  setStatus((searched.join(' · ') || 'No extra details were returned.'), 'error');
  if (el('homeFootnote')) {
    el('homeFootnote').textContent = IS_READ_ONLY
      ? 'Refresh the page or redeploy the latest hosted snapshot if this keeps happening.'
      : 'Start the local launcher from this repo so the page can read your private files and serve /api/life.json.';
  }

  document.querySelectorAll('.dashboard-section').forEach((node) => {
    node.hidden = true;
    node.classList.remove('is-active');
  });
  if (el('pageArticleBody')) {
    el('pageArticleBody').innerHTML = articleBlock('load-error', 'Page unavailable', wikiParagraphs([
      data.error || 'Unknown error.',
      searched.join(' · ') || 'No extra details were returned.',
    ]));
  }
  if (el('pageSummary')) {
    el('pageSummary').innerHTML = `<div class="error-state">${escapeHtml(data.error || 'Unknown error.')}</div>`;
  }
  if (el('pageContents')) {
    el('pageContents').innerHTML = '<div class="empty-state">No page contents available.</div>';
  }
  if (el('pageRelated')) {
    el('pageRelated').innerHTML = '<div class="empty-state">No related pages available.</div>';
  }
  if (el('pageBacklinks')) {
    el('pageBacklinks').innerHTML = '<div class="empty-state">No backlinks available.</div>';
  }
  if (el('pageReferences')) {
    el('pageReferences').innerHTML = '<li>No references available.</li>';
  }
}

function renderHome(data) {
  if (el('homeDateStamp')) el('homeDateStamp').textContent = longDate.format(new Date());
  if (el('captureDirectoryLabel')) {
    el('captureDirectoryLabel').textContent = IS_READ_ONLY
      ? 'Hosted snapshot'
      : data.journalCapture?.noteDirectory
      ? data.journalCapture.noteDirectory.split('/').filter(Boolean).slice(-1)[0] || data.journalCapture.noteDirectory
      : 'Not configured';
  }

  const draft = readJournalDraft();
  const draftNote = draft?.updatedAt ? ` Local draft saved ${relativeTime(draft.updatedAt)}.` : '';
  el('homeFootnote').textContent = IS_READ_ONLY
    ? `Hosted snapshot updated ${fmtDateTime(data.generatedAt || data.sourceUpdatedAt)}. Publish a fresh export when you want the web version to catch up.`
    : data.journalCapture?.noteDirectory
    ? `New journal notes save to ${data.journalCapture.noteDirectory}. Source updated ${fmtDateTime(data.sourceUpdatedAt)}.${draftNote}`
    : `Built from your private documents. Source updated ${fmtDateTime(data.sourceUpdatedAt)}.${draftNote}`;
}

function renderProfile(data) {
  const profile = data.profileLibrary || {};
  const books = Array.isArray(profile.booksRead) ? profile.booksRead : [];
  const quotes = Array.isArray(profile.favoriteQuotes) ? profile.favoriteQuotes : [];
  const publicInfluences = Array.isArray(profile.publicInfluences) ? profile.publicInfluences : [];
  const personalInfluences = Array.isArray(profile.personalInfluences) ? profile.personalInfluences : [];
  const researchNotes = Array.isArray(profile.researchNotes) ? profile.researchNotes : [];
  const shows = Array.isArray(profile.favoriteTelevision) ? profile.favoriteTelevision : [];
  const films = Array.isArray(profile.favoriteFilms) ? profile.favoriteFilms : [];

  el('profileStats').innerHTML = [
    statCard('Books', String(profile.summary?.book_count || books.length || 0), 'Structured from the profile ingest'),
    statCard('Quotes', String(profile.summary?.quote_count || quotes.length || 0), 'A mix of philosophy, comedy, and spiritual lines'),
    statCard('Public influences', String(profile.summary?.public_influence_count || publicInfluences.length || 0), 'Thinkers, artists, and builders'),
    statCard('Personal influences', String(profile.summary?.personal_influence_count || personalInfluences.length || 0), 'Known people with direct weight in your life'),
  ].join('');

  el('profileBooks').innerHTML = books.length
    ? books.map((book) => stackItem(book.title, book.author || '', '')).join('')
    : '<div class="empty-state">No books have been added to the profile layer yet.</div>';

  el('profileInfluences').innerHTML = [...personalInfluences, ...publicInfluences]
    .map((person) => {
      const research = researchNotes.find((item) => item.name === person.name);
      const knownPerson = personByName(data, person.name);
      const metric = person.kind === 'personal'
        ? `${relationshipLabel(person.relationship || 'personal')} influence`
        : 'Public influence';
      const note = [person.whyInfluential || '', person.notes || '', research?.summary || '']
        .filter(Boolean)
        .join(' ');
      return knownPerson
        ? `
          <button class="wiki-record person-index-link" type="button" data-person-slug="${escapeHtml(knownPerson.slug)}">
            <div class="wiki-record-head stack-top">
              <div class="wiki-record-title stack-title">${escapeHtml(person.name)}</div>
              <div class="wiki-record-meta stack-metric">${escapeHtml(metric)}</div>
            </div>
            ${note ? `<p class="wiki-record-note stack-note">${escapeHtml(truncate(note, 200))}</p>` : ''}
          </button>
        `
        : stackItem(person.name, metric, truncate(note, 200));
    })
    .join('') || '<div class="empty-state">No influence map has been stored yet.</div>';

  el('profileQuotes').innerHTML = quotes.length
    ? quotes.map((quote) => stackItem(quote.attribution || 'Unknown source', '', quote.quote)).join('')
    : '<div class="empty-state">No favourite quotes have been captured yet.</div>';

  el('profileTelevision').innerHTML = shows.length
    ? shows.map((show) => stackItem(show.title, '', '')).join('')
    : '<div class="empty-state">No television favourites have been captured yet.</div>';

  el('profileFilms').innerHTML = films.length
    ? films.map((film) => stackItem(film.title, film.director || '', '')).join('')
    : '<div class="empty-state">No film favourites have been captured yet.</div>';
}

function describeActiveSection(section, data) {
  switch (section) {
    case 'profile': {
      const profile = data.profileLibrary || {};
      return {
        ...SECTION_META.profile,
        copy: `${profile.summary?.book_count || 0} books, ${profile.summary?.quote_count || 0} quotes, and ${profile.summary?.film_count || 0} films now sit in the reference layer for Akibwa.`,
      };
    }
    case 'onebag': {
      if (data.onebag.targetWeightKg != null && data.onebag.weightGapKg != null) {
        const direction = data.onebag.weightGapKg > 0 ? 'over' : 'under';
        return {
          ...SECTION_META.onebag,
          copy: `${fmtKg(data.onebag.trackedWeightKg)} tracked, ${Math.abs(data.onebag.weightGapKg).toFixed(2)} kg ${direction} the target. Open this view for what is actually driving the setup.`,
        };
      }
      return {
        ...SECTION_META.onebag,
        copy: `${fmtKg(data.onebag.trackedWeightKg)} tracked across ${data.onebag.trackedItemCount} items.`,
      };
    }
    case 'fashion': {
      const fashion = buildFashionData(data.onebag.items);
      return {
        ...SECTION_META.fashion,
        copy: `${fashion.items.length} wardrobe pieces surfaced with ${gbp.format(fashion.totalValueGbp)} of tracked value.`,
      };
    }
    case 'running': {
      const recommendation = data.running?.recommendation || {};
      return {
        ...SECTION_META.running,
        copy: recommendation.summary || SECTION_META.running.copy,
      };
    }
    case 'finances':
      return {
        ...SECTION_META.finances,
        copy: `${gbp.format(data.money.cashTotal)} cash tracked, ${gbp.format(data.money.monthlyOutgoingsTotal)} recurring each month, plus liabilities and watch-outs.`,
      };
    case 'investments': {
      const market = data.marketPerformance || {};
      return {
        ...SECTION_META.investments,
        copy: market.ok
          ? `${gbp.format(market.marketValueGbp || 0)} tracked in live market holdings as of ${fmtIsoDate(market.asOfDate)}.`
          : `${gbp.format(data.money.investmentsTotal)} invested, with live market tracking still setting up.`,
      };
    }
    case 'creative':
      return {
        ...SECTION_META.creative,
        copy: `${creativeEntries(data).length || 0} pieces surfaced from the writing document, ready to open one by one.`,
      };
    case 'journal':
      return {
        ...SECTION_META.journal,
        copy: `${data.journal.latestEntries?.length || 0} recent entries surfaced, with current themes grouped below.`,
      };
    case 'people': {
      const person = selectedPerson(data);
      if (person) {
        return {
          label: person.name,
          title: 'Person article',
          copy: person.articleLead || person.summary || SECTION_META.people.copy,
        };
      }
      const people = data.people || {};
      return {
        ...SECTION_META.people,
        copy: `${people.summary?.person_count || 0} people surfaced from the Generous Slice journal, with the most grounded records carried into the knowledge base.`,
      };
    }
    case 'employment':
      return {
        ...SECTION_META.employment,
        copy: `${data.work.jobTitle || data.work.linkedinTitle || 'Current role'} at ${data.work.employer || 'your current employer'}, with the earlier path now surfaced below it.`,
      };
    case 'soul':
      return {
        ...SECTION_META.soul,
        copy: data.soul.question || SECTION_META.soul.copy,
      };
    default:
      return SECTION_META.overview;
  }
}

function summaryRow(label, value) {
  return `
    <div class="summary-row">
      <div class="summary-label">${escapeHtml(label)}</div>
      <div class="summary-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function activePageNode() {
  return el('pageArticleBody');
}

function pageName(section) {
  if (section === 'overview') return APP_NAME;
  return document.querySelector(`.drawer-link[data-nav-section="${section}"]`)?.textContent?.trim()
    || APP_NAME;
}

function wikiLinkButton(section, label) {
  const nextSection = VALID_SECTIONS.includes(section) ? section : 'overview';
  return `<button class="wiki-link-button" type="button" data-nav-section="${escapeHtml(nextSection)}">${escapeHtml(label || pageName(nextSection))}</button>`;
}

function buildPageRelated(section) {
  const record = currentWikiRecord(state.snapshot);
  if (record?.related_paths?.length) {
    return record.related_paths
      .map((path) => wikiButtonForPath(path, titleForPath(path, state.snapshot), 'wiki-link-button'))
      .join('');
  }

  const related = {
    overview: ['profile', 'people', 'journal', 'employment'],
    profile: ['people', 'creative', 'soul'],
    onebag: ['fashion', 'running', 'finances'],
    fashion: ['onebag', 'running', 'profile'],
    running: ['fashion', 'onebag', 'profile'],
    finances: ['investments', 'employment', 'onebag'],
    investments: ['finances', 'employment'],
    creative: ['journal', 'profile', 'soul'],
    journal: ['people', 'creative', 'soul'],
    people: ['journal', 'profile', 'soul'],
    employment: ['finances', 'investments', 'soul'],
    soul: ['journal', 'people', 'creative', 'profile'],
  };

  const items = related[section] || [];
  return items.length
    ? items.map((item) => wikiLinkButton(item, pageName(item))).join('')
    : '<div class="empty-state">No related pages surfaced for this article yet.</div>';
}

function buildPageBacklinks(data) {
  const record = currentWikiRecord(data);
  const incoming = record?.incoming_paths || [];
  return incoming.length
    ? incoming.map((path) => wikiButtonForPath(path, titleForPath(path, data), 'wiki-link-button')).join('')
    : '<div class="empty-state">No incoming links are surfaced for this page yet.</div>';
}

function buildPageReferences(section, data) {
  if (!data) {
    return '<li>Waiting for snapshot.</li>';
  }

  const record = currentWikiRecord(data);
  if (record) {
    const items = [];
    (record.source_keys || []).forEach((key) => {
      const source = wikiSourceByKey(data, key);
      if (!source) return;
      items.push([
        source.title || humanizeKey(key),
        [source.purpose || '', source.local_path ? `Path: ${source.local_path}` : ''].filter(Boolean).join(' '),
      ]);
    });

    (record.source_notes || []).slice(0, 4).forEach((note) => {
      const label = note.title || note.name || note.date || 'Source note';
      const detail = note.snippet || note.summary || note.note || '';
      if (detail) {
        items.push([label, detail]);
      }
    });

    const researchSources = record.structured_state?.research_context?.sources;
    if (Array.isArray(researchSources)) {
      researchSources.slice(0, 3).forEach((item) => {
        if (item?.label || item?.url) {
          items.push([
            item.label || 'External reference',
            item.url || '',
          ]);
        }
      });
    }

    return items.length
      ? items.map(([label, note]) => `<li><span class="references-label">${escapeHtml(label)}</span> <span class="references-note">${escapeHtml(note)}</span></li>`).join('')
      : '<li>No references surfaced yet.</li>';
  }

  const references = {
    overview: [
      ['Life snapshot', 'Current compiled snapshot assembled from local documents, raw ingests, and machine state.'],
      ['AI Context index', 'The compiled markdown entrypoints orient future agents before they touch raw files.'],
      ['State layer', 'Scratchpad and memory keep the short-horizon and durable context coherent across sessions.'],
    ],
    profile: [
      ['Profile ingest', 'Books, quotes, influences, television, and films are compiled from the Raw profile-ingest files.'],
      ['Influence map', 'Personal and public influences are normalised into the compiled profile layer for later reuse.'],
      ['People layer', 'Personally known names can reconcile against richer people pages when they also appear in the journal.'],
    ],
    people: (() => {
      const person = selectedPerson(data);
      if (!person) {
        return [
          ['Generous Slice journal', 'Primary people extraction source for relationship tags, evidence snippets, and summaries.'],
          ['People index', 'Compiled people pages are written back into AI Context so newer agents can traverse them quickly.'],
          ['Profile cross-links', 'Known names can be enriched later from profile ingests or future raw sources.'],
        ];
      }

      const items = [
        ['Generous Slice journal', `${person.name} is currently compiled from journal evidence, aliases, and relationship cues rather than from a manually written biography.`],
        ['People page', `This article is the canonical local page for ${person.name} inside the Akibwa people layer.`],
      ];
      if (person.profileContext && Object.keys(person.profileContext).length) {
        items.push(['Profile context', 'A matching personal influence record is also attached to this person page.']);
      }
      if (person.researchContext && Object.keys(person.researchContext).length) {
        items.push(['Research context', 'A matching research note has also been attached to this person page.']);
      }
      return items;
    })(),
    journal: [
      ['Generous Slice journal', 'Recent entries and themes are parsed directly from the main journal document.'],
      ['Journal captures', 'New note files become additional local context rather than transient chat-only thoughts.'],
      ['People extraction', 'Journal text also feeds the relationship layer used elsewhere in Akibwa.'],
    ],
    creative: [
      ['Creative writing document', 'Titles, excerpts, and paragraphs are surfaced from the main creative-writing source document.'],
      ['Journal cross-pollination', 'Creative themes can later be compared back against the journal and soul layers.'],
      ['Media canon', 'Favourite books, films, and television can act as style references for future writing work.'],
    ],
    onebag: [
      ['Inventory workbook', 'Weight, value, and category breakdown come from the inventory workbook.'],
      ['Finance workbook', 'Target carry weight and watchlist context are layered in from the finance workbook.'],
      ['Fashion page', 'Wardrobe pieces surfaced here should still cohere with the wider capsule and one-shoe strategy.'],
    ],
    fashion: [
      ['Inventory workbook', 'Clothing, footwear, and wearable accessories are filtered from the tracked inventory.'],
      ['OneBag page', 'This article shares its evidence base with the carry system rather than acting as a separate wardrobe tracker.'],
      ['Running page', 'The one-shoe decision is treated as part of the wardrobe system, not a disconnected performance choice.'],
    ],
    running: [
      ['Running state', 'The shoe decision is maintained from conversation-derived running state rather than a static page.'],
      ['Wardrobe anchors', 'Color and style judgments are evaluated against the clothing palette already captured elsewhere.'],
      ['OneBag linkage', 'The shoe decision is treated as part of the broader capsule and travel system.'],
    ],
    finances: [
      ['Finance workbook', 'Cash, liabilities, recurring outgoings, and employer-linked compensation data come from the finance workbook.'],
      ['Employment page', 'Work and pay data remain linked because salary context shapes the broader money picture.'],
      ['Investments page', 'Portfolio tracking lives separately, but it sits inside the same financial position.'],
    ],
    investments: [
      ['Finance workbook', 'Holdings begin from the workbook records and ISA/taxable account data.'],
      ['Market cache', 'Daily closes and FX conversions power the current-position chart.'],
      ['Life history', 'Private history snapshots let the market view compound over time instead of resetting every session.'],
    ],
    employment: [
      ['Finance workbook', 'Role history, payslip data, and current compensation are parsed from the finance workbook.'],
      ['Career arc concept', 'The compiled wiki keeps the long-form career narrative separate from the visible page surface.'],
      ['Finances page', 'Compensation and cash-flow context remain linked rather than being treated as independent topics.'],
    ],
    soul: [
      ['Soul document', 'North star, values, becoming, and non-negotiables come from the main soul document.'],
      ['Journal themes', 'Recurring journal themes help test whether the lived pattern matches the stated values.'],
      ['Quote bank', 'The quote layer provides supporting language for worldview and tone.'],
    ],
  };

  const items = references[section] || [];
  return items.length
    ? items.map(([label, note]) => `<li><span class="references-label">${escapeHtml(label)}</span> <span class="references-note">${escapeHtml(note)}</span></li>`).join('')
    : '<li>No references surfaced yet.</li>';
}

function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function initialsForTitle(value) {
  const tokens = String(value || '')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (!tokens.length) return 'A';
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] || ''}${tokens[tokens.length - 1][0] || ''}`.toUpperCase();
}

function infoboxPalette(section) {
  const palettes = {
    overview: ['#f8f9fa', '#eaecf0', '#202122'],
    profile: ['#f6f3ea', '#e5dcc8', '#57462f'],
    people: ['#f7f3ef', '#ddd2c4', '#46362a'],
    journal: ['#f8f4eb', '#e6dac3', '#51412f'],
    creative: ['#f3f1f8', '#d6d0ea', '#4b426c'],
    onebag: ['#eef4f7', '#d0dbe4', '#274258'],
    fashion: ['#f8f4f2', '#e3d6cf', '#5d463c'],
    running: ['#eef5f2', '#cfdfd7', '#275246'],
    finances: ['#eff4ef', '#d5e2d0', '#30513a'],
    investments: ['#eef3f8', '#ccd8e5', '#314864'],
    employment: ['#f2f4f6', '#d6dde4', '#334355'],
    soul: ['#f6f1ea', '#e1d6c8', '#574633'],
  };
  return palettes[section] || palettes.overview;
}

function buildInfoboxArtwork(title, section, subtitle = '') {
  const [bg, accent, ink] = infoboxPalette(section);
  const initials = initialsForTitle(title);
  const subtitleText = subtitle || APP_NAME;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360" role="img" aria-label="${xmlEscape(title)}">
      <rect width="320" height="360" fill="${bg}"/>
      <rect x="20" y="20" width="280" height="320" rx="2" fill="#ffffff" stroke="${accent}"/>
      <circle cx="160" cy="132" r="58" fill="${accent}" opacity="0.7"/>
      <rect x="84" y="198" width="152" height="84" rx="42" fill="${accent}" opacity="0.58"/>
      <text x="160" y="154" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="${ink}">${xmlEscape(initials)}</text>
      <text x="160" y="308" text-anchor="middle" font-family="sans-serif" font-size="13" fill="${ink}">${xmlEscape(subtitleText.toUpperCase())}</text>
      <text x="160" y="328" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${ink}">${xmlEscape(title)}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildInfoboxSection(section, data) {
  const meta = describeActiveSection(section, data);
  const activePerson = section === 'people' ? selectedPerson(data) : null;
  const title = activePerson?.name || meta.label || pageName(section);
  const subtitle = activePerson
    ? `${relationshipLabel(activePerson.relationToDan || activePerson.primaryRelationship || 'person')} article`
    : section === 'overview'
    ? 'private encyclopedia'
    : `${meta.label || pageName(section)} article`;
  const caption = activePerson
    ? 'Compiled from journals, profile ingests, and related local sources.'
    : meta.copy || SECTION_META.overview.copy;

  let rows = [];
  switch (section) {
    case 'overview':
      rows = [
        ['Mode', IS_READ_ONLY ? 'Hosted snapshot' : 'Local'],
        ['Updated', fmtDateTime(data.sourceUpdatedAt || data.generatedAt)],
        ['Wiki files', String(data.aiContext?.files?.length || 0)],
        ['Entry points', String(data.aiContext?.entrypoints?.length || 0)],
      ];
      break;
    case 'profile': {
      const profile = data.profileLibrary || {};
      rows = [
        ['Books', String(profile.summary?.book_count || 0)],
        ['Quotes', String(profile.summary?.quote_count || 0)],
        ['Films', String(profile.summary?.film_count || 0)],
        ['Public influences', String(profile.summary?.public_influence_count || 0)],
        ['Personal influences', String(profile.summary?.personal_influence_count || 0)],
      ];
      break;
    }
    case 'onebag':
      rows = [
        ['Tracked weight', fmtKg(data.onebag?.trackedWeightKg || 0)],
        ['Items', String(data.onebag?.trackedItemCount || 0)],
        ['Value', gbp.format(data.onebag?.trackedValueGbp || 0)],
        ['Target gap', data.onebag?.weightGapKg != null ? `${data.onebag.weightGapKg > 0 ? '+' : ''}${Number(data.onebag.weightGapKg).toFixed(2)} kg` : 'No target'],
      ];
      break;
    case 'fashion': {
      const fashion = buildFashionData(data.onebag?.items || []);
      rows = [
        ['Pieces', String(fashion.items.length)],
        ['Tracked value', gbp.format(fashion.totalValueGbp || 0)],
        ['Tracked weight', fmtKg((fashion.totalWeightG || 0) / 1000)],
        ['Footwear', String(fashion.footwearCount || 0)],
      ];
      break;
    }
    case 'running': {
      const running = data.running || {};
      rows = [
        ['Best pick', running.recommendation?.pick || 'Not set'],
        ['Secondary', running.recommendation?.secondaryPick || 'None'],
        ['Current shoes', String((running.currentShoes || []).length || 0)],
        ['Color direction', running.recommendation?.primaryColorway || 'Not set'],
      ];
      break;
    }
    case 'finances':
      rows = [
        ['Cash', gbp.format(data.money?.cashTotal || 0)],
        ['Monthly outgoings', gbp.format(data.money?.monthlyOutgoingsTotal || 0)],
        ['Liabilities', gbp.format(data.money?.liabilitiesGbpTotal || 0)],
        ['Medical bill', data.money?.medicalBillUsd ? usd.format(data.money.medicalBillUsd) : 'None logged'],
      ];
      break;
    case 'investments': {
      const market = data.marketPerformance || {};
      rows = [
        ['Market value', gbp.format(market.marketValueGbp || 0)],
        ['With ISA cash', gbp.format(market.totalWithCashGbp || data.money?.investmentsTotal || 0)],
        ['Positions', String(market.positions?.length || 0)],
        ['As of', market.asOfDate ? fmtIsoDate(market.asOfDate) : 'Unavailable'],
      ];
      break;
    }
    case 'creative': {
      const entries = creativeEntries(data);
      const selected = selectedCreativeEntry(data);
      rows = [
        ['Pieces', String(entries.length || 0)],
        ['Selected', selected?.title || 'None'],
      ];
      break;
    }
    case 'journal':
      rows = [
        ['Recent entries', String(data.journal?.latestEntries?.length || 0)],
        ['Themes', String(data.journal?.themes?.length || 0)],
        ['Latest date', data.journal?.latestEntries?.[0]?.date || 'None'],
      ];
      break;
    case 'people':
      if (activePerson) {
        rows = [
          ['Relation', relationshipLabel(activePerson.relationToDan || activePerson.primaryRelationship || 'person')],
          ['Primary type', relationshipLabel(activePerson.primaryRelationship || 'acquaintance')],
          ['Mentions', String(activePerson.mentions || 0)],
          ['Journal span', activePerson.firstMentionDate && activePerson.lastMentionDate
            ? activePerson.firstMentionDate === activePerson.lastMentionDate
              ? activePerson.firstMentionDate
              : `${activePerson.firstMentionDate} to ${activePerson.lastMentionDate}`
            : 'Not dated'],
          ['Aliases', (activePerson.aliases || []).join(', ') || 'None'],
        ];
      } else {
        const people = data.people || {};
        rows = [
          ['People surfaced', String(people.summary?.person_count || 0)],
          ['Featured', String(people.summary?.featured_count || 0)],
          ['Primary source', 'Generous Slice journal'],
        ];
      }
      break;
    case 'employment':
      rows = [
        ['Current role', data.work?.jobTitle || data.work?.linkedinTitle || 'Unknown'],
        ['Employer', data.work?.employer || 'Unknown'],
        ['Monthly net', gbp.format(data.work?.monthlyNetPay || 0)],
        ['Annual comp', gbp.format(data.work?.totalAnnualCompGross || 0)],
      ];
      break;
    case 'soul':
      rows = [
        ['Values', String(data.soul?.values?.length || 0)],
        ['Becoming', String(data.soul?.becoming?.length || 0)],
        ['Non-negotiables', String(data.soul?.nonNegotiables?.length || 0)],
        ['Question', truncate(data.soul?.question || 'Not surfaced', 90)],
      ];
      break;
    default:
      rows = [];
  }

  return {
    title,
    subtitle,
    caption,
    imageUrl: buildInfoboxArtwork(title, section, subtitle),
    rows: rows.filter(([, value]) => String(value || '').trim()),
  };
}

function buildPageSummary(section, data) {
  if (!data) {
    return [summaryRow('Status', 'Waiting for snapshot')].join('');
  }

  const record = currentWikiRecord(data);
  if (record && state.activeWikiPath) {
    const subtitle = `${humanizeKey(record.group || record.kind || 'page')} page`;
    const paletteSection = record.section || {
      concepts: 'profile',
      people: 'people',
      places: 'journal',
      events: 'journal',
      indexes: 'overview',
      outputs: 'overview',
      meta: 'overview',
      root: 'overview',
    }[record.group] || 'overview';
    const imageUrl = buildInfoboxArtwork(record.title || titleForPath(record.path, data), paletteSection, subtitle);
    const rows = [
      ['Kind', humanizeKey(record.kind || 'page')],
      ['Group', humanizeKey(record.group || 'wiki')],
      ['Sources', String((record.source_keys || []).length || 0)],
      ['Related pages', String((record.related_paths || []).length || 0)],
      ['Incoming links', String((record.incoming_paths || []).length || 0)],
    ];
    return `
      <div class="infobox-card">
        <div class="infobox-header">
          <h2 class="infobox-title">${escapeHtml(record.title || titleForPath(record.path, data))}</h2>
          <p class="infobox-subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <figure class="infobox-media">
          <img class="infobox-image" src="${imageUrl}" alt="${escapeHtml(record.title || titleForPath(record.path, data))}">
          <figcaption class="infobox-caption">${escapeHtml(record.summary || 'Part of the Akibwa wiki graph.')}</figcaption>
        </figure>
        <p class="infobox-section-label">Core information</p>
        ${rows.map(([label, value]) => summaryRow(label, value)).join('')}
      </div>
    `;
  }

  const infobox = buildInfoboxSection(section, data);
  return `
    <div class="infobox-card">
      <div class="infobox-header">
        <h2 class="infobox-title">${escapeHtml(infobox.title)}</h2>
        <p class="infobox-subtitle">${escapeHtml(infobox.subtitle)}</p>
      </div>
      <figure class="infobox-media">
        <img class="infobox-image" src="${infobox.imageUrl}" alt="${escapeHtml(infobox.title)}">
        <figcaption class="infobox-caption">${escapeHtml(infobox.caption)}</figcaption>
      </figure>
      <p class="infobox-section-label">Core information</p>
      ${infobox.rows.map(([label, value]) => summaryRow(label, value)).join('')}
    </div>
  `;
}

function renderPageContents() {
  const node = el('pageContents');
  if (!node) return;
  const page = activePageNode();
  if (!page) {
    node.innerHTML = '<div class="empty-state">No page contents available.</div>';
    return;
  }

  const headings = [
    ...page.querySelectorAll('.wiki-subhead[id]'),
    ...['see-also-heading', 'backlinks-heading', 'references-heading']
      .map((id) => document.getElementById(id))
      .filter(Boolean),
  ];
  node.innerHTML = headings.length
    ? [
        '<button class="contents-link" type="button" data-scroll-target="pageTitle">(Top)</button>',
        ...headings.map((heading) => `<button class="contents-link" type="button" data-scroll-target="${escapeHtml(heading.id)}">${escapeHtml(heading.textContent.trim())}</button>`),
      ]
        .join('')
    : '<div class="empty-state">No sub-sections on this page.</div>';
}

function updatePageChrome() {
  const data = state.snapshot;
  const section = VALID_SECTIONS.includes(state.activeSection) ? state.activeSection : 'overview';
  const record = data ? currentWikiRecord(data) : null;
  const meta = data ? describeActiveSection(section, data) : SECTION_META.overview;
  const activePerson = section === 'people' && data ? selectedPerson(data) : null;
  const name = state.activeWikiPath && record
    ? record.title || titleForPath(record.path, data)
    : activePerson?.name || meta.label || pageName(section);
  const sourceStamp = data ? fmtDateTime(data.sourceUpdatedAt || data.generatedAt) : '';

  if (el('pageBreadcrumb')) {
    if (state.activeWikiPath && record) {
      el('pageBreadcrumb').textContent = `${APP_NAME} / ${humanizeKey(record.group || 'wiki')} / ${name}`;
    } else {
      el('pageBreadcrumb').textContent = section === 'overview'
        ? APP_NAME
        : activePerson
        ? `${APP_NAME} / People / ${name}`
        : `${APP_NAME} / ${name}`;
    }
  }
  if (el('pageTitle')) {
    el('pageTitle').textContent = name;
  }
  if (el('pageLead')) {
    el('pageLead').textContent = state.activeWikiPath && record
      ? record.summary || 'A linked page inside the Akibwa knowledge base.'
      : meta.copy || SECTION_META.overview.copy;
  }
  if (el('pageMeta')) {
    const parts = state.activeWikiPath && record
      ? [
          humanizeKey(record.kind || 'page'),
          humanizeKey(record.group || 'wiki'),
          IS_READ_ONLY ? 'Hosted snapshot' : 'Local dashboard',
          sourceStamp ? `Source updated ${sourceStamp}` : '',
        ].filter(Boolean)
      : [
          meta.title,
          activePerson?.relationToDan ? relationshipLabel(activePerson.relationToDan) : '',
          IS_READ_ONLY ? 'Hosted snapshot' : 'Local dashboard',
          sourceStamp ? `Source updated ${sourceStamp}` : '',
        ].filter(Boolean);
    el('pageMeta').textContent = parts.join(' · ');
  }
  if (el('sidebarUpdated')) {
    el('sidebarUpdated').textContent = sourceStamp
      ? `Source updated ${sourceStamp}`
      : 'Loading latest document snapshot…';
  }
  if (el('pageSummary')) {
    el('pageSummary').innerHTML = buildPageSummary(section, data);
  }
  if (el('pageRelated')) {
    el('pageRelated').innerHTML = buildPageRelated(section);
  }
  if (el('pageBacklinks')) {
    el('pageBacklinks').innerHTML = buildPageBacklinks(data);
  }
  if (el('pageReferences')) {
    el('pageReferences').innerHTML = buildPageReferences(section, data);
  }

  renderPageContents();
  document.title = (section === 'overview' && !state.activeWikiPath) ? APP_NAME : `${name} · ${APP_NAME}`;
}

function updateSectionFrame() {
  const section = VALID_SECTIONS.includes(state.activeSection) ? state.activeSection : 'overview';
  document.body.dataset.lifeView = state.activeWikiPath ? 'wiki' : section === 'overview' ? 'home' : 'section';

  document.querySelectorAll('.dashboard-section').forEach((node) => {
    node.classList.remove('is-active');
    node.hidden = true;
  });

  if (state.snapshot) {
    if (state.activeWikiPath) {
      el('pageArticleBody').innerHTML = buildWikiRecordBody(currentWikiRecord(state.snapshot));
    } else {
      renderArticleBody(state.snapshot);
    }
  }

  document.querySelectorAll('.drawer-link, .sidebar-brand, .site-wordmark, .topbar-link').forEach((node) => {
    node.classList.toggle('is-active', !state.activeWikiPath && node.dataset.navSection === section);
  });
  renderWikiBrowse(state.snapshot);
  updatePageChrome();
}

function setDrawerOpen(isOpen) {
  const shell = el('leftNavShell');
  const toggle = el('drawerToggle');
  if (!shell) return;

  const shouldShowOpen = Boolean(isOpen);
  shell.classList.toggle('is-open', shouldShowOpen);
  document.body.dataset.drawer = shouldShowOpen ? 'open' : 'closed';

  if (toggle) toggle.setAttribute('aria-expanded', String(shouldShowOpen));
}

function closeDrawer() {
  state.drawerOpen = false;
  setDrawerOpen(false);
}

function hydrateDrawerState() {
  state.drawerOpen = false;
  setDrawerOpen(state.drawerOpen);
}

function renderOnebag(data) {
  const { onebag } = data;
  const avgItemWeightG = onebag.trackedItemCount ? (onebag.trackedWeightKg * 1000) / onebag.trackedItemCount : 0;
  const topCategory = (onebag.categoryBreakdown || [])[0] || null;
  const headline = onebag.targetWeightKg != null && onebag.weightGapKg != null
    ? `${onebag.weightGapKg > 0 ? '+' : ''}${onebag.weightGapKg.toFixed(2)} kg vs target`
    : `${onebag.trackedItemCount} items`;

  el('onebagHeadline').textContent = headline;
  el('onebagProgressStrong').textContent = fmtKg(onebag.trackedWeightKg);
  el('onebagProgressLabel').textContent =
    onebag.targetWeightKg != null
      ? `Tracked weight against ${fmtKg(onebag.targetWeightKg)} target`
      : 'Tracked carry weight';

  const progressPct = onebag.targetWeightKg
    ? Math.min((onebag.trackedWeightKg / onebag.targetWeightKg) * 100, 100)
    : 100;
  el('onebagProgressFill').style.width = `${Math.max(progressPct, 12)}%`;

  el('onebagStats').innerHTML = [
    statCard('Tracked value', gbp.format(onebag.trackedValueGbp), `${onebag.trackedItemCount} owned items`),
    statCard(
      'Target gap',
      onebag.targetWeightKg != null && onebag.weightGapKg != null
        ? `${onebag.weightGapKg > 0 ? '+' : ''}${onebag.weightGapKg.toFixed(2)} kg`
        : 'No target',
      onebag.targetWeightKg != null
        ? `${fmtKg(onebag.targetWeightKg)} target weight`
        : 'Add a target when you want this section to pressure-test the setup',
    ),
    statCard(
      'Backpack',
      onebag.backpack?.item || 'No backpack item found',
      onebag.backpack ? `${fmtG(onebag.backpack.weightG)} tracked` : '',
    ),
    statCard(
      'Average item',
      avgItemWeightG ? fmtG(avgItemWeightG) : '—',
      topCategory ? `Top load category: ${topCategory.category}` : 'Average weight per tracked item',
    ),
  ].join('');

  const categories = onebag.categoryBreakdown || [];
  const topCategoryWeight = categories[0]?.weightG || 1;
  el('categoryBreakdown').innerHTML = categories.length
    ? categories
        .map(
          (item) => `
            <div class="meter-card">
              <div class="meter-head">
                <strong>${escapeHtml(item.category)}</strong>
                <span>${escapeHtml(fmtG(item.weightG))}</span>
              </div>
              <div class="meter-track">
                <span class="meter-bar" style="width:${Math.max((item.weightG / topCategoryWeight) * 100, 8)}%"></span>
              </div>
            </div>
          `,
        )
        .join('')
    : '<div class="empty-state">No category split has been surfaced yet.</div>';

  el('heaviestItems').innerHTML = (onebag.heaviestItems || []).length
    ? (onebag.heaviestItems || [])
        .slice(0, 6)
        .map((item) => stackItem(item.item, fmtG(item.weightG), item.category))
        .join('')
    : '<div class="empty-state">No heaviest items were parsed yet.</div>';

  el('expensiveItems').innerHTML = (onebag.mostExpensiveItems || []).length
    ? (onebag.mostExpensiveItems || [])
        .slice(0, 6)
        .map((item) => stackItem(item.item, gbp.format(item.priceGbp), item.category))
        .join('')
    : '<div class="empty-state">No high-value items were parsed yet.</div>';
}

function renderFashion(data) {
  const fashion = buildFashionData(data.onebag.items);
  const topValueGroup = fashion.categories
    .slice()
    .sort((a, b) => Number(b.valueGbp || 0) - Number(a.valueGbp || 0))[0] || null;
  el('fashionStats').innerHTML = [
    statCard('Wardrobe pieces', String(fashion.items.length), `${fashion.categories.length} live categories`),
    statCard('Tracked value', gbp.format(fashion.totalValueGbp), 'Only items surfaced from the inventory workbook'),
    statCard('Tracked weight', fmtKg(fashion.totalWeightG / 1000), 'Useful for travel rotation and wardrobe overlap'),
    statCard(
      'Biggest group',
      topValueGroup?.group || '—',
      topValueGroup ? `${topValueGroup.count} pieces · ${gbp.format(topValueGroup.valueGbp)}` : 'No wardrobe group has surfaced yet',
    ),
  ].join('');

  el('fashionCategories').innerHTML = fashion.categories.length
    ? fashion.categories
        .map((group) =>
          stackItem(
            group.group,
            `${group.count} piece${group.count === 1 ? '' : 's'}`,
            `${gbp.format(group.valueGbp)} · ${fmtG(group.weightG)}`,
          ),
        )
        .join('')
    : '<div class="empty-state">No wardrobe categories were recognised from the inventory yet.</div>';

  el('fashionPieces').innerHTML = fashion.items.length
    ? fashion.items
        .slice()
        .sort((a, b) => {
          const groupDelta = FASHION_GROUP_ORDER.indexOf(a.fashionGroup) - FASHION_GROUP_ORDER.indexOf(b.fashionGroup);
          if (groupDelta !== 0) return groupDelta;
          return a.item.localeCompare(b.item);
        })
        .map((item) => stackItem(item.item, item.fashionGroup, `${gbp.format(item.priceGbp)} · ${fmtG(item.weightG)}`))
        .join('')
    : '<div class="empty-state">No current wardrobe items were found in the inventory workbook.</div>';

  el('fashionHighlights').innerHTML = fashion.items.length
    ? fashion.items
        .slice()
        .sort((a, b) => Number(b.priceGbp || 0) - Number(a.priceGbp || 0))
        .slice(0, 8)
        .map((item) => stackItem(item.item, gbp.format(item.priceGbp), `${item.fashionGroup} · ${fmtG(item.weightG)}`))
        .join('')
    : '<div class="empty-state">No highlighted fashion pieces were found yet.</div>';
}

function renderRunning(data) {
  const running = data.running || {};
  const currentShoes = Array.isArray(running.currentShoes) ? running.currentShoes : [];
  const requirements = Array.isArray(running.requirements) ? running.requirements : [];
  const shortlist = Array.isArray(running.shortlist) ? running.shortlist : [];
  const wardrobeAnchors = Array.isArray(running.wardrobeAnchors) ? running.wardrobeAnchors : [];
  const recommendation = running.recommendation || {};
  const palette = running.paletteDirection || {};
  const headline = recommendation.pick || 'Shoe board';

  if (el('runningHeadline')) {
    el('runningHeadline').textContent = headline;
  }

  if (el('runningIntro')) {
    const setup = currentShoes.map((shoe) => shoe.name).filter(Boolean).join(' + ');
    el('runningIntro').textContent = [
      running.goal || '',
      setup ? `Current rotation: ${setup}.` : '',
      running.statusLine || '',
    ].filter(Boolean).join(' ');
  }

  el('runningRecommendation').innerHTML = recommendation.pick
    ? `
      <div class="wiki-record-head running-recommendation-head">
        <div>
          <p class="running-recommendation-label">Best answer right now</p>
          <h4 class="running-recommendation-title">${escapeHtml(recommendation.pick)}</h4>
        </div>
        ${recommendation.secondaryPick ? `<div class="running-recommendation-alt">Alt: ${escapeHtml(recommendation.secondaryPick)}</div>` : ''}
      </div>
      <p class="running-recommendation-copy">${escapeHtml(recommendation.summary || '')}</p>
      <div class="running-chip-row">
        ${recommendation.primaryColorway ? `<span class="running-chip">${escapeHtml(`Best colorway: ${recommendation.primaryColorway}`)}</span>` : ''}
        ${recommendation.safeColorway ? `<span class="running-chip">${escapeHtml(`Safer fallback: ${recommendation.safeColorway}`)}</span>` : ''}
      </div>
    `
    : '<div class="empty-state">No running-shoe recommendation has been saved yet.</div>';

  el('runningBriefStrip').innerHTML = [
    ...requirements.slice(0, 4),
    recommendation.buyIf || '',
  ]
    .filter(Boolean)
    .map((item) => `<span class="running-chip">${escapeHtml(item)}</span>`)
    .join('');

  el('runningCurrentSetup').innerHTML = currentShoes.length
    ? currentShoes
        .map((shoe) => stackItem(shoe.name, shoe.verdict || shoe.role || '', shoe.issue || shoe.note || ''))
        .join('')
    : '<div class="empty-state">No current shoes have been saved yet.</div>';

  el('runningPalette').innerHTML = [
    palette.best ? stackItem('Best direction', '', palette.best) : '',
    wardrobeAnchors.length ? stackItem('Works with', `${wardrobeAnchors.length} anchors`, wardrobeAnchors.join(' · ')) : '',
    (palette.avoid || []).length ? stackItem('Avoid', '', (palette.avoid || []).join(' · ')) : '',
    recommendation.colorNote ? stackItem('Colorway call', '', recommendation.colorNote) : '',
  ].filter(Boolean).join('') || '<div class="empty-state">No colorway direction has been saved yet.</div>';

  el('runningCarouselTrack').innerHTML = shortlist.length
    ? shortlist
        .map((choice) => `
          <article class="wiki-record running-choice-card ${choice.isRecommended ? 'is-recommended' : ''}">
            <div class="wiki-record-head running-choice-head">
              <div>
                <p class="running-choice-brand">${escapeHtml(choice.brand || '')}</p>
                <h5 class="running-choice-title">${escapeHtml(choice.name || 'Unnamed shoe')}</h5>
              </div>
              ${choice.verdict ? `<div class="running-choice-verdict">${escapeHtml(choice.verdict)}</div>` : ''}
            </div>
            <div class="running-chip-row">
              ${choice.price ? `<span class="running-chip">${escapeHtml(choice.price)}</span>` : ''}
              ${choice.weight ? `<span class="running-chip">${escapeHtml(choice.weight)}</span>` : ''}
              ${choice.bestFor ? `<span class="running-chip">${escapeHtml(choice.bestFor)}</span>` : ''}
            </div>
            ${choice.summary ? `<p class="running-choice-copy">${escapeHtml(choice.summary)}</p>` : ''}
            <div class="running-score-row">
              ${choice.scores?.style ? `<div class="running-score"><span>Style</span><strong>${escapeHtml(choice.scores.style)}</strong></div>` : ''}
              ${choice.scores?.daily ? `<div class="running-score"><span>Daily</span><strong>${escapeHtml(choice.scores.daily)}</strong></div>` : ''}
              ${choice.scores?.run ? `<div class="running-score"><span>Run</span><strong>${escapeHtml(choice.scores.run)}</strong></div>` : ''}
            </div>
            ${(choice.why || []).length ? `<div class="running-list-block"><p class="running-list-title">Why it works</p><ul class="running-list">${choice.why.slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}
            ${choice.tradeoffs?.[0] ? `<p class="running-tradeoff">${escapeHtml(`Trade-off: ${choice.tradeoffs[0]}`)}</p>` : ''}
            ${choice.colorways?.[0] ? `<p class="running-colorway">${escapeHtml(`Best color: ${choice.colorways[0]}`)}</p>` : ''}
            ${choice.officialUrl ? `<a class="action-link running-source-link" href="${escapeHtml(choice.officialUrl)}" target="_blank" rel="noreferrer">Open official page</a>` : ''}
          </article>
        `)
        .join('')
    : '<div class="empty-state">No shortlist has been saved yet.</div>';
}

function renderMoney(data) {
  const { money } = data;
  el('moneyStats').innerHTML = [
    statCard('Cash', gbp.format(money.cashTotal), 'Monzo current account snapshot'),
    statCard('Monthly outgoings', gbp.format(money.monthlyOutgoingsTotal), `${money.monthlyOutgoings.length} tracked recurring items`),
    statCard('GBP liabilities', gbp.format(money.liabilitiesGbpTotal || 0), 'Excludes the USD medical bill'),
    statCard(
      'Medical bill',
      money.medicalBillUsd ? usd.format(money.medicalBillUsd) : 'None logged',
      money.medicalBillNotes || 'No USD liability note found',
    ),
  ].join('');

  el('liabilitiesList').innerHTML = (money.liabilities || []).length
    ? money.liabilities
        .map((item) => {
          const metric = String(item.notes || '').toLowerCase().includes('usd') ? usd.format(item.value) : gbp.format(item.value);
          return stackItem(item.item, metric, item.notes);
        })
        .join('')
    : '<div class="empty-state">No liabilities found in the sheet.</div>';

  el('outgoingsList').innerHTML = (money.monthlyOutgoings || []).length
    ? (money.monthlyOutgoings || [])
        .map((item) => stackItem(item.item, gbp.format(item.amountGbp), item.notes))
        .join('')
    : '<div class="empty-state">No recurring outgoings were parsed.</div>';
}

function setInvestmentRangeButtons() {
  document.querySelectorAll('[data-investment-range]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.investmentRange === state.investmentRange);
  });
}

function drawInvestmentHistoryChart(marketPerformance) {
  const chart = el('investmentHistoryChart');
  const note = el('investmentHistoryNote');
  const summary = el('investmentRangeSummary');
  if (!chart || !note || !summary) return;

  setInvestmentRangeButtons();

  if (!marketPerformance?.ok || !marketPerformance.series?.length) {
    chart.innerHTML = '';
    summary.textContent = '';
    note.textContent = marketPerformance?.error || 'Live market history is not available yet.';
    return;
  }

  const series = filterSeriesByRange(marketPerformance.series, state.investmentRange);
  if (!series.length) {
    chart.innerHTML = '';
    summary.textContent = '';
    note.textContent = 'No market history points were available for this range.';
    return;
  }

  const start = series[0];
  const end = series[series.length - 1];
  const startValue = Number(start.marketValueGbp || 0);
  const endValue = Number(end.marketValueGbp || 0);
  const change = endValue - startValue;
  const changePct = startValue ? (change / startValue) * 100 : 0;

  summary.textContent = `${state.investmentRange} view · ${fmtIsoDate(start.date)} to ${fmtIsoDate(end.date)}`;

  if (series.length === 1) {
    chart.innerHTML = `
      <rect x="0" y="0" width="760" height="260" fill="transparent"></rect>
      <line class="history-grid" x1="26" y1="150" x2="734" y2="150"></line>
      <circle class="history-point" cx="380" cy="150" r="5"></circle>
    `;
    note.textContent = `As of ${fmtIsoDate(end.date)}, tracked market holdings are ${gbp.format(endValue)}. More points will appear as the local cache grows.`;
    return;
  }

  const width = 760;
  const height = 260;
  const padX = 26;
  const padY = 24;
  const values = series.map((entry) => Number(entry.marketValueGbp || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(max * 0.04, 1);

  const xFor = (index) => padX + (index * (width - padX * 2)) / (series.length - 1);
  const yFor = (value) => height - padY - ((value - (min - range * 0.08)) / (range * 1.16)) * (height - padY * 2);

  const points = series.map((entry, index) => ({
    x: xFor(index),
    y: yFor(Number(entry.marketValueGbp || 0)),
    value: Number(entry.marketValueGbp || 0),
    date: entry.date,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(height - padY).toFixed(2)} L ${points[0].x.toFixed(2)} ${(height - padY).toFixed(2)} Z`;
  const gridLines = [0, 0.33, 0.66, 1]
    .map((ratio) => {
      const y = padY + ratio * (height - padY * 2);
      return `<line class="history-grid" x1="${padX}" y1="${y.toFixed(2)}" x2="${width - padX}" y2="${y.toFixed(2)}"></line>`;
    })
    .join('');

  const lastPoint = points[points.length - 1];
  const startLabelY = Math.min(Math.max(points[0].y - 12, 20), height - 38);
  const endLabelY = Math.min(Math.max(lastPoint.y - 12, 20), height - 38);

  chart.innerHTML = `
    <defs>
      <linearGradient id="investmentAreaGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(36, 69, 55, 0.28)"></stop>
        <stop offset="100%" stop-color="rgba(36, 69, 55, 0.02)"></stop>
      </linearGradient>
    </defs>
    ${gridLines}
    <path class="history-area history-area-gradient" d="${areaPath}"></path>
    <path class="history-line" d="${linePath}"></path>
    <circle class="history-point history-point-emphasis" cx="${lastPoint.x.toFixed(2)}" cy="${lastPoint.y.toFixed(2)}" r="5"></circle>
    <text class="history-axis-label" x="${padX}" y="${height - 10}">${escapeHtml(fmtIsoDate(start.date))}</text>
    <text class="history-axis-label" x="${width - padX}" y="${height - 10}" text-anchor="end">${escapeHtml(fmtIsoDate(end.date))}</text>
    <text class="history-value-label" x="${points[0].x.toFixed(2)}" y="${startLabelY.toFixed(2)}">${escapeHtml(gbp.format(startValue))}</text>
    <text class="history-value-label" x="${lastPoint.x.toFixed(2)}" y="${endLabelY.toFixed(2)}" text-anchor="end">${escapeHtml(gbp.format(endValue))}</text>
  `;

  note.textContent = `As of ${fmtIsoDate(marketPerformance.asOfDate)}, tracked market holdings are ${gbp.format(marketPerformance.marketValueGbp || 0)}. ${fmtDelta(change)} (${fmtPct(changePct)}) over the selected range. ISA cash of ${gbp.format(marketPerformance.cashReserveGbp || 0)} sits outside the line.`;
}

function renderInvestments(data) {
  const market = data.marketPerformance || {};
  const privateHistory = data.portfolioHistory || [];
  const badge = el('investmentAsOfBadge');

  if (badge) {
    badge.textContent = market.asOfDate ? `As of ${fmtIsoDate(market.asOfDate)}` : 'Awaiting market data';
  }

  if (!market.ok) {
    el('investmentStats').innerHTML = [
      statCard('Portfolio total', gbp.format(data.money?.investmentsTotal || 0), 'Source workbook total'),
      statCard('Live tracking', 'Unavailable', market.error || 'Market history could not be built yet'),
      statCard('ISA cash', gbp.format((data.money?.isaHoldings || []).find((item) => item.item.toLowerCase().includes('cash'))?.value || 0), 'Held separately from market prices'),
      statCard('Private snapshots', String(privateHistory.length || 0), 'Saved beside the source documents'),
    ].join('');
    el('investmentMeta').innerHTML = `<div class="error-state">${escapeHtml(market.error || 'Live market data is not available right now.')}</div>`;
    el('investmentHoldings').innerHTML = '<div class="empty-state">No live holding cards could be built yet.</div>';
    el('investmentPrivateHistory').innerHTML = privateHistory.length
      ? privateHistory.slice(-3).reverse().map((entry) => stackItem(fmtIsoDate(entry.date), gbp.format(entry.investmentsTotal || 0), 'Local workbook snapshot')).join('')
      : '<div class="empty-state">No private snapshots have been stored yet.</div>';
    drawInvestmentHistoryChart(market);
    return;
  }

  el('investmentStats').innerHTML = [
    statCard('Market value', gbp.format(market.marketValueGbp || 0), `${market.positions?.length || 0} tracked positions`),
    statCard('Total with ISA cash', gbp.format(market.totalWithCashGbp || 0), `${fmtDelta(market.totalDayChangeGbp || 0)} since previous close`),
    statCard('1D market move', fmtDelta(market.marketDayChangeGbp || 0), `${fmtPct(market.marketDayChangePct || 0)} since previous close`),
    statCard('ISA cash reserve', gbp.format(market.cashReserveGbp || 0), 'Shown beside the line, not inside it'),
  ].join('');

  const metaCards = [
    stackItem('Read of the chart', 'Current-position value', market.rangeNote || 'Built from the shares currently listed in your documents.'),
    stackItem('Pricing cache', market.cacheUpdatedAt ? fmtDateTime(market.cacheUpdatedAt) : 'Not cached yet', 'Daily closes are cached locally so the interface stays quick.'),
    stackItem('Source', market.priceSource?.provider || 'Market data', 'Holdings come from your workbook and are converted into GBP.'),
  ];

  if (market.warnings?.length) {
    metaCards.push(`<div class="error-state">${escapeHtml(market.warnings[0])}</div>`);
  }

  el('investmentMeta').innerHTML = metaCards.join('');

  el('investmentHoldings').innerHTML = market.positions?.length
    ? market.positions
        .map((position) => {
          const noteParts = [
            `${position.account} account`,
            `${position.quantityDisplay} shares`,
            nativePriceLabel(position) ? `Last price ${nativePriceLabel(position)}` : '',
            position.quantityInferred && position.anchorDate ? `Quantity inferred from ${fmtIsoDate(position.anchorDate)}` : '',
          ].filter(Boolean);

          return `
            <article class="wiki-record holding-card">
              <div class="wiki-record-head holding-head">
                <div>
                  <p class="holding-symbol">${escapeHtml(position.symbol)}</p>
                  <h5 class="holding-name">${escapeHtml(position.label || position.item)}</h5>
                </div>
                <div class="holding-value">${escapeHtml(gbp.format(position.latestValueGbp || 0))}</div>
              </div>
              <div class="holding-pill-row">
                <span class="holding-pill">${escapeHtml(position.account)}</span>
                <span class="holding-pill">${escapeHtml(position.quantityDisplay)} shares</span>
              </div>
              <div class="holding-change-row">
                <div class="change-chip ${signedClass(position.dayChangeGbp || 0)}">1D ${escapeHtml(fmtDelta(position.dayChangeGbp || 0))} · ${escapeHtml(fmtPct(position.dayChangePct || 0))}</div>
                <div class="change-chip ${signedClass(position.monthChangeGbp || 0)}">1M ${escapeHtml(fmtDelta(position.monthChangeGbp || 0))} · ${escapeHtml(fmtPct(position.monthChangePct || 0))}</div>
              </div>
              <p class="holding-note">${escapeHtml(noteParts.join(' · '))}</p>
            </article>
          `;
        })
        .join('')
    : '<div class="empty-state">No tracked holdings could be turned into live market cards yet.</div>';

  el('investmentPrivateHistory').innerHTML = [
    stackItem('Saved dashboard snapshots', String(privateHistory.length || 0), privateHistory.length ? 'Separate from the market chart and useful as private checkpoints.' : 'These build only when the dashboard is revisited.'),
    privateHistory.length
      ? stackItem('Latest private snapshot', gbp.format(privateHistory[privateHistory.length - 1].investmentsTotal || 0), `${fmtIsoDate(privateHistory[privateHistory.length - 1].date)} · ${fmtKg(privateHistory[privateHistory.length - 1].trackedWeightKg || 0)} tracked carry`)
      : '',
  ].filter(Boolean).join('');

  drawInvestmentHistoryChart(market);
}

function renderWork(data) {
  const { work, profile } = data;
  const history = Array.isArray(work.history) ? work.history : [];
  const currentRole = history.find((item) => item.isCurrent) || history[0] || null;

  el('employmentCurrent').innerHTML = currentRole
    ? `
      <div class="wiki-record-head employment-current-top">
        <div class="employment-brand">
          <div class="employment-logo tone-${escapeHtml(currentRole.logoTone || 'ink')}">${escapeHtml(currentRole.logoLabel || '?')}</div>
          <div>
            <p class="employment-brand-label">Current chapter</p>
            <h4 class="employment-brand-title">${escapeHtml(currentRole.role || work.jobTitle || 'Current role')}</h4>
            <p class="employment-brand-copy">${escapeHtml(currentRole.employer || work.employer || 'Employer')} ${currentRole.location ? `· ${escapeHtml(currentRole.location)}` : ''}</p>
          </div>
        </div>
        <div class="employment-pills">
          ${work.workingPattern ? `<span class="employment-pill">${escapeHtml(work.workingPattern)}</span>` : ''}
          ${work.startDateContract ? `<span class="employment-pill">Since ${escapeHtml(work.startDateContract)}</span>` : ''}
          ${profile.currentLiving ? `<span class="employment-pill">${escapeHtml(profile.currentLiving)}</span>` : ''}
        </div>
      </div>
      <p class="employment-brand-copy">
        ${escapeHtml(
          work.officeAddress
            ? `Currently based at ${work.officeAddress}.`
            : 'Current office/base information has not been surfaced yet.',
        )}
      </p>
    `
    : '<div class="empty-state">No current employment chapter was parsed from the workbook yet.</div>';

  el('workStats').innerHTML = [
    statCard('Role', work.jobTitle || work.linkedinTitle || '—', work.employer || ''),
    statCard('Monthly net pay', gbp.format(work.monthlyNetPay || 0), work.employerPension ? `Employer pension ${gbp.format(work.employerPension)} / mo` : ''),
    statCard('Annual comp', gbp.format(work.totalAnnualCompGross || 0), 'Gross, including bonus'),
    statCard('Holiday allowance', work.annualHoliday || '—', work.annualBonusGross ? `Bonus ${gbp.format(work.annualBonusGross)} gross` : ''),
  ].join('');

  el('payslipList').innerHTML = (work.recentPayslips || []).length
    ? work.recentPayslips.map((item) => stackItem(item.label, gbp.format(item.netPay), item.notes)).join('')
    : '<div class="empty-state">No recent payslip rows were parsed from the sheet.</div>';

  el('employmentTimeline').innerHTML = history.length
    ? history.map((item) => `
        <article class="wiki-record employment-timeline-item">
          <div class="employment-timeline-logo tone-${escapeHtml(item.logoTone || 'ink')}">${escapeHtml(item.logoLabel || '?')}</div>
          <div>
            <div class="wiki-record-head employment-timeline-top">
              <div>
                <p class="employment-timeline-role">${escapeHtml(item.role || 'Role')}</p>
                <p class="employment-timeline-meta">${escapeHtml(item.employer || 'Employer')}${item.location ? ` · ${escapeHtml(item.location)}` : ''}</p>
              </div>
              <p class="employment-timeline-range">${escapeHtml(item.range || '')}</p>
            </div>
            <p class="employment-timeline-note">${item.isCurrent ? 'Current role.' : 'Previous role in the path so far.'}</p>
          </div>
        </article>
      `).join('')
    : '<div class="empty-state">No employment history has been surfaced yet.</div>';
}

function renderSoul(data) {
  el('northStar').textContent = data.soul.northStar || 'No north star line extracted from the soul doc.';
  el('valueGrid').innerHTML = (data.soul.values || []).length
    ? (data.soul.values || [])
        .map(
          (value) => `
            <article class="wiki-record value-card">
              <p class="value-name">${escapeHtml(value.name)}</p>
              <p class="value-text">${escapeHtml(value.text)}</p>
            </article>
          `,
        )
        .join('')
    : '<div class="empty-state">No values were extracted from the soul doc yet.</div>';
  el('becomingList').innerHTML = bulletRows(data.soul.becoming || []);
  el('nonNegotiables').innerHTML = bulletRows(data.soul.nonNegotiables || []);
  el('soulQuestion').textContent =
    data.soul.question || 'No explicit closing question was extracted from the soul doc yet.';
}

function renderCapture(data) {
  const capture = data.journalCapture || {};
  const contentInput = el('journalContentInput');

  const saveButton = el('saveJournalBtn');
  const dictateButton = el('dictationToggleBtn');
  const aiRecordButton = el('aiRecordToggleBtn');

  if (contentInput) {
    contentInput.readOnly = IS_READ_ONLY;
    if (IS_READ_ONLY) {
      contentInput.value = '';
      contentInput.placeholder = 'This hosted view is read-only. Use the local dashboard on your Mac to capture new journal notes.';
    }
  }

  if (saveButton) saveButton.disabled = IS_READ_ONLY || !capture.canCreateNoteFile;
  if (dictateButton) dictateButton.disabled = IS_READ_ONLY || !DictationCtor;
  if (aiRecordButton) aiRecordButton.disabled = !(capture.canServerTranscribe && mediaRecordingAvailable());

  if (IS_READ_ONLY) {
    setStatus('This hosted view is read-only. Use the local dashboard on your Mac to write journal notes.');
    setCaptureMode('Hosted snapshot');
  } else if (capture.canCreateNoteFile) {
    setStatus(`New notes will be saved into ${capture.noteDirectory}.`);
  } else {
    setStatus('Journal note files are not configured yet.', 'error');
  }

  updateCaptureButtons();
}

function renderJournal(data) {
  el('journalThemes').innerHTML = (data.journal.themes || []).length
    ? (data.journal.themes || []).map((theme) => `<div class="tag">${escapeHtml(theme)}</div>`).join('')
    : '<div class="empty-state">No recurring themes have been surfaced yet.</div>';

  el('journalEntries').innerHTML = (data.journal.latestEntries || []).length
    ? (data.journal.latestEntries || [])
        .slice(0, 6)
        .map((entry) => `
          <article class="wiki-record entry-card">
            <div class="wiki-record-head entry-top">
              <div class="entry-title">${escapeHtml(entry.title || 'Untitled entry')}</div>
              <div class="entry-date">${escapeHtml(entry.time ? `${entry.date} · ${entry.time}` : entry.date)}</div>
            </div>
            <p class="entry-text">${escapeHtml(truncate(entry.text, 300))}</p>
          </article>
        `)
        .join('')
    : '<div class="empty-state">No recent journal entries were parsed from the document.</div>';
}

function renderPeople(data) {
  const people = data.people || {};
  const summary = people.summary || {};
  const directory = peopleDirectory(data);
  const person = selectedPerson(data);
  const breakdown = Array.isArray(summary.relationship_breakdown) ? summary.relationship_breakdown : [];

  el('personOverview').innerHTML = person
    ? [
        stackItem('Article lead', '', person.articleLead || person.summary || 'No article lead has been generated yet.'),
        stackItem(
          'At a glance',
          `${relationshipLabel(person.relationToDan || person.primaryRelationship || 'person')} · ${person.mentions || 0} mention${person.mentions === 1 ? '' : 's'}`,
          person.firstMentionDate || person.lastMentionDate
            ? `Journal span: ${person.firstMentionDate || 'unknown'}${person.lastMentionDate && person.lastMentionDate !== person.firstMentionDate ? ` to ${person.lastMentionDate}` : ''}.`
            : 'No journal dates are attached yet.',
        ),
        ...(breakdown[0]
          ? [stackItem('People layer status', `${summary.person_count || directory.length || 0} pages`, `${relationshipLabel(breakdown[0].relationship)} is currently the strongest relationship pattern in the journal-derived layer.`)]
          : []),
      ].join('')
    : '<div class="empty-state">No person article is available yet.</div>';

  el('personRelation').innerHTML = person?.relationSummary?.length
    ? person.relationSummary.map((item) => stackItem(item, '', '')).join('')
    : '<div class="empty-state">No relation summary has been generated yet.</div>';

  el('personFacts').innerHTML = person?.facts?.length
    ? person.facts.map((fact) => stackItem(truncate(fact, 220), '', '')).join('')
    : '<div class="empty-state">No evidence-backed facts have been surfaced for this person yet.</div>';

  el('personContext').innerHTML = person?.contextNotes?.length
    ? person.contextNotes.map((note) => stackItem(note, '', '')).join('')
    : '<div class="empty-state">No context notes have been generated yet.</div>';

  el('personEvidence').innerHTML = person?.evidence?.length
    ? person.evidence
        .map((item) => stackItem(
          item.title || item.date || 'Journal note',
          [item.date, ...(item.tags || []).slice(0, 2).map((tag) => relationshipLabel(tag))].filter(Boolean).join(' · '),
          truncate(item.snippet || '', 240),
        ))
        .join('')
    : '<div class="empty-state">No source notes have been surfaced for this person yet.</div>';

  el('peopleIndex').innerHTML = directory.length
    ? directory
        .map((entry) => `
          <button class="wiki-record person-index-link ${entry.slug === state.selectedPersonSlug ? 'is-active' : ''}" type="button" data-person-slug="${escapeHtml(entry.slug)}">
            <div class="wiki-record-head">
              <div class="wiki-record-title">${escapeHtml(entry.name)}</div>
              <div class="wiki-record-meta">${escapeHtml(`${relationshipLabel(entry.relationToDan || entry.primaryRelationship || 'person')} · ${entry.mentions || 0}`)}</div>
            </div>
            <p class="wiki-record-note">${escapeHtml(truncate(entry.articleLead || entry.summary || '', 190))}</p>
          </button>
        `)
        .join('')
    : '<div class="empty-state">No people records have surfaced from the journal yet.</div>';
}

function renderCreative(data) {
  const entries = creativeEntries(data);
  const selected = selectedCreativeEntry(data);
  const titlesNode = el('creativeTitles');
  const focusNode = el('creativeFocus');

  if (titlesNode) {
    titlesNode.innerHTML = entries.length
      ? entries
          .map((entry) => `
            <button class="creative-pill ${entry.title === state.creativeSelectedTitle ? 'is-active' : ''}" type="button" data-creative-title="${escapeHtml(entry.title)}">
              <span class="creative-pill-label">${escapeHtml(entry.title)}</span>
              <span class="creative-pill-note">${escapeHtml(truncate(entry.excerpt || 'Open this piece.', 90) || 'Open this piece.')}</span>
            </button>
          `)
          .join('')
      : '<div class="empty-state">No creative titles were surfaced yet.</div>';
  }

  if (focusNode) {
    focusNode.innerHTML = selected
      ? `
        <p class="creative-focus-label">Selected piece</p>
        <h4 class="creative-focus-title">${escapeHtml(selected.title)}</h4>
        <p class="creative-focus-excerpt">${escapeHtml(selected.excerpt || 'No excerpt was parsed for this piece yet.')}</p>
        <div class="creative-focus-body">
          ${(selected.paragraphs || []).length
            ? selected.paragraphs
                .map((paragraph) => `<p class="creative-focus-paragraph">${escapeHtml(paragraph)}</p>`)
                .join('')
            : '<div class="empty-state">No body text was parsed for this piece yet.</div>'}
        </div>
      `
      : '<div class="empty-state">No creative piece is available to open yet.</div>';
  }
}

function updateCaptureButtons() {
  const dictateButton = el('dictationToggleBtn');
  const aiRecordButton = el('aiRecordToggleBtn');

  if (IS_READ_ONLY) {
    if (dictateButton) {
      dictateButton.textContent = 'Start dictation';
    }
    if (aiRecordButton) {
      aiRecordButton.textContent = 'Record for AI transcript';
    }
    setCaptureMode('Hosted snapshot');
    return;
  }

  if (dictateButton) {
    dictateButton.textContent = state.isDictating ? 'Stop dictation' : 'Start dictation';
  }

  if (aiRecordButton && state.snapshot?.journalCapture?.canServerTranscribe) {
    aiRecordButton.textContent = state.isRecording ? 'Stop recording' : 'Record for AI transcript';
  }

  if (state.isRecording) {
    setCaptureMode('Recording voice note');
  } else if (state.isDictating) {
    setCaptureMode('Live dictation');
  } else if (state.currentCaptureSource === 'server-transcription') {
    setCaptureMode('AI transcript ready');
  } else if (state.currentCaptureSource === 'browser-dictation') {
    setCaptureMode('Dictated draft');
  } else {
    setCaptureMode('Typed capture');
  }
}

function mergeIntoJournalText(text) {
  const input = el('journalContentInput');
  if (!input) return;

  const existing = input.value.trim();
  input.value = existing ? `${existing}\n\n${text.trim()}` : text.trim();
  persistJournalDraftFromDom();
}

function applySectionState({ replace = false, scroll = false } = {}) {
  if (state.activeWikiPath) {
    updateSectionFrame();
    writeWikiHash(state.activeWikiPath, replace ? 'replace' : 'push');
    if (scroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  const section = VALID_SECTIONS.includes(state.activeSection) ? state.activeSection : 'overview';
  state.activeSection = section;
  if (section === 'people' && state.snapshot && state.selectedPersonSlug && !selectedPerson(state.snapshot)) {
    state.selectedPersonSlug = '';
  } else if (section !== 'people') {
    state.selectedPersonSlug = '';
  }
  updateSectionFrame();

  writeSectionHash(section, replace ? 'replace' : 'push', section === 'people' ? state.selectedPersonSlug : '');
  if (scroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function setActiveSection(section, options = {}) {
  const nextSection = VALID_SECTIONS.includes(section) ? section : 'overview';
  const nextPersonSlug = nextSection === 'people' && options.preservePerson ? state.selectedPersonSlug : '';
  if (!state.activeWikiPath && state.activeSection === nextSection && state.selectedPersonSlug === nextPersonSlug && !options.force) {
    if (options.scroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  state.activeWikiPath = '';
  state.activeSection = nextSection;
  state.selectedPersonSlug = nextSection === 'people' ? nextPersonSlug : '';
  applySectionState(options);
}

function setActivePerson(personSlug, options = {}) {
  state.activeWikiPath = '';
  state.activeSection = 'people';
  state.selectedPersonSlug = slugify(personSlug);
  applySectionState(options);
}

function setActiveWikiPath(path, options = {}) {
  const record = wikiPageByPath(state.snapshot, path);
  if (record?.section && VALID_SECTIONS.includes(record.section)) {
    setActiveSection(record.section, options);
    return;
  }
  if (record?.person_slug) {
    setActivePerson(record.person_slug, options);
    return;
  }
  if (!path) {
    setActiveSection('overview', options);
    return;
  }
  if (state.activeWikiPath === path && !options.force) {
    if (options.scroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  state.activeWikiPath = path;
  applySectionState(options);
}

function wireNavigation() {
  if (state.navBound) return;
  state.navBound = true;
  hydrateDrawerState();

  const toggleDrawer = () => {
    state.drawerOpen = !state.drawerOpen;
    setDrawerOpen(state.drawerOpen);
  };

  el('drawerToggle')?.addEventListener('click', toggleDrawer);

  el('drawerScrim')?.addEventListener('click', () => {
    closeDrawer();
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-nav-section]');
    if (!link) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    setActiveSection(link.dataset.navSection, { scroll: true });
    closeDrawer();
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-person-slug]');
    if (!link) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    setActivePerson(link.dataset.personSlug, { scroll: true });
    closeDrawer();
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-wiki-path]');
    if (!link) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    setActiveWikiPath(link.dataset.wikiPath, { scroll: true });
    closeDrawer();
  });

  document.addEventListener('click', (event) => {
    const targetButton = event.target.closest('[data-scroll-target]');
    if (!targetButton) return;
    event.preventDefault();
    const target = document.getElementById(targetButton.dataset.scrollTarget || '');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  el('navSearchInput')?.addEventListener('input', (event) => {
    const query = String(event.target.value || '').trim().toLowerCase();
    document.querySelectorAll('.drawer-link, .wiki-browse-link').forEach((node) => {
      const matches = !query || node.textContent.toLowerCase().includes(query);
      node.hidden = !matches;
    });
    document.querySelectorAll('.wiki-browse-group').forEach((group) => {
      const visibleLinks = [...group.querySelectorAll('.wiki-browse-link')].filter((node) => !node.hidden);
      group.hidden = Boolean(query) && !visibleLinks.length;
    });
  });

  el('navSearchInput')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const firstVisible = [...document.querySelectorAll('.drawer-link, .wiki-browse-link')].find((node) => !node.hidden);
    if (!firstVisible) return;
    event.preventDefault();
    firstVisible.click();
    closeDrawer();
  });

  el('contentsToggle')?.addEventListener('click', () => {
    const rail = document.querySelector('.wiki-left-rail');
    if (!rail) return;
    const nextCollapsed = !rail.classList.contains('is-collapsed');
    rail.classList.toggle('is-collapsed', nextCollapsed);
    el('contentsToggle').textContent = nextCollapsed ? 'show' : 'hide';
    el('contentsToggle').setAttribute('aria-expanded', String(!nextCollapsed));
  });

  window.addEventListener('hashchange', () => {
    const next = readRouteFromHash();
    if (next.section !== state.activeSection || next.personSlug !== state.selectedPersonSlug || next.wikiPath !== state.activeWikiPath) {
      state.activeSection = next.section;
      state.selectedPersonSlug = next.personSlug;
      state.activeWikiPath = next.wikiPath;
      applySectionState({ replace: true });
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.drawerOpen) {
      closeDrawer();
    }
  });

  window.addEventListener('resize', () => {
    setDrawerOpen(state.drawerOpen);
  });
}

function wireCapture() {
  if (state.captureBound) return;
  state.captureBound = true;

  el('journalContentInput')?.addEventListener('input', () => {
    if (state.currentCaptureSource === 'typed') {
      updateCaptureButtons();
    }
    persistJournalDraftFromDom();
  });

  el('journalContentInput')?.addEventListener('keydown', async (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      await saveJournalEntry();
    }
  });

  el('dictationToggleBtn')?.addEventListener('click', async () => {
    if (state.isDictating) {
      stopDictation();
      return;
    }
    await startDictation();
  });

  el('aiRecordToggleBtn')?.addEventListener('click', async () => {
    if (state.isRecording) {
      stopAiRecording();
      return;
    }
    await startAiRecording();
  });

  el('saveJournalBtn')?.addEventListener('click', async () => {
    await saveJournalEntry();
  });
}

function wireInvestmentControls() {
  if (state.investmentBound) return;
  state.investmentBound = true;

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-investment-range]');
    if (!button) return;
    event.preventDefault();
    const nextRange = button.dataset.investmentRange;
    if (!INVESTMENT_RANGES[nextRange]) return;
    state.investmentRange = nextRange;
    if (state.snapshot) {
      renderInvestments(state.snapshot);
    }
  });
}

function wireCreativeControls() {
  if (state.creativeBound) return;
  state.creativeBound = true;

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-creative-title]');
    if (!button || !state.snapshot) return;
    event.preventDefault();
    state.creativeSelectedTitle = button.dataset.creativeTitle || '';
    renderCreative(state.snapshot);
  });
}

function wireRunningControls() {
  if (state.runningBound) return;
  state.runningBound = true;

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-running-shift]');
    if (!button) return;
    const track = el('runningCarouselTrack');
    if (!track) return;
    event.preventDefault();

    const shift = Number(button.dataset.runningShift || 0);
    const firstCard = track.querySelector('.running-choice-card');
    const step = firstCard ? firstCard.getBoundingClientRect().width + 16 : 320;
    track.scrollBy({ left: step * shift, behavior: 'smooth' });
  });
}

function wireAppearanceControls() {
  if (state.appearanceBound) return;
  state.appearanceBound = true;
  syncAppearanceControls();

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    if (input.name === 'appearance-text-size') {
      state.appearance.textSize = ['small', 'standard', 'large'].includes(input.value) ? input.value : 'standard';
      applyAppearancePrefs();
      writeAppearancePrefs();
      return;
    }

    if (input.name === 'appearance-width') {
      state.appearance.width = ['standard', 'wide'].includes(input.value) ? input.value : 'standard';
      applyAppearancePrefs();
      writeAppearancePrefs();
    }
  });
}

async function startDictation() {
  if (!DictationCtor) {
    setStatus('Browser dictation is not available here. Try typed capture instead.', 'error');
    return;
  }

  if (state.isRecording) {
    setStatus('Stop the current voice recording before starting dictation.', 'error');
    return;
  }

  const input = el('journalContentInput');
  state.dictationBaseText = input?.value.trim() || '';
  state.dictationFinalText = '';
  state.currentCaptureSource = 'browser-dictation';

  const recognition = new DictationCtor();
  recognition.lang = 'en-GB';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0]?.transcript?.trim() || '';
      if (!transcript) continue;
      if (event.results[i].isFinal) {
        state.dictationFinalText = `${state.dictationFinalText} ${transcript}`.trim();
      } else {
        interimText = `${interimText} ${transcript}`.trim();
      }
    }

    const nextValue = [state.dictationBaseText, state.dictationFinalText, interimText]
      .filter(Boolean)
      .join('\n\n');
    if (input) input.value = nextValue;
    persistJournalDraftFromDom();
  };

  recognition.onerror = (event) => {
    setStatus(`Dictation hit an issue: ${event.error || 'unknown error'}.`, 'error');
  };

  recognition.onend = () => {
    state.isDictating = false;
    state.recognition = null;
    updateCaptureButtons();
    if (state.dictationFinalText.trim()) {
      setStatus('Dictation inserted. Review the text, then save the dated note file.', 'success');
    }
  };

  state.recognition = recognition;
  state.isDictating = true;
  updateCaptureButtons();
  setStatus('Listening. Speak naturally, then click again to stop dictation.');
  recognition.start();
}

function stopDictation() {
  if (state.recognition) {
    state.recognition.stop();
  }
}

async function startAiRecording() {
  if (!state.snapshot?.journalCapture?.canServerTranscribe) {
    setStatus(
      state.snapshot?.journalCapture?.transcribeReasons?.[0] ||
        'AI transcription is not configured yet.',
      'error',
    );
    return;
  }

  if (!mediaRecordingAvailable()) {
    setStatus('This browser cannot record audio for server transcription.', 'error');
    return;
  }

  if (state.isDictating) {
    setStatus('Stop dictation before starting an AI-recorded voice note.', 'error');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = preferredAudioMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

    state.mediaStream = stream;
    state.mediaRecorder = recorder;
    state.mediaChunks = [];
    state.isRecording = true;
    updateCaptureButtons();
    setStatus('Recording voice note. Click again to stop and transcribe.');

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data?.size) {
        state.mediaChunks.push(event.data);
      }
    });

    recorder.addEventListener('stop', async () => {
      const blob = new Blob(state.mediaChunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
      state.mediaChunks = [];
      state.isRecording = false;
      state.mediaRecorder = null;
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach((track) => track.stop());
        state.mediaStream = null;
      }
      updateCaptureButtons();
      await transcribeBlob(blob);
    });

    recorder.start();
  } catch (error) {
    state.isRecording = false;
    state.mediaRecorder = null;
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach((track) => track.stop());
      state.mediaStream = null;
    }
    updateCaptureButtons();
    setStatus(
      error instanceof Error ? error.message : 'Microphone access was denied or recording failed.',
      'error',
    );
  }
}

function stopAiRecording() {
  if (state.mediaRecorder && state.isRecording) {
    state.mediaRecorder.stop();
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Audio could not be read for upload.'));
    reader.readAsDataURL(blob);
  });
}

async function transcribeBlob(blob) {
  if (!blob.size) {
    setStatus('The voice note was empty, so nothing was transcribed.', 'error');
    return;
  }

  setStatus('Uploading voice note for AI transcription...');

  try {
    const audioBase64 = await blobToBase64(blob);
    const response = await fetch(LIFE_CONFIG.transcribeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        mimeType: blob.type || 'audio/webm',
        language: 'en',
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Transcription failed.');
    }

    mergeIntoJournalText(data.transcript || '');
    state.currentCaptureSource = 'server-transcription';
    updateCaptureButtons();
    setStatus('AI transcript inserted. Review it, then save the dated note file.', 'success');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Transcription failed.', 'error');
  }
}

async function saveJournalEntry() {
  const titleInput = el('journalTitleInput');
  const contentInput = el('journalContentInput');
  const saveButton = el('saveJournalBtn');

  if (IS_READ_ONLY) {
    setStatus('The hosted site is read-only. Save notes from the local dashboard on your Mac instead.', 'error');
    return;
  }

  if (!state.snapshot?.journalCapture?.canCreateNoteFile) {
    setStatus(
      'Journal note files are not configured yet.',
      'error',
    );
    return;
  }

  const title = titleInput?.value.trim() || '';
  const content = contentInput?.value.trim() || '';
  if (!content) {
    setStatus('Write or dictate something before saving.', 'error');
    return;
  }

  if (saveButton) saveButton.disabled = true;
  setStatus('Saving the note into your journal captures folder...');

  try {
    const response = await fetch(LIFE_CONFIG.noteFileUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        source: state.currentCaptureSource,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Journal save failed.');
    }

    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
    state.currentCaptureSource = 'typed';
    clearJournalDraft();

    if (data.snapshot?.ok) {
      state.snapshot = data.snapshot;
      renderAll(data.snapshot);
    }
    updateCaptureButtons();
    setStatus(`Saved to ${data.entry?.path || state.snapshot?.journalCapture?.noteDirectory}.`, 'success');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Journal save failed.', 'error');
  } finally {
    if (saveButton) saveButton.disabled = !state.snapshot?.journalCapture?.canCreateNoteFile;
  }
}

function renderAll(data) {
  state.snapshot = data;
  renderHome(data);
  renderProfile(data);
  renderOnebag(data);
  renderFashion(data);
  renderRunning(data);
  renderMoney(data);
  renderInvestments(data);
  renderCreative(data);
  renderCapture(data);
  if (!IS_READ_ONLY) {
    hydrateJournalDraft();
  }
  renderJournal(data);
  renderPeople(data);
  renderWork(data);
  renderSoul(data);
  wireNavigation();
  wireCapture();
  wireInvestmentControls();
  wireCreativeControls();
  wireRunningControls();
  wireAppearanceControls();
  syncAppearanceControls();
  renderWikiBrowse(data);
  applySectionState({ replace: true });
}

async function loadSnapshot() {
  const response = await fetch(LIFE_CONFIG.dataUrl, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw data;
  }
  return data;
}

async function init() {
  try {
    const storedAppearance = readAppearancePrefs();
    if (storedAppearance) {
      state.appearance = storedAppearance;
    }
    applyAppearancePrefs();
    const route = readRouteFromHash();
    state.activeSection = route.section;
    state.selectedPersonSlug = route.personSlug;
    state.activeWikiPath = route.wikiPath;
    const data = await loadSnapshot();
    renderAll(data);
  } catch (error) {
    renderError(
      error && typeof error === 'object'
        ? error
        : {
            error: error instanceof Error ? error.message : 'Unknown network error.',
            searched: [
              IS_READ_ONLY
                ? 'Make sure the latest hosted snapshot has been deployed.'
                : 'Make sure the local dashboard launcher is serving this page.',
            ],
          },
    );
  }
}

init();
