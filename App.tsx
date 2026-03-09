import React, { Suspense, lazy, useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import Consumption from './components/Consumption';

const SoundMind = lazy(() => import('./components/SoundMind'));

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
    document.title = isMusicOpen ? 'Akibwa | Music Map' : 'Akibwa | Consumption';

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        isMusicOpen
          ? 'A constellation of listening history and artist connections.'
          : 'A gallery of what Daniel Atkinson has been listening to and watching.'
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
        <header className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a8378] dark:text-[#8f8575]">
            Consumption
          </p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-[#1c1a16] dark:text-[#ece3d0] md:text-6xl">
            A gallery of what I&apos;ve been listening to and watching.
          </h1>
          <p className="mt-5 text-base leading-7 text-[#696257] dark:text-[#a89d88] md:text-lg">
            Albums rise with repeat listens. Films sit alongside them. Everything else is cut away.
          </p>
          <div className="mt-6">
            <button
              onClick={showMusic}
              className="text-sm text-[#205c5a] transition-colors hover:text-[#163f3d] dark:text-[#79b7ab] dark:hover:text-[#9fd0c6]"
            >
              Open Music Map
            </button>
          </div>
        </header>

        <section className="mt-12">
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
