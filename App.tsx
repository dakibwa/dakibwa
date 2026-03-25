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

const ArchiveMenu: React.FC = () => (
  <details className="site-menu">
    <summary className="site-menu-button">Menu</summary>
    <div className="site-menu-popover">
      <a className="site-menu-link" href="/" aria-current="page">
        Family archive
      </a>
      <a className="site-menu-link" href={`/?person=${defaultPersonId}#tree`}>
        Family tree
      </a>
      <a className="site-menu-link" href={`/?person=${defaultPersonId}#register`}>
        Register
      </a>
      <a className="site-menu-link" href="/dashboard.html">
        Training dashboard
      </a>
    </div>
  </details>
);

const SiteHeader: React.FC<{ label: string; note: string }> = ({ label, note }) => (
  <header className="site-header">
    <div className="site-brand">
      <a href="/" className="site-brand-mark">Dakibwa</a>
      <div className="site-brand-stack">
        <span className="site-brand-copy">{label}</span>
        <span className="site-brand-note">{note}</span>
      </div>
    </div>

    <ArchiveMenu />
  </header>
);

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
        : 'Dakibwa — Family Records';

    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        'content',
        route.view === 'record'
          ? `${selectedPerson.name} — structured records for the Atkinson and Nealon lines.`
          : 'Dakibwa is a clean archive of family records for the Atkinson and Nealon lines.'
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

        <SiteHeader label="Record view" note={selectedPerson.name} />

        <PersonRecordPage
          person={selectedPerson}
          branches={familyBranches}
          onBack={openTree}
          onSelect={openRecord}
        />

        <footer className="site-footer">
          <p>Dakibwa. Structured family records with room to grow.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <SiteHeader label="Family records" note="Atkinson and Nealon lines." />

      <main id="main-content">
        {/* Landing */}
        <div className="landing">
          <p className="landing-eyebrow">Structured family records</p>
          <h1 className="landing-h1">One place for the Atkinson and Nealon lines.</h1>
          <p className="landing-desc">
            A clean interface for names, relationships, and verified records. Start with the tree,
            open a person, and expand detail only when it is known.
          </p>
          <p className="landing-desc">
            Quiet by design. The structure does the work, so the archive can grow without becoming noisy.
          </p>
          <div className="landing-actions">
            <a className="btn btn-primary" href="#tree">Open the tree</a>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => openRecord(defaultPersonId)}
            >
              Open Daniel&apos;s record
            </button>
            <a className="btn btn-secondary" href="/dashboard.html">
              Open training dashboard
            </a>
          </div>

          <div className="landing-stats" aria-label="Archive overview">
            <div className="landing-stat">
              <span className="landing-stat-value">{familyPeople.length}</span>
              <span className="landing-stat-label">records</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value">{primaryBranches.length}</span>
              <span className="landing-stat-label">family lines</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value">3</span>
              <span className="landing-stat-label">generations</span>
            </div>
          </div>
        </div>

        {/* Tree */}
        <div className="section-block" id="tree">
          <div className="section-head">
            <p className="section-label">Tree</p>
            <h2>Connected records</h2>
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
            <p className="section-label">Lines</p>
            <h2>Two family branches</h2>
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
            <p className="section-label">Directory</p>
            <h2>{familyPeople.length} records in the archive</h2>
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
        <p>Dakibwa. Structured family records with room to grow.</p>
      </footer>
    </div>
  );
};

export default App;
