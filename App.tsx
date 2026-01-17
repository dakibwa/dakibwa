import React, { useState } from 'react';
import Navigation from './components/Navigation';
import Creation from './components/Projects';
import Contact from './components/Contact';
import Consumption from './components/Consumption';
import Consciousness from './components/Consciousness';
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
          <div className="max-w-2xl space-y-12">
            <p className="text-xl md:text-2xl leading-relaxed font-light">
              This is a place I made to nudge my life toward{' '}
              <button
                onClick={() => handleNavigationSelect('CREATION')}
                className="illuminated-text"
              >
                Creation
              </button>
              , as a counterweight to constant{' '}
              <button
                onClick={() => handleNavigationSelect('CONSUMPTION')}
                className="illuminated-text"
              >
                Consumption
              </button>
              . An attempt at materialising things in this world, and sharing my{' '}
              <button
                onClick={() => handleNavigationSelect('CONSCIOUSNESS')}
                className="illuminated-text"
              >
                Consciousness
              </button>
              . If you see anything you like, get in{' '}
              <button
                onClick={() => handleNavigationSelect('CONTACT')}
                className="illuminated-text"
              >
                Contact
              </button>
              .
            </p>

            <blockquote className="border-l-2 border-[#e0e0e0] dark:border-[#333] pl-6">
              <p className="text-[#666] dark:text-[#999] italic">
                "I respect anyone who gives more in this world than takes"
              </p>
              <cite className="text-sm text-[#999] dark:text-[#666] mt-2 block">
                — Elon Musk
              </cite>
            </blockquote>

            <style>{`
              .illuminated-text {
                position: relative;
                font-weight: 500;
                background: linear-gradient(135deg, #1a1a1a 0%, #444 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                transition: all 0.3s ease;
                cursor: pointer;
                border: none;
                padding: 0;
                font-size: inherit;
                font-family: inherit;
              }
              
              .dark .illuminated-text {
                background: linear-gradient(135deg, #fff 0%, #ccc 50%, #fff 100%);
                -webkit-background-clip: text;
                background-clip: text;
                text-shadow: 0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.1);
              }
              
              .illuminated-text::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                width: 100%;
                height: 1px;
                background: linear-gradient(90deg, transparent, currentColor, transparent);
                opacity: 0.5;
              }
              
              .illuminated-text:hover {
                text-shadow: 0 0 30px rgba(0,0,0,0.2);
              }
              
              .dark .illuminated-text:hover {
                text-shadow: 0 0 30px rgba(255,255,255,0.5), 0 0 60px rgba(255,255,255,0.2);
              }
            `}</style>
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