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
  const requestedId = params.get('person') || defaultPersonId;
  const personId = getFamilyPersonById(requestedId)?.id || defaultPersonId;
  const view = params.get('view') === 'record' ? 'record' : 'tree';
  return { personId, view };
};

const writeRoute = (next: RouteState, mode: 'push' | 'replace') => {
  const url = new URL(window.location.href);
  url.searchParams.set('person', next.personId);
  if (next.view === 'record') {
    url.searchParams.set('view', 'record');
  } else {
    url.searchParams.delete('view');
  }
  const method = mode === 'replace' ? 'replaceState' : 'pushState';
  window.history[method]({}, '', `${url.pathname}${url.search}`);
};

const branchAccentColor: Record<string, string> = {
  atkinson: '#2f5d50',
  nealon: '#99633d',
  shared: '#345061',
};

const App: React.FC = () => {
  const [route, setRoute] = useState<RouteState>(() => readRoute());

  useEffect(() => {
    const initial = readRoute();
    writeRoute(initial, 'replace');
    const onPop = () => setRoute(readRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const selectedPerson = getFamilyPersonById(route.personId) || familyPeople[0];

  useEffect(() => {
    document.title =
      route.view === 'record'
        ? `${selectedPerson.name} — Dakibwa`
        : 'Dakibwa — Atkinson Family Archive';

    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        'content',
        route.view === 'record'
          ? `${selectedPerson.name} — Atkinson and Nealon family lines.`
          : 'Dakibwa is a family archive for the Atkinson line. Names confirmed, connections made, details to follow.'
      );
    }

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', '#ffffff');
  }, [route.view, selectedPerson]);

  const navigate = (next: RouteState, mode: 'push' | 'replace' = 'push') => {
    const current = `${route.view}:${route.personId}`;
    const nextKey = `${next.view}:${next.personId}`;
    if (current === nextKey && mode !== 'replace') return;
    writeRoute(next, mode);
    setRoute(next);
  };

  const handleSelect = (personId: string) => navigate({ personId, view: route.view });

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
        <a className="skip-link" href="#main-content">Skip to content</a>

        <header className="site-header">
          <div className="site-brand">
            <a href="/" className="site-brand-mark">Dakibwa</a>
            <span className="site-brand-copy">Family Archive</span>
          </div>

          <nav className="site-nav" aria-label="Primary">
            <button type="button" className="nav-button" onClick={() => openTree(selectedPerson.id)}>
              Tree view
            </button>
            <a className="nav-link" href={`/?person=${defaultPersonId}`}>
              Root record
            </a>
          </nav>
        </header>

        <PersonRecordPage
          person={selectedPerson}
          branches={familyBranches}
          onBack={openTree}
          onSelect={openRecord}
        />

        <footer className="site-footer">
          <p>Dakibwa — a family archive, started honestly.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>

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
          <a className="nav-link" href="#register">
            Register
          </a>
        </nav>
      </header>

      <main id="main-content">
        {/* Landing */}
        <div className="landing">
          <p className="landing-eyebrow">Atkinson family archive</p>
          <h1 className="landing-h1">The Atkinson family.</h1>
          <p className="landing-desc">
            A first honest record — names confirmed, connections made. Details will be
            added as research continues.
          </p>
          <p className="landing-desc">
            Sparse by intention. Better to begin with what is known than to fill gaps with guesswork.
          </p>
          <div className="landing-actions">
            <a className="btn btn-primary" href="#tree">Browse the tree</a>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => openRecord(defaultPersonId)}
            >
              Open Daniel's record
            </button>
          </div>
        </div>

        {/* Tree */}
        <div className="section-block" id="tree">
          <div className="section-head">
            <p className="section-label">Family tree</p>
            <h2>Three generations</h2>
          </div>

          <div className="tree-explorer">
            <FamilyTree
              people={familyPeople}
              selectedId={selectedPerson.id}
              onSelect={handleSelect}
            />

            <PersonPanel
              selectedPerson={selectedPerson}
              branches={familyBranches}
              onSelect={handleSelect}
              onOpenRecord={openRecord}
              onReset={() => handleSelect(defaultPersonId)}
              showReset={selectedPerson.id !== defaultPersonId}
            />
          </div>
        </div>

        {/* Branches */}
        <div className="section-block" id="branches">
          <div className="section-head">
            <p className="section-label">Branch overview</p>
            <h2>Both lines</h2>
          </div>

          <div className="branches-grid">
            {primaryBranches.map((branch) => (
              <div key={branch.id} className="branch-card">
                <div
                  className="branch-card-accent"
                  style={{ background: branchAccentColor[branch.id] || '#888' }}
                />
                <p className="branch-card-name">{branch.label}</p>
                <p className="branch-card-strapline">{branch.strapline}</p>
                <p className="branch-card-desc">{branch.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Register */}
        <div className="section-block" id="register">
          <div className="section-head">
            <p className="section-label">Family register</p>
            <h2>{familyPeople.length} people in this archive</h2>
          </div>

          <table className="register-table">
            <thead>
              <tr>
                <th aria-label="Branch indicator" />
                <th>Name</th>
                <th>Generation</th>
                <th>Place</th>
                <th>Record</th>
              </tr>
            </thead>
            <tbody>
              {familyPeople.map((person) => (
                <tr
                  key={person.id}
                  className={`register-row branch-${person.branch}${person.id === selectedPerson.id ? ' is-selected' : ''}`}
                >
                  <td>
                    <div
                      className={`register-dot branch-dot-${person.branch}`}
                      aria-hidden="true"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="register-name-btn"
                      onClick={() => openRecord(person.id)}
                    >
                      {person.name}
                    </button>
                  </td>
                  <td className="register-muted">{person.generation}</td>
                  <td className="register-muted">{person.location || '—'}</td>
                  <td className="register-muted">{person.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <footer className="site-footer">
        <p>Dakibwa — a family archive, started honestly. Two branches, eight names, room to grow.</p>
      </footer>
    </div>
  );
};

export default App;
