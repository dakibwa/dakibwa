import React, { Suspense, lazy, useEffect } from 'react';
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

  return (
    <div className="min-h-screen">
      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-16 pt-4 md:px-6 md:pt-6">
        <section id="constellation-section">
          <Suspense fallback={null}>
            <SoundMind isOpen={true} onClose={() => {}} embedded />
          </Suspense>
        </section>

        <section id="listening-library" className="mt-10">
          <Consumption />
        </section>
      </main>
    </div>
  );
};

export default App;
