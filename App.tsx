import React, { useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import Scene from './components/Scene';
import PurposeBubbles from './components/PurposeBubbles';
import Contact from './components/Contact';
import Projects from './components/Projects';
import EssayView from './components/EssayView';
import SoundMind from './components/SoundMind';
import { BACKGROUND_IMAGE_URL } from './constants';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);

  useEffect(() => {
    // Preload the heavy background image to ensure smooth entry
    const img = new Image();
    img.src = BACKGROUND_IMAGE_URL;
    
    const handleLoad = () => {
       // Small delay to ensure render cycle is complete and prevent frame drop on start
       requestAnimationFrame(() => setIsLoaded(true));
    };

    if (img.complete) {
      handleLoad();
    } else {
      img.onload = handleLoad;
      img.onerror = handleLoad; // Fail gracefully by showing the app anyway
    }

    // Safety fallback: if image takes too long, show app anyway after 3s
    const safetyTimer = setTimeout(() => setIsLoaded(true), 3000);

    return () => {
      img.onload = null;
      img.onerror = null;
      clearTimeout(safetyTimer);
    };
  }, []);

  const handleNavigationSelect = (label: string) => {
    setActiveSection(label);
    // When changing main sections, close any open essay or app
    if (label !== 'PROJECTS') {
      setSelectedEssayId(null);
      setActiveAppId(null);
    }
  };

  const handleEssaySelect = (id: string) => {
    setSelectedEssayId(id);
  };

  const handleAppLaunch = (id: string) => {
    setActiveAppId(id);
  }

  const handleBackgroundClick = () => {
    if (activeSection !== '') {
      handleNavigationSelect('');
    }
  };

  const isContactActive = activeSection === 'CONTACT';
  const isProjectsActive = activeSection === 'PROJECTS';
  const isPurposeActive = activeSection === 'PURPOSE';

  // Determine if we should hide the top right label
  const isFocusMode = !!selectedEssayId || !!activeAppId;

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black text-white font-sans-serif selection:bg-[#E0607E] selection:text-white">
      
      {/* --- FILM GRAIN OVERLAY --- */}
      {/* Creates a subtle texture over everything, giving it a cinematic/retro feel */}
      <div className="fixed inset-0 pointer-events-none z-[200] opacity-[0.03] mix-blend-overlay">
         <svg className='w-full h-full'>
            <filter id='noiseFilter'>
                <feTurbulence 
                  type='fractalNoise' 
                  baseFrequency='0.8' 
                  numOctaves='3' 
                  stitchTiles='stitch'
                />
            </filter>
            <rect width='100%' height='100%' filter='url(#noiseFilter)'/>
         </svg>
      </div>

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
        <div className={`fixed top-12 right-12 hidden md:block z-50 transition-opacity duration-500 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {/* Dr. Manhattan Light Blue: #D1FAFF (Icy Cyan) */}
          <div className="border border-[#64748b] px-6 py-4 bg-black/20 backdrop-blur-[2px] transition-all duration-300 hover:shadow-[0_0_25px_rgba(209,250,255,0.5)] hover:border-[#D1FAFF] cursor-default group">
             <span className="text-[10px] tracking-[0.25em] text-gray-300 group-hover:text-[#D1FAFF] transition-colors duration-300 uppercase font-medium">
               by Daniel Atkinson
             </span>
          </div>
        </div>

        {/* --- CONTACT LAYER (Z-0) --- */}
        <div 
          className="absolute inset-0 w-full h-full z-0 cursor-pointer" 
          onClick={handleBackgroundClick}
        >
          <Contact />
        </div>

        {/* --- SCENE LAYER (Z-10) --- */}
        <div 
          className={`
            absolute inset-0 w-full h-full z-10 bg-black
            transition-transform duration-[1200ms] cubic-bezier(0.65, 0, 0.35, 1)
            ${isContactActive ? 'translate-y-full' : 'translate-y-0'}
          `}
          onClick={handleBackgroundClick}
        >
          {/* Memoized Scene to prevent re-renders on UI state changes */}
          <Scene />

          {/* Projects View: Always mounted to ensure CSS transitions trigger on first toggle */}
          <Projects 
            isActive={isProjectsActive} 
            onSelectEssay={handleEssaySelect} 
            onLaunchApp={handleAppLaunch}
          />

          {/* Purpose Bubbles Layer: Always mounted to allow for exit transitions */}
          <PurposeBubbles isActive={isPurposeActive} />
        </div>

        {/* --- ESSAY VIEW LAYER (Z-[100]) --- */}
        <EssayView 
          isOpen={!!selectedEssayId} 
          onClose={() => setSelectedEssayId(null)} 
        />

        {/* --- SOUNDMIND APP LAYER (Z-[100]) --- */}
        <SoundMind
          isOpen={activeAppId === 'sound-mind'}
          onClose={() => setActiveAppId(null)}
        />
      </div>
    </main>
  );
};

export default App;