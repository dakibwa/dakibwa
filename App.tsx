import React, { useEffect, useMemo, useState } from 'react';
import './src_styles.css';
import ArtistDetail from './components/ArtistDetail';
import ConstellationCanvas from './components/ConstellationCanvas';
import { buildConstellationGraph } from './lib/constellation';
import { fetchListeningSnapshot } from './lib/lastfm';
import type { ListeningSnapshot } from './types';

const DEFAULT_USERNAME = 'akibwa';

const App: React.FC = () => {
  const [snapshot, setSnapshot] = useState<ListeningSnapshot | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    document.title = 'Dakibwa — a music constellation';
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        'Dakibwa is a music constellation: a Last.fm-first portrait of Daniel Atkinson’s listening world, arranged like a small night sky.'
      );
    }

    fetchListeningSnapshot(DEFAULT_USERNAME).then((nextSnapshot) => {
      setSnapshot(nextSnapshot);
      setSelectedId(nextSnapshot.artists[0]?.name || '');
    });
  }, []);

  const graph = useMemo(() => (snapshot ? buildConstellationGraph(snapshot) : null), [snapshot]);
  const selectedArtist = snapshot?.artists.find((artist) => artist.name === selectedId) || snapshot?.artists[0] || null;

  if (!snapshot || !graph || !selectedArtist) {
    return (
      <div className="loading-wrap">
        <div className="loading-card shell-card">
          <div className="loading-pulse" />
          <h1>Charting the sky…</h1>
          <p className="data-note">Pulling together a few years of listening drift, favourites, and bridge artists.</p>
        </div>
      </div>
    );
  }

  const clusterSummary = Array.from(new Set(snapshot.artists.map((artist) => `${artist.clusterLabel}|${artist.color}`))).map((entry) => {
    const [label, color] = entry.split('|');
    return { label, color };
  });

  const strongestArtist = [...snapshot.artists].sort((left, right) => right.playcount - left.playcount)[0];
  const bridgeArtist = snapshot.artists.find((artist) => artist.similar.length >= 3) || strongestArtist;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <main id="main-content">
        <section className="hero shell-card">
          <div>
            <div className="eyebrow">Dakibwa / listening cosmos</div>
            <h1>A small night sky built from real listening.</h1>
            <p className="hero-copy">
              This is Daniel Atkinson&apos;s taste map: less portfolio, more constellation. Last.fm provides the signal; the interface turns it into something you can drift through — reflective electronics, strange songwriters, foggy guitars, and left-field rap, all in relation.
            </p>

            <div className="hero-actions">
              <a className="pill primary" href="#constellation">Enter the constellation</a>
              <a className="pill" href="https://www.last.fm/user/akibwa" target="_blank" rel="noreferrer">Open Last.fm profile</a>
            </div>

            <p className="hero-note">
              {snapshot.source === 'lastfm'
                ? `Live from Last.fm for ${snapshot.username}.`
                : 'Using an embedded taste snapshot while Last.fm credentials are missing or resting.'}
            </p>
          </div>

          <div className="hero-side">
            <div className="meta-pill">
              <span className="meta-label">Primary source</span>
              <div className="meta-value">Last.fm scrobbles, artist tags, top releases</div>
            </div>
            <div className="meta-pill">
              <span className="meta-label">Current north stars</span>
              <div className="meta-value">Jon Hopkins, Cameron Winter, Geese, DJ Koze, Nala Sinephro</div>
            </div>
            <div className="meta-pill">
              <span className="meta-label">Method</span>
              <div className="meta-value">Real listening data first, editorial interpretation second.</div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="stats-grid">
            <div className="stat-card">
              <small>Artists mapped</small>
              <strong>{snapshot.artists.length}</strong>
              <span className="card-copy">enough detail to show shape, not so much that it turns into sludge</span>
            </div>
            <div className="stat-card">
              <small>Constellation links</small>
              <strong>{graph.links.length}</strong>
              <span className="card-copy">a mix of neighbour lines, similarity, and a few deliberate bridges</span>
            </div>
            <div className="stat-card">
              <small>Brightest object</small>
              <strong>{strongestArtist.name}</strong>
              <span className="card-copy">currently the densest recurring signal in the field</span>
            </div>
            <div className="stat-card">
              <small>Bridge artist</small>
              <strong>{bridgeArtist.name}</strong>
              <span className="card-copy">one of the names helping separate regions speak to each other</span>
            </div>
          </div>
        </section>

        <section className="section" id="constellation">
          <div className="section-header">
            <div>
              <h2>The constellation</h2>
              <p>Click a star to inspect it. The colours are moods of gravity, not strict genres.</p>
            </div>
          </div>

          <div className="constellation-layout">
            <div className="canvas-card shell-card">
              <ConstellationCanvas graph={graph} selectedId={selectedArtist.name} onSelect={setSelectedId} />
              <div className="legend">
                {clusterSummary.map((cluster) => (
                  <div className="legend-item" key={cluster.label}>
                    <span className="swatch" style={{ color: cluster.color, background: cluster.color }} />
                    {cluster.label}
                  </div>
                ))}
              </div>
            </div>

            <ArtistDetail artist={selectedArtist} snapshot={snapshot} />
          </div>
        </section>

        <section className="section listening-grid">
          <div className="albums-panel shell-card">
            <div className="section-header">
              <div>
                <h3>Listening ledger</h3>
                <p>A few anchor releases sitting underneath the map.</p>
              </div>
            </div>
            {snapshot.albums.length ? snapshot.albums.map((album) => (
              <div className="album-card" key={`${album.artist}-${album.name}`}>
                <strong>{album.name}</strong>
                <small>{album.artist} · {album.playcount.toLocaleString()} plays</small>
              </div>
            )) : <div className="empty-note">No album data came back from Last.fm just yet.</div>}
          </div>

          <div className="insights-panel shell-card">
            <div className="section-header">
              <div>
                <h3>Reading the sky</h3>
                <p>What the current graph is trying to say.</p>
              </div>
            </div>
            <div className="insight-card">
              <strong>Pulse → Drift</strong>
              <small>Electronic work in this orbit tends to blur into meditation rather than pure functionality.</small>
            </div>
            <div className="insight-card">
              <strong>Hearth</strong>
              <small>Songwriters and bands arrive when the texture needs to stay human, messy, or embodied.</small>
            </div>
            <div className="insight-card">
              <strong>Veil</strong>
              <small>Rap and nocturnal pop arrive as contour: sharper edges, stronger silhouettes, less haze.</small>
            </div>
          </div>
        </section>

        <p className="footer-note">
          Built as a Last.fm-first portrait rather than a generic media dashboard. Quietly alive, easy to read, and ready to grow.
        </p>
      </main>
    </div>
  );
};

export default App;
