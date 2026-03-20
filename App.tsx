import React, { useEffect, useState } from 'react';
import './src_styles.css';
import FamilyTree from './components/FamilyTree';
import PersonPanel from './components/PersonPanel';
import PersonRecordPage from './components/PersonRecordPage';
import {
  defaultPersonId,
  familyBranches,
  familyPeople,
  getBranchById,
  getFamilyPersonById,
  primaryBranches,
} from './data/familyTree';

type ViewMode = 'tree' | 'record';

interface RouteState {
  personId: string;
  view: ViewMode;
}

const readRoute = (): RouteState => {
  const params = new URLSearchParams(window.location.search);
  const requestedPersonId = params.get('person') || defaultPersonId;
  const personId = getFamilyPersonById(requestedPersonId)?.id || defaultPersonId;
  const view = params.get('view') === 'record' ? 'record' : 'tree';
  return { personId, view };
};

const writeRoute = (nextRoute: RouteState, mode: 'push' | 'replace') => {
  const url = new URL(window.location.href);
  url.searchParams.set('person', nextRoute.personId);

  if (nextRoute.view === 'record') {
    url.searchParams.set('view', 'record');
  } else {
    url.searchParams.delete('view');
  }

  const method = mode === 'replace' ? 'replaceState' : 'pushState';
  window.history[method]({}, '', `${url.pathname}${url.search}`);
};

