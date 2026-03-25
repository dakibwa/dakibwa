import React, { useEffect, useState } from 'react';
import './src_styles.css';
import FamilyTree from './components/FamilyTree';
import PersonRecordPage from './components/PersonRecordPage';
import TreePreview from './components/TreePreview';
import {
  defaultPersonId,
  familyBranches,
  familyPeople,
  getFamilyPersonById,
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

const ArchiveMenu: React.FC = () => (
  <details className="site-menu">
    <summary className="site-menu-button">Menu</summary>
    <div className="site-menu-popover">
      <a className="site-menu-link" href="/dashboard.html">
        Training dashboard
      </a>
      <a className="site-menu-link" href="/family.html" aria-current="page">
        Family tree
      </a>
    </div>
  </details>
);

const SiteHeader: React.FC<{ label: string; note: string }> = ({ label, note }) => (
  <header className="site-header">
    <div className="site-brand">
      <a href="/dashboard.html" className="site-brand-mark">Dakibwa</a>
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
  const [hoveredPersonId, setHoveredPersonId] = useState<string | null>(null);

  useEffect(() => {
    const initial = readRoute();
    writeRoute(initial, 'replace');
    const onPop = () => setRoute(readRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const selectedPerson = getFamilyPersonById(route.personId) || familyPeople[0];
  const hoveredPerson = hoveredPersonId ? getFamilyPersonById(hoveredPersonId) : null;
  const previewPerson =
    hoveredPerson || (selectedPerson.id !== defaultPersonId || route.view === 'record' ? selectedPerson : null);

  useEffect(() => {
    document.title =
      route.view === 'record'
        ? `${selectedPerson.name} — Dakibwa`
        : 'Dakibwa — Family Tree';

    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute(
        'content',
        route.view === 'record'
          ? `${selectedPerson.name} — a careful family record within the Dakibwa tree.`
          : 'Dakibwa family tree. Hover-first records for the Atkinson and Nealon lines.'
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

        <SiteHeader label="Family tree" note={selectedPerson.name} />

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

      <SiteHeader label="Family tree" note="Hover to inspect. Click to pin." />

      <main id="main-content">
        <section className="tree-page">
          <div className="tree-page-head">
            <div>
              <p className="tree-page-label">Ancillary family page</p>
              <h1 className="tree-page-title">A quiet tree for the Atkinson and Nealon lines.</h1>
            </div>
            <p className="tree-page-copy">
              The site now starts with training. This page stays focused on the tree itself:
              hover to inspect, click to pin, and open a full record only when you want the extra context.
            </p>
          </div>

          <div className="tree-page-shell">
            <div className="tree-stage-card">
              <div className="tree-stage-topline">
                <div className="tree-stage-pills">
                  <span>Training-first home</span>
                  <span>Hover-first records</span>
                  <span>Living details kept minimal</span>
                </div>
                <p className="tree-stage-caption">Public additions stay out until they are clearly attributable.</p>
              </div>

              <FamilyTree
                people={familyPeople}
                selectedId={selectedPerson.id}
                hoveredId={hoveredPersonId}
                onSelect={handleSelect}
                onHover={setHoveredPersonId}
              />

              <TreePreview
                person={previewPerson}
                branches={familyBranches}
                isHovering={Boolean(hoveredPerson)}
                onSelect={handleSelect}
                onOpenRecord={openRecord}
              />
            </div>

            <p className="tree-page-research-note">
              Research pass on March 25, 2026: I checked public web indexes cautiously and did not add any new
              relatives without stronger documentary evidence.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>Dakibwa. Training first, with the family tree as a quiet secondary space.</p>
      </footer>
    </div>
  );
};

export default App;
