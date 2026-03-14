import React, { Suspense, lazy, useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import Consumption from './components/Consumption';

const SoundMind = lazy(() => import('./components/SoundMind'));

const constellationSignals = [
  {
    label: 'Real listening history',
    description: 'Built from repeat listening rather than a vague mood board of favorite things.',
  },
  {
    label: 'Clusters and bridges',
    description: 'Artists should gather into scenes, then reveal the strange paths between them.',
  },
  {
    label: 'Taste, not admin',
    description: 'The goal is an atmospheric portrait of music taste, not a dashboard pretending to be art.',
  },
];

const MUSIC_HASH = '#music';

const isMusicHash = (hash: string) => hash.startsWith(MUSIC_HASH) || hash.includes('access_token');

const replaceHash = (hash: string) => {
  if (typeof window === 'undefined') return;
  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
  window.history.replaceState(null, '', nextUrl);
};

const App: React.FC = () => {
  const [isMusicOpen, setIsMusicOpen] = useState(() =>
    typeof window !== 'undefined' ? isMusicHash(window.location.hash) : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const syncWithHash = () => {
      setIsMusicOpen(isMusicHash(window.location.hash));
    };

    window.addEventListener('hashchange', syncWithHash);
    return () => window.removeEventListener('hashchange', syncWithHash);
  }, []);

  useEffect(() => {
    document.title = isMusicOpen ? 'Akibwa | Music Constellation' : 'Akibwa | Listening Atlas';

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        isMusicOpen
          ? 'A constellation of listening history, artist clusters, and inferred musical relationships.'
          : 'A music-first atlas of listening taste, built from real listening history and shaped into a constellation.'
      );
    }
  }, [isMusicOpen]);

  const showGallery = () => {
    setIsMusicOpen(false);
    replaceHash('#gallery');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showMusic = () => {
    setIsMusicOpen(true);
    replaceHash(MUSIC_HASH);
  };

  return (
    <div className="min-h-screen">
      <Navigation onShowGallery={showGallery} onOpenMusic={showMusic} isMusicOpen={isMusicOpen} />

      <main id="main-content" className="mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-7 md:pt-14">
        <section className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(21rem,0.95fr)] xl:items-start">
          <header className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a8378] dark:text-[#8f8575]">
              Listening Atlas
            </p>
            <h1 className="mt-4 font-display text-4xl tracking-tight text-[#1c1a16] dark:text-[#ece3d0] md:text-6xl">
              A living constellation of music taste.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#696257] dark:text-[#a89d88] md:text-lg">
              Dakibwa is evolving into a music-first map of listening history — artists pulled into clusters, bridge figures glowing between scenes, and a visual language that feels closer to a night sky than a dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={showMusic}
                className="rounded-full bg-[#1d262f] px-4 py-2 text-sm text-[#f5f3ec] transition-colors hover:bg-[#111820] dark:bg-[#ece3d0] dark:text-[#111620] dark:hover:bg-[#f6eedf]"
              >
                Open the constellation
              </button>
              <button
                onClick={showGallery}
                className="text-sm text-[#696257] transition-colors hover:text-[#1c1a16] dark:text-[#a89d88] dark:hover:text-[#ece3d0]"
              >
                View the listening library
              </button>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {constellationSignals.map((signal) => (
                <div key={signal.label} className="rounded-[1.4rem] border border-[#d8cfbe] bg-[#fbf8f2] p-4 dark:border-[#312b23] dark:bg-[#181611]">
                  <p className="text-sm font-medium text-[#1c1a16] dark:text-[#ece3d0]">{signal.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[#696257] dark:text-[#a89d88]">{signal.description}</p>
                </div>
              ))}
            </div>
          </header>

          <aside className="overflow-hidden rounded-[2rem] border border-[#d8cfbe] bg-[#08111d] p-6 text-[#e7edf8] shadow-[0_28px_90px_rgba(7,17,31,0.28)] dark:border-[#2e2921]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#8ea4c9]">Constellation preview</p>
            <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_34%),radial-gradient(circle_at_70%_30%,_rgba(45,212,191,0.18),_transparent_30%),linear-gradient(180deg,_rgba(7,17,31,0.92),_rgba(6,11,21,0.98))] p-5">
              <div className="grid grid-cols-3 gap-4 text-center text-sm text-[#b7c3d8]">
                <div>
                  <p className="text-2xl text-[#f6f8ff]">50</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#8ea4c9]">artists</p>
                </div>
                <div>
                  <p className="text-2xl text-[#f6f8ff]">7</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#8ea4c9]">zones</p>
                </div>
                <div>
                  <p className="text-2xl text-[#f6f8ff]">∞</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#8ea4c9]">bridges</p>
                </div>
              </div>

              <div className="relative mt-8 h-64 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#050a14]">
                <div className="absolute inset-0 opacity-70" aria-hidden="true">
                  <div className="absolute left-[14%] top-[28%] h-3 w-3 rounded-full bg-[#7dd3fc] shadow-[0_0_22px_rgba(125,211,252,0.85)]" />
                  <div className="absolute left-[28%] top-[44%] h-2.5 w-2.5 rounded-full bg-[#c4b5fd] shadow-[0_0_18px_rgba(196,181,253,0.8)]" />
                  <div className="absolute left-[44%] top-[20%] h-4 w-4 rounded-full bg-[#5eead4] shadow-[0_0_24px_rgba(94,234,212,0.9)]" />
                  <div className="absolute left-[56%] top-[50%] h-3 w-3 rounded-full bg-[#fde68a] shadow-[0_0_20px_rgba(253,230,138,0.9)]" />
                  <div className="absolute left-[68%] top-[32%] h-2.5 w-2.5 rounded-full bg-[#f9a8d4] shadow-[0_0_18px_rgba(249,168,212,0.8)]" />
                  <div className="absolute left-[78%] top-[62%] h-3 w-3 rounded-full bg-[#93c5fd] shadow-[0_0_18px_rgba(147,197,253,0.8)]" />

                  <div className="absolute left-[16%] top-[30%] h-px w-[18%] rotate-[18deg] bg-gradient-to-r from-white/0 via-white/40 to-white/0" />
                  <div className="absolute left-[30%] top-[41%] h-px w-[22%] -rotate-[16deg] bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
                  <div className="absolute left-[48%] top-[30%] h-px w-[17%] rotate-[20deg] bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
                  <div className="absolute left-[58%] top-[50%] h-px w-[20%] rotate-[12deg] bg-gradient-to-r from-white/0 via-white/30 to-white/0" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-display text-2xl text-[#f6f8ff]">From repeat listening to a sky map</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#b7c3d8]">
                    The ambition is simple: turn raw listening history into something atmospheric, inspectable, and emotionally legible.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-16">
          <Consumption />
        </section>
      </main>

      <Suspense fallback={null}>
        <SoundMind isOpen={isMusicOpen} onClose={showGallery} />
      </Suspense>
    </div>
  );
};

export default App;
