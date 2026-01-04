import React, { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import Scene from './components/Scene';
import PurposeBubbles from './components/PurposeBubbles';
import Contact from './components/Contact';
import Projects from './components/Projects';
import EssayView from './components/EssayView';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);

  useEffect(() => {
    // Trigger the fade-in effect after mount
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100); 

    return () => clearTimeout(timer);
  }, []);

  const handleNavigationSelect = (label: string) => {
    setActiveSection(label);
    // When changing main sections, close any open essay
    if (label !== 'PROJECTS') {
      setSelectedEssayId(null);
    }
  };

  const handleEssaySelect = (id: string) => {
    setSelectedEssayId(id);
  };

  const isContactActive = activeSection === 'CONTACT';
  const isProjectsActive = activeSection === 'PROJECTS';
  const isPurposeActive = activeSection === 'PURPOSE';

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans-serif selection:bg-[#E0607E] selection:text-white">
      {/* Global Fade In Wrapper */}
      <div 
        className={`
          relative w-full h-full transition-opacity duration-[2000ms] ease-out
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      >
        {/* --- FIXED UI LAYER (Z-50) --- */}
        <Navigation onSelect={handleNavigationSelect} />

        {/* Top Right Label - Hidden when essay is open for focus */}
        <div className={`fixed top-12 right-12 hidden md:block z-50 transition-opacity duration-500 ${selectedEssayId ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {/* Dr. Manhattan Light Blue: #D1FAFF (Icy Cyan) */}
          <div className="border border-[#64748b] px-6 py-4 bg-black/20 backdrop-blur-[2px] transition-all duration-300 hover:shadow-[0_0_25px_rgba(209,250,255,0.5)] hover:border-[#D1FAFF] cursor-default group">
             <span className="text-[10px] tracking-[0.25em] text-gray-300 group-hover:text-[#D1FAFF] transition-colors duration-300 uppercase font-medium">
               by Daniel Atkinson
             </span>
          </div>
        </div>

        {/* --- CONTACT LAYER (Z-0) --- */}
        <div className="absolute inset-0 w-full h-full z-0">
          <Contact />
        </div>

        {/* --- SCENE LAYER (Z-10) --- */}
        <div 
          className={`
            absolute inset-0 w-full h-full z-10 bg-black
            transition-transform duration-[1200ms] cubic-bezier(0.65, 0, 0.35, 1)
            ${isContactActive ? 'translate-y-full' : 'translate-y-0'}
          `}
        >
          <Scene />

          {/* Projects View: Always mounted to ensure CSS transitions trigger on first toggle */}
          <Projects isActive={isProjectsActive} onSelectEssay={handleEssaySelect} />

          {/* Purpose Bubbles Layer: Always mounted to allow for exit transitions */}
          <PurposeBubbles isActive={isPurposeActive} />
        </div>

        {/* --- ESSAY VIEW LAYER (Z-[100]) --- */}
        <div 
          className={`
            fixed inset-0 z-[100] transition-all duration-700 ease-in-out transform
            ${selectedEssayId ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'}
          `}
        >
          {selectedEssayId && (
            <EssayView onClose={() => setSelectedEssayId(null)} />
          )}
        </div>
      </div>
    </main>
  );
};

export default App;