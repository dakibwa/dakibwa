import React, { Suspense, lazy, useState } from 'react';
import Navigation from './components/Navigation';
import Creation from './components/Projects';
import Contact from './components/Contact';
import Consumption from './components/Consumption';
import Consciousness from './components/Consciousness';
import EssayView from './components/EssayView';
import LocationCard from './components/LocationCard';

const SoundMind = lazy(() => import('./components/SoundMind'));

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('');
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);

  const handleNavigationSelect = (label: string) => {
    setActiveSection(label === activeSection ? '' : label);
    if (label !== 'CREATION') {
      setSelectedEssayId(null);
      setActiveAppId(null);
    }
  };

  const handleEssaySelect = (id: string) => {
    setSelectedEssayId(id);
  };

  const handleAppLaunch = (id: string) => {
    setActiveAppId(id);
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'CREATION':
        return 'Creation';
      case 'CONSUMPTION':
        return 'Consumption';
      case 'CONSCIOUSNESS':
        return 'Consciousness';
      case 'CONTACT':
        return 'Contact';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen text-[#1c1a17] dark:text-[#e8e2d6] transition-colors duration-300">
      <Navigation onSelect={handleNavigationSelect} activeSection={activeSection} />
      
      <main className="max-w-5xl mx-auto px-5 md:px-7 py-10 md:py-14">
        <section key={activeSection || 'home'} className="animate-[fadeIn_.35s_ease-out]">
        {activeSection === '' && (
          <div className="space-y-8 md:space-y-10">
            <div className="surface-panel rounded-2xl p-6 md:p-10 space-y-7 shadow-[0_24px_50px_rgba(18,14,8,0.06)] dark:shadow-[0_24px_50px_rgba(0,0,0,0.28)]">
              <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-[1.05] text-[#1c1a16] dark:text-[#ece3d0]">
                A digital notebook for making things.
              </h1>
              <p className="text-lg md:text-xl leading-relaxed max-w-3xl text-[#696257] dark:text-[#a89d88]">
                A place I made to nudge my actions towards creation, acting as a counterweight to consumption, and a public slither of consciousness.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <blockquote className="surface-panel rounded-2xl p-6 md:p-7 border-l-4 border-l-[#205c5a] dark:border-l-[#79b7ab]">
                <p className="text-lg md:text-xl text-[#696257] dark:text-[#a89d88] italic leading-relaxed">
                  "To leave the world a bit better… to know even one life has breathed easier because you have lived…"
                </p>
                <cite className="text-sm uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575] mt-4 block">
                  — Bessie Anderson Stanley (1911)
                </cite>
              </blockquote>

              <LocationCard />
            </div>
          </div>
        )}

        {activeSection !== '' && (
          <div className="surface-panel rounded-2xl p-5 md:p-8 space-y-6 md:space-y-8 shadow-[0_14px_36px_rgba(18,14,8,0.06)] dark:shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
            <header className="flex items-center justify-between border-b border-[#d8cfbe] dark:border-[#342f25] pb-4">
              <h2 className="font-display text-3xl md:text-4xl tracking-tight">{getSectionTitle()}</h2>
              <button
                onClick={() => setActiveSection('')}
                className="text-sm uppercase tracking-[0.12em] text-[#696257] dark:text-[#a89d88] hover:text-[#205c5a] dark:hover:text-[#79b7ab] transition-colors"
              >
                Home
              </button>
            </header>

            {activeSection === 'CREATION' && (
              <Creation 
                isActive={true} 
                onSelectEssay={handleEssaySelect} 
                onLaunchApp={handleAppLaunch}
              />
            )}

            {activeSection === 'CONSUMPTION' && (
              <Consumption />
            )}

            {activeSection === 'CONTACT' && (
              <Contact />
            )}

            {activeSection === 'CONSCIOUSNESS' && (
              <Consciousness />
            )}
          </div>
        )}
        </section>
      </main>

      {/* Essay View */}
      <EssayView 
        isOpen={!!selectedEssayId} 
        onClose={() => setSelectedEssayId(null)} 
      />

      {/* SoundMind App */}
      <Suspense fallback={null}>
        <SoundMind
          isOpen={activeAppId === 'sound-mind'}
          onClose={() => setActiveAppId(null)}
        />
      </Suspense>
    </div>
  );
};

export default App;
