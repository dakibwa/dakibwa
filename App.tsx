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
          <div className="space-y-12">
            {/* Hero Section */}
            <header className="space-y-6">
              <p className="text-xl md:text-2xl text-[#666] dark:text-[#999] leading-relaxed max-w-2xl">
                Me trying to materialise something in the world.
              </p>
            </header>

            {/* Quick Links */}
            <nav className="space-y-4 pt-8">
              <button
                onClick={() => handleNavigationSelect('CREATION')}
                className="block text-left w-full py-4 border-b border-[#e0e0e0] dark:border-[#333] hover:border-[#1a1a1a] dark:hover:border-[#e0e0e0] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-normal group-hover:text-[#1a1a1a] dark:group-hover:text-[#fff] transition-colors">
                      Creation
                    </h2>
                    <p className="text-sm text-[#666] dark:text-[#999] mt-1">
                      Essays and applications
                    </p>
                  </div>
                  <span className="text-[#999] dark:text-[#666] group-hover:text-[#1a1a1a] dark:group-hover:text-[#e0e0e0]">→</span>
                </div>
              </button>

              <button
                onClick={() => handleNavigationSelect('CONSUMPTION')}
                className="block text-left w-full py-4 border-b border-[#e0e0e0] dark:border-[#333] hover:border-[#1a1a1a] dark:hover:border-[#e0e0e0] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-normal group-hover:text-[#1a1a1a] dark:group-hover:text-[#fff] transition-colors">
                      Consumption
                    </h2>
                    <p className="text-sm text-[#666] dark:text-[#999] mt-1">
                      Media consumed and documented
                    </p>
                  </div>
                  <span className="text-[#999] dark:text-[#666] group-hover:text-[#1a1a1a] dark:group-hover:text-[#e0e0e0]">→</span>
                </div>
              </button>

              <button
                onClick={() => handleNavigationSelect('CONTACT')}
                className="block text-left w-full py-4 border-b border-[#e0e0e0] dark:border-[#333] hover:border-[#1a1a1a] dark:hover:border-[#e0e0e0] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-normal group-hover:text-[#1a1a1a] dark:group-hover:text-[#fff] transition-colors">
                      Contact
                    </h2>
                    <p className="text-sm text-[#666] dark:text-[#999] mt-1">
                      Get in touch
                    </p>
                  </div>
                  <span className="text-[#999] dark:text-[#666] group-hover:text-[#1a1a1a] dark:group-hover:text-[#e0e0e0]">→</span>
                </div>
              </button>
            </nav>

            {/* Optional: Subtle background image reference */}
            <div className="pt-16 mt-16 border-t border-[#e0e0e0] dark:border-[#333]">
              <p className="text-sm text-[#999] dark:text-[#666] italic">
                "The camera lens reframes our private existence into a public performance."
              </p>
            </div>
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