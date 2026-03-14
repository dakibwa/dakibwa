import React, { Suspense, lazy, useEffect } from 'react';
import Navigation from './components/Navigation';
import Consumption from './components/Consumption';

const SoundMind = lazy(() => import('./components/SoundMind'));

const App: React.FC = () => {
  useEffect(() => {
    document.title = 'Akibwa | Music Constellation';

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        'content',
        'A music-first constellation built from listening history, with the interactive map up front and the listening archive underneath.'
      );
    }
  }, []);

  const jumpToLibrary = () => {
    document.getElementById('listening-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const jumpToConstellation = () => {
    document.getElementById('constellation-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen">
      <Navigation onShowGallery={jumpToLibrary} onOpenMusic={jumpToConstellation} isMusicOpen={true} />

      <main id="main-content" className="mx-auto max-w-7xl px-5 pb-20 pt-10 md:px-7 md:pt-14">
        <section className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a8378] dark:text-[#8f8575]">
            Music constellation
          </p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-[#1c1a16] dark:text-[#ece3d0] md:text-6xl">
            A sky map built from what actually stays in rotation.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#696257] dark:text-[#a89d88] md:text-lg">
            The top half should feel alive and exploratory — clusters, bridges, dominant scenes, and the artists that hold gravity. Underneath that sits the comprehensive Last.fm listening record that gives the whole thing weight.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={jumpToConstellation}
              className="rounded-full bg-[#1d262f] px-4 py-2 text-sm text-[#f5f3ec] transition-colors hover:bg-[#111820] dark:bg-[#ece3d0] dark:text-[#111620] dark:hover:bg-[#f6eedf]"
            >
              Explore the constellation
            </button>
            <button
              onClick={jumpToLibrary}
              className="text-sm text-[#696257] transition-colors hover:text-[#1c1a16] dark:text-[#a89d88] dark:hover:text-[#ece3d0]"
            >
              Jump to listening history
            </button>
          </div>
        </section>

        <section id="constellation-section" className="mt-10">
          <Suspense fallback={null}>
            <SoundMind isOpen={true} onClose={() => {}} embedded />
          </Suspense>
        </section>

        <section id="listening-library" className="mt-16">
          <Consumption />
        </section>
      </main>
    </div>
  );
};

export default App;
