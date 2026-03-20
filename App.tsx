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

  useEffect(() => {
    const title =
      route.view === 'record'
        ? `${selectedPerson.name} | Dakibwa Family Archive`
        : 'Dakibwa | Atkinson Family Archive';
    document.title = title;

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        route.view === 'record'
          ? `${selectedPerson.name} on the Dakibwa family archive — Atkinson and Nealon family lines.`
          : 'Dakibwa is a family archive for the Atkinson line. Names confirmed, connections made, details to follow.'
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
            <span className="site-brand-copy">Family Archive</span>
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
          <span className="site-brand-copy">Family Archive</span>
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
            <p className="section-kicker">Atkinson family archive</p>
            <h1>The Atkinson family.</h1>
            <p className="hero-copy">
              A first honest record — names confirmed, connections made. Details will be added as research continues.
            </p>
            <p className="hero-copy hero-copy-soft">
              Sparse by intention. Better to begin with what is known than to fill the gaps with guesswork.
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
              <span className="status-label">Archive state</span>
              <strong>Beginning honestly</strong>
              <p>Names confirmed. Dates, records, and histories to follow as research grows.</p>
            </div>
            <div className="status-card">
              <span className="status-label">Family lines</span>
              <strong>Atkinson and Nealon</strong>
              <p>Ian's side from Otley; Elizabeth's from Ireland and Otley.</p>
            </div>
          </div>
        </section>

        <section className="explorer-grid" id="tree">
          <section className="tree-panel panel">
            <div className="panel-head">
              <div>
                <p className="section-kicker">Family tree</p>
                <h2>Three generations</h2>
                <p className="panel-copy">
                  The Atkinson line on the left, the Nealon line on the right, and the present-day household where the two meet.
                </p>
              </div>
              <div className="tree-key">
                <span className="key-item key-item--atkinson">Atkinson</span>
                <span className="key-item key-item--nealon">Nealon</span>
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
                What is known is here. What is unknown is left blank, ready to be filled in properly.
              </p>
            </div>
          </div>

          <div className="branch-context-grid">
            {primaryBranches.map((branch) => (
              <article key={branch.id} className={`branch-card branch-card--${branch.id}`}>
                <span className="branch-card-label">{branch.label}</span>
                <strong>{branch.strapline}</strong>
                <p>{branch.description}</p>
                {branch.places.length > 0 && (
                  <div className="place-row">
                    {branch.places.map((place) => (
                      <span key={place} className="place-pill">
                        {place}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="register-panel panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">Family register</p>
              <h2>{familyPeople.length} people in this archive</h2>
              <p className="panel-copy">
                Every person with a confirmed place in the tree. Open any record to see what is known and what is still to come.
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
                <span className="register-years">{person.generation}</span>
                {person.location ? <p>{person.location}</p> : null}
              </button>
            ))}
          </div>
        </section>

        <footer className="site-footer">
          <p>
            Dakibwa — a family archive, started honestly. Two branches, eight names, and room to grow.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default App;
