import React, { useState } from 'react';
import Navigation from './components/Navigation';
import Creation from './components/Projects';
import Contact from './components/Contact';
import Consumption from './components/Consumption';
import EssayView from './components/EssayView';
import SoundMind from './components/SoundMind';

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
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-[#e0e0e0] transition-colors">
      <Navigation onSelect={handleNavigationSelect} activeSection={activeSection} />
      
      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        {activeSection === '' && (
          <nav className="space-y-2">
            <button
              onClick={() => handleNavigationSelect('CREATION')}
              className="block text-left w-full py-3 hover:opacity-60 transition-opacity"
            >
              <span className="text-xl">Creation</span>
            </button>

            <button
              onClick={() => handleNavigationSelect('CONSUMPTION')}
              className="block text-left w-full py-3 hover:opacity-60 transition-opacity"
            >
              <span className="text-xl">Consumption</span>
            </button>

            <button
              onClick={() => handleNavigationSelect('CONTACT')}
              className="block text-left w-full py-3 hover:opacity-60 transition-opacity"
            >
              <span className="text-xl">Contact</span>
            </button>
          </nav>
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
      </main>

      {/* Essay View */}
      <EssayView 
        isOpen={!!selectedEssayId} 
        onClose={() => setSelectedEssayId(null)} 
      />

      {/* SoundMind App */}
      <SoundMind
        isOpen={activeAppId === 'sound-mind'}
        onClose={() => setActiveAppId(null)}
      />
    </div>
  );
};

export default App;