const App: React.FC = () => {
  const [route, setRoute] = useState<RouteState>(() => readRoute());

  useEffect(() => {
    const nextRoute = readRoute();
    writeRoute(nextRoute, 'replace');

    const handlePopState = () => setRoute(readRoute());
    window.addEventListener('popstate', handlePopState);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectedPerson = getFamilyPersonById(route.personId) || familyPeople[0];
  const selectedBranch = getBranchById(selectedPerson.branch) || familyBranches[0];
  const uniquePlaces = new Set(primaryBranches.flatMap((branch) => branch.places));
  const recordCount = familyPeople.reduce((count, person) => count + person.records.length, 0);

  useEffect(() => {
    const title =
      route.view === 'record'
        ? `${selectedPerson.name} | Dakibwa Family Tree`
        : 'Dakibwa Family Tree | Atkinson and Broadbent';
    document.title = title;

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        route.view === 'record'
          ? `${selectedPerson.name} on the Dakibwa family tree, a first public record view spanning the Atkinson and Broadbent branches.`
          : 'Dakibwa is a public family-tree site for akibwa.com: a polished first pass through the Atkinson and Broadbent branches, with clickable records and room to grow.'
      );
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute('content', '#f4ede2');
    }
  }, [route.view, selectedPerson]);

  const navigate = (nextRoute: RouteState, mode: 'push' | 'replace' = 'push') => {
    const current = `${route.view}:${route.personId}`;
    const next = `${nextRoute.view}:${nextRoute.personId}`;
    if (current === next && mode !== 'replace') return;

    writeRoute(nextRoute, mode);
    setRoute(nextRoute);
  };

  const handleSelect = (personId: string) => {
    navigate({ personId, view: route.view });
  };

  const openRecord = (personId: string) => {
    navigate({ personId, view: 'record' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openTree = (personId: string) => {
    navigate({ personId, view: 'tree' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (route.view === 'record') {
    return (
      <div className="site-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>

        <header className="site-header">
          <div className="site-brand">
            <span className="site-brand-mark">Dakibwa</span>
            <span className="site-brand-copy">Family Tree / Public V1</span>
          </div>

          <div className="site-nav">
            <button type="button" className="nav-button" onClick={() => openTree(selectedPerson.id)}>
              Tree view
            </button>
            <a className="nav-link" href="/?person=daniel-atkinson">
              Root record
            </a>
          </div>
        </header>

        <PersonRecordPage person={selectedPerson} branches={familyBranches} onBack={openTree} onSelect={openRecord} />
      </div>
    );
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <div className="site-brand">
          <span className="site-brand-mark">Dakibwa</span>
          <span className="site-brand-copy">Family Tree / Public V1</span>
        </div>

        <nav className="site-nav" aria-label="Primary">
          <a className="nav-link" href="#tree">
            Family tree
          </a>
          <a className="nav-link" href="#branches">
            Branches
          </a>
          <button type="button" className="nav-button" onClick={() => openRecord(selectedPerson.id)}>
            Selected record
          </button>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero-panel panel">
          <div className="hero-copy-block">
            <p className="section-kicker">Akibwa.com / first public release</p>
            <h1>A proper first pass at the family tree, set out cleanly and ready to grow.</h1>
            <p className="hero-copy">
              Dakibwa now opens straight onto a public family-tree experience: both the Atkinson and Broadbent branches, a clickable pedigree, and person records that feel like pages rather than placeholders.
            </p>
            <p className="hero-copy hero-copy-soft">
              It is static for now, on purpose. V1 proves the structure, the tone, and the public-facing presentation; private editing and fuller sourcing can land later without replacing the site all over again.
            </p>

            <div className="hero-actions">
              <a className="button button-primary" href="#tree">
                Browse the tree
              </a>
              <button type="button" className="button button-secondary" onClick={() => openRecord(defaultPersonId)}>
                Open Daniel&apos;s record
              </button>
            </div>
          </div>

          <div className="hero-side">
            <div className="status-card">
              <span className="status-label">Current focus</span>
              <strong>{selectedPerson.name}</strong>
              <p>{selectedBranch.strapline}</p>
            </div>
            <div className="status-card">
              <span className="status-label">Coverage</span>
              <strong>Both branches included</strong>
              <p>Atkinson and Broadbent lines are present in the same public-first dataset.</p>
            </div>
            <div className="status-card">
              <span className="status-label">Next phase</span>
              <strong>User-only editing later</strong>
              <p>This build stays static and tidy while the richer archive is assembled.</p>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <span className="fact-label">People in V1</span>
            <strong>{familyPeople.length}</strong>
            <p>Enough to make the tree feel like a real site, not a draft diagram.</p>
          </article>
          <article className="stat-card">
            <span className="fact-label">Main branches</span>
            <strong>{primaryBranches.length}</strong>
            <p>Both family sides are visible from the first screen rather than hidden away.</p>
          </article>
          <article className="stat-card">
            <span className="fact-label">Generations shown</span>
            <strong>4</strong>
            <p>Great-grandparents through to the current household.</p>
          </article>
          <article className="stat-card">
            <span className="fact-label">Record notes</span>
            <strong>{recordCount}</strong>
            <p>Short archive markers that can grow into fuller records later on.</p>
          </article>
        </section>

        <section className="explorer-grid" id="tree">
          <section className="tree-panel panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Family tree</p>
                <h2>Clickable pedigree</h2>
                <p className="panel-copy">
                  The left side carries the Atkinson line, the right side the Broadbent line, and the present-day household sits where the two meet.
                </p>
              </div>
              <div className="tree-key">
                <span className="key-item key-item--atkinson">Atkinson branch</span>
                <span className="key-item key-item--broadbent">Broadbent branch</span>
                <span className="key-item key-item--shared">Shared household</span>
              </div>
            </div>

            <FamilyTree people={familyPeople} selectedId={selectedPerson.id} onSelect={handleSelect} />
          </section>

          <PersonPanel
            selectedPerson={selectedPerson}
            branches={familyBranches}
            onSelect={handleSelect}
            onOpenRecord={openRecord}
            onReset={() => handleSelect(defaultPersonId)}
            showReset={selectedPerson.id !== defaultPersonId}
          />
        </section>

        <section className="branch-section" id="branches">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Branch overview</p>
              <h2>Both sides, kept legible</h2>
              <p className="panel-copy">
                This first public structure already carries the two main lines. Later work can deepen sources, add households, and refine dates without disturbing the overall shape.
              </p>
            </div>
          </div>

          <div className="branch-context-grid">
            {primaryBranches.map((branch) => (
              <article key={branch.id} className={`branch-card branch-card--${branch.id}`}>
                <span className="branch-card-label">{branch.label}</span>
                <strong>{branch.strapline}</strong>
                <p>{branch.description}</p>
                <div className="place-row">
                  {branch.places.map((place) => (
                    <span key={place} className="place-pill">
                      {place}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="register-panel panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Family register</p>
              <h2>Every person still gets a proper entry point</h2>
              <p className="panel-copy">
                The tree is the main event, but the records are meant to stand on their own as well. Open any profile directly and the branch context stays intact.
              </p>
            </div>
          </div>

          <div className="register-grid">
            {familyPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                className={`register-card branch-${person.branch} ${person.id === selectedPerson.id ? 'is-selected' : ''}`}
                onClick={() => openRecord(person.id)}
              >
                <span className="register-role">{person.role}</span>
                <strong>{person.name}</strong>
                <span className="register-years">{person.years}</span>
                <p>{person.location}</p>
              </button>
            ))}
          </div>
        </section>

        <footer className="site-footer">
          <p>
            Public V1 for akibwa.com. Clean enough to replace the old landing page now, and structured so the private editor and deeper archive can follow without another rebuild.
          </p>
          <p>{uniquePlaces.size} Yorkshire places already represented in the first-pass data model.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
