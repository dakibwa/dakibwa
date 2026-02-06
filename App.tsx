import React, { Suspense, lazy, useState } from 'react';
import Navigation from './components/Navigation';
import Creation from './components/Projects';
import Contact from './components/Contact';
import Consumption from './components/Consumption';
import Consciousness from './components/Consciousness';
import EssayView from './components/EssayView';

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

  return (
    <div className="min-h-screen text-[#1c1a17] dark:text-[#e8e2d6] transition-colors duration-300">
      <Navigation onSelect={handleNavigationSelect} activeSection={activeSection} />
      
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <section key={activeSection || 'home'} className="animate-[fadeIn_.35s_ease-out]">
        {activeSection === '' && (
          <div className="max-w-2xl space-y-10">
            <p className="text-xl md:text-2xl leading-relaxed font-light">
              A place I made to nudge my actions towards{' '}
              <button
                onClick={() => handleNavigationSelect('CREATION')}
                className="font-semibold text-[#1c1a17] dark:text-[#f0eadf] hover:text-[#2a5b53] dark:hover:text-[#7ab2a8] transition-colors cursor-pointer bg-transparent border-none p-0 text-inherit"
              >
                Creation
              </button>
              , acting as a counterweight to{' '}
              <button
                onClick={() => handleNavigationSelect('CONSUMPTION')}
                className="font-semibold text-[#1c1a17] dark:text-[#f0eadf] hover:text-[#2a5b53] dark:hover:text-[#7ab2a8] transition-colors cursor-pointer bg-transparent border-none p-0 text-inherit"
              >
                Consumption
              </button>
              {' '}and a general attempt to materialise things in this world. Open sourcing a slither of my{' '}
              <button
                onClick={() => handleNavigationSelect('CONSCIOUSNESS')}
                className="font-semibold text-[#1c1a17] dark:text-[#f0eadf] hover:text-[#2a5b53] dark:hover:text-[#7ab2a8] transition-colors cursor-pointer bg-transparent border-none p-0 text-inherit"
              >
                Consciousness
              </button>
              , if you see anything you like, get in{' '}
              <button
                onClick={() => handleNavigationSelect('CONTACT')}
                className="font-semibold text-[#1c1a17] dark:text-[#f0eadf] hover:text-[#2a5b53] dark:hover:text-[#7ab2a8] transition-colors cursor-pointer bg-transparent border-none p-0 text-inherit"
              >
                Contact
              </button>
              .
            </p>

            <blockquote className="border-l border-[#d8d3c8] dark:border-[#35312a] pl-6">
              <p className="text-lg md:text-xl text-[#6a655d] dark:text-[#a49a88] italic leading-relaxed">
                "To leave the world a bit better… to know even one life has breathed easier because you have lived…"
              </p>
              <cite className="text-base text-[#8a8378] dark:text-[#8f8575] mt-3 block">
                — Bessie Anderson Stanley (1911)
              </cite>
            </blockquote>

          </div>
        )}

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
