import React, { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import Scene from './components/Scene';
import PurposeBubbles from './components/PurposeBubbles';
import Contact from './components/Contact';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    // Trigger the fade-in effect after mount
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100); 

    return () => clearTimeout(timer);
  }, []);

  const handleNavigationSelect = (label: string) => {
    setActiveSection(label);
  };

  const isContactActive = activeSection === 'CONTACT';

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

        {/* Top Right Label */}
        <div className="fixed top-12 right-12 hidden md:block z-50">
          {/* Dr. Manhattan Blue: #8EE3F4 / RGB(142, 227, 244) */}
          <div className="border border-[#64748b] px-6 py-4 bg-black/20 backdrop-blur-[2px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(142,227,244,0.6)] hover:border-[#8EE3F4] cursor-default group">
             <span className="text-[10px] tracking-[0.25em] text-gray-300 group-hover:text-[#8EE3F4] transition-colors duration-300 uppercase font-medium">
               by Daniel Atkinson
             </span>
          </div>
        </div>

        {/* --- CONTACT LAYER (Z-0) --- */}
        {/* Sky/Contact layer waits in the background */}
        <div className="absolute inset-0 w-full h-full z-0">
          <Contact />
        </div>

        {/* --- SCENE LAYER (Z-10) --- */}
        {/* Slides DOWN to simulate looking up into the sky */}
        <div 
          className={`
            absolute inset-0 w-full h-full z-10 bg-black
            transition-transform duration-[1200ms] cubic-bezier(0.65, 0, 0.35, 1)
            ${isContactActive ? 'translate-y-full' : 'translate-y-0'}
          `}
        >
          <Scene />

          {/* Purpose Bubbles Layer attached to the scene */}
          {activeSection === 'PURPOSE' && <PurposeBubbles />}
        </div>
      </div>
    </main>
  );
};

export default App;