import React, { Suspense, lazy, useEffect, useState } from 'react';
import Navigation from './components/Navigation';
import Creation from './components/Projects';
import Contact from './components/Contact';
import Consumption from './components/Consumption';
import Consciousness from './components/Consciousness';
import EssayView from './components/EssayView';
import LocationCard from './components/LocationCard';

const SoundMind = lazy(() => import('./components/SoundMind'));

type ContentSection = 'CREATION' | 'CONSUMPTION' | 'CONSCIOUSNESS' | 'CONTACT';
type SectionId = '' | ContentSection;

interface SectionMeta {
  title: string;
  eyebrow: string;
  homeDescription: string;
  longDescription: string;
  stat: string;
  cta: string;
  hash: string;
}

const SECTION_ORDER: ContentSection[] = ['CREATION', 'CONSUMPTION', 'CONSCIOUSNESS', 'CONTACT'];

const SECTION_META: Record<ContentSection, SectionMeta> = {
  CREATION: {
    title: 'Creation',
    eyebrow: 'Essays and music',
    homeDescription: 'Writing and a small music application built to externalise useful ideas.',
    longDescription: 'The music map and the small amount of writing that has made it into public view.',
    stat: 'Music map · essay draft',
    cta: 'Open creation',
    hash: '#creation',
  },
  CONSUMPTION: {
    title: 'Consumption',
    eyebrow: 'Albums, books, films',
    homeDescription: 'A ranked shelf of the work that has shaped me across listening, reading, and watching.',
    longDescription: 'A living record pulled from Last.fm, Goodreads, and Letterboxd so the influences behind the work stay visible.',
    stat: 'Connected media history',
    cta: 'Browse consumption',
    hash: '#consumption',
  },
  CONSCIOUSNESS: {
    title: 'Consciousness',
    eyebrow: 'Questions and fragments',
    homeDescription: 'Notes that sit closer to the thinking process than the finished output.',
    longDescription: 'The inner notebook: themes, tensions, and reflections that are still being worked through before they settle into essays.',
    stat: 'Notebook taking shape',
    cta: 'Enter consciousness',
    hash: '#consciousness',
  },
  CONTACT: {
    title: 'Contact',
    eyebrow: 'Conversation and collaboration',
    homeDescription: 'The direct route if you want to talk, build, or share something worth exploring.',
    longDescription: 'If there is a project, role, idea, or conversation worth having, this section is designed to make reaching out simple.',
    stat: 'Email is best',
    cta: 'Get in touch',
    hash: '#contact',
  },
};

const getSectionFromHash = (hash: string): SectionId => {
  const normalizedHash = hash.replace('#', '').trim().toLowerCase();

  switch (normalizedHash) {
    case 'creation':
      return 'CREATION';
    case 'consumption':
      return 'CONSUMPTION';
    case 'consciousness':
      return 'CONSCIOUSNESS';
    case 'contact':
      return 'CONTACT';
    default:
      return '';
  }
};

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    if (typeof window === 'undefined') return '';
    return getSectionFromHash(window.location.hash);
  });
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const [isMusicOpen, setIsMusicOpen] = useState(false);

  const activeSectionDetails = activeSection ? SECTION_META[activeSection] : null;

  useEffect(() => {
    const syncSectionFromUrl = () => {
      const nextSection = getSectionFromHash(window.location.hash);
      setActiveSection(nextSection);

      if (nextSection !== 'CREATION') {
        setSelectedEssayId(null);
      }
    };

    window.addEventListener('hashchange', syncSectionFromUrl);
    window.addEventListener('popstate', syncSectionFromUrl);

    return () => {
      window.removeEventListener('hashchange', syncSectionFromUrl);
      window.removeEventListener('popstate', syncSectionFromUrl);
    };
  }, []);

  useEffect(() => {
    document.title = activeSectionDetails
      ? `Akibwa | ${activeSectionDetails.title}`
      : 'Akibwa | Creation, consumption, and consciousness';
  }, [activeSectionDetails]);

  const updateSection = (nextSection: SectionId) => {
    setActiveSection(nextSection);

    if (nextSection !== 'CREATION') {
      setSelectedEssayId(null);
    }

    if (typeof window !== 'undefined') {
      const { pathname, search } = window.location;
      const nextHash = nextSection ? SECTION_META[nextSection].hash : '';
      window.history.pushState(null, '', `${pathname}${search}${nextHash}`);

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  const handleNavigationSelect = (label: SectionId) => {
    updateSection(label === activeSection ? '' : label);
  };

  const handleEssaySelect = (id: string) => {
    setSelectedEssayId(id);
  };

  const handleAppLaunch = (id: string) => {
    if (id === 'sound-mind') {
      setIsMusicOpen(true);
    }
  };

  return (
    <div className="min-h-screen text-[#1c1a17] dark:text-[#e8e2d6] transition-colors duration-300">
      <Navigation
        onSelect={handleNavigationSelect}
        activeSection={activeSection}
        onOpenMusic={() => setIsMusicOpen(true)}
        isMusicOpen={isMusicOpen}
      />

      <main id="main-content" className="max-w-6xl mx-auto px-5 md:px-7 py-8 md:py-12">
        <section key={activeSection || 'home'} className="animate-[fadeIn_.35s_ease-out]">
          {activeSection === '' && (
            <div className="space-y-8 md:space-y-10">
              <div className="surface-panel rounded-[2rem] p-6 md:p-10 lg:p-12 shadow-[0_28px_70px_rgba(18,14,8,0.08)] dark:shadow-[0_28px_70px_rgba(0,0,0,0.32)]">
                <div className="space-y-6 md:space-y-7">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8a8378] dark:text-[#8f8575]">
                    Dakibwa
                  </p>
                  <h1 className="font-display text-4xl md:text-6xl tracking-tight leading-[1.04] text-[#1c1a16] dark:text-[#ece3d0] max-w-4xl">
                    A digital notebook for making things.
                  </h1>
                  <p className="text-lg md:text-xl leading-relaxed max-w-3xl text-[#696257] dark:text-[#a89d88]">
                    A place I made to nudge my actions towards creation, acting as a counterweight to consumption, and a public slither of consciousness.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      onClick={() => setIsMusicOpen(true)}
                      className="rounded-full border border-[#205c5a]/25 bg-[#205c5a] px-4 py-2.5 text-sm font-medium text-[#f8f4ed] transition-colors hover:bg-[#184947] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] dark:border-[#79b7ab]/30 dark:bg-[#79b7ab] dark:text-[#102624] dark:hover:bg-[#8cc4b9]"
                    >
                      Music Map
                    </button>
                    <button
                      onClick={() => updateSection('CREATION')}
                      className="rounded-full border border-[#d8cfbe] px-4 py-2.5 text-sm font-medium text-[#696257] transition-colors hover:border-[#205c5a] hover:text-[#205c5a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] dark:border-[#342f25] dark:text-[#a89d88] dark:hover:border-[#79b7ab] dark:hover:text-[#79b7ab]"
                    >
                      Creation
                    </button>
                    <button
                      onClick={() => updateSection('CONSUMPTION')}
                      className="rounded-full border border-[#d8cfbe] px-4 py-2.5 text-sm font-medium text-[#696257] transition-colors hover:border-[#205c5a] hover:text-[#205c5a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] dark:border-[#342f25] dark:text-[#a89d88] dark:hover:border-[#79b7ab] dark:hover:text-[#79b7ab]"
                    >
                      Consumption
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {SECTION_ORDER.map((sectionId) => (
                  <button
                    key={sectionId}
                    onClick={() => updateSection(sectionId)}
                    className="surface-panel group rounded-[1.6rem] p-5 md:p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#205c5a]/45 hover:shadow-[0_20px_45px_rgba(18,14,8,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] dark:hover:border-[#79b7ab]/45 dark:hover:shadow-[0_20px_45px_rgba(0,0,0,0.26)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[#8a8378] dark:text-[#8f8575]">
                          {SECTION_META[sectionId].eyebrow}
                        </p>
                        <h2 className="mt-2 font-display text-2xl md:text-3xl tracking-tight">
                          {SECTION_META[sectionId].title}
                        </h2>
                      </div>
                      <span className="rounded-full border border-[#d8cfbe] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-[#696257] dark:border-[#342f25] dark:text-[#a89d88]">
                        {SECTION_META[sectionId].stat}
                      </span>
                    </div>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-[#696257] dark:text-[#a89d88]">
                      {SECTION_META[sectionId].homeDescription}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#205c5a] transition-transform duration-200 group-hover:translate-x-1 dark:text-[#79b7ab]">
                      Open section
                      <span aria-hidden="true">→</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <blockquote className="surface-panel rounded-[1.75rem] p-6 md:p-8 border-l-4 border-l-[#205c5a] dark:border-l-[#79b7ab]">
                  <p className="text-xl md:text-2xl text-[#696257] dark:text-[#a89d88] italic leading-relaxed">
                    "To leave the world a bit better… to know even one life has breathed easier because you have lived…"
                  </p>
                  <cite className="text-sm uppercase tracking-[0.12em] text-[#8a8378] dark:text-[#8f8575] mt-5 block">
                    Bessie Anderson Stanley, 1911
                  </cite>
                </blockquote>

                <LocationCard />
              </div>
            </div>
          )}

          {activeSectionDetails && (
            <div className="surface-panel rounded-[1.9rem] p-5 md:p-8 space-y-6 md:space-y-8 shadow-[0_14px_36px_rgba(18,14,8,0.06)] dark:shadow-[0_14px_36px_rgba(0,0,0,0.22)]">
              <header className="space-y-5 border-b border-[#d8cfbe] dark:border-[#342f25] pb-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl space-y-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8a8378] dark:text-[#8f8575]">
                      {activeSectionDetails.eyebrow}
                    </p>
                    <h2 className="font-display text-3xl md:text-5xl tracking-tight">
                      {activeSectionDetails.title}
                    </h2>
                    <p className="text-lg leading-relaxed text-[#696257] dark:text-[#a89d88]">
                      {activeSectionDetails.longDescription}
                    </p>
                  </div>

                  <button
                    onClick={() => updateSection('')}
                    className="inline-flex items-center gap-2 self-start rounded-full border border-[#d8cfbe] px-4 py-2 text-sm font-medium text-[#696257] transition-colors hover:border-[#205c5a] hover:text-[#205c5a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] dark:border-[#342f25] dark:text-[#a89d88] dark:hover:border-[#79b7ab] dark:hover:text-[#79b7ab]"
                  >
                    <span aria-hidden="true">←</span>
                    Back home
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SECTION_ORDER.map((sectionId) => (
                    <button
                      key={sectionId}
                      onClick={() => updateSection(sectionId)}
                      aria-pressed={activeSection === sectionId}
                      className={`rounded-full border px-3.5 py-2 text-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#205c5a] ${
                        activeSection === sectionId
                          ? 'border-[#205c5a] bg-[#205c5a]/10 text-[#205c5a] dark:border-[#79b7ab] dark:bg-[#79b7ab]/10 dark:text-[#79b7ab]'
                          : 'border-[#d8cfbe] text-[#696257] hover:border-[#205c5a]/45 hover:text-[#205c5a] dark:border-[#342f25] dark:text-[#a89d88] dark:hover:border-[#79b7ab]/45 dark:hover:text-[#79b7ab]'
                      }`}
                    >
                      {SECTION_META[sectionId].title}
                    </button>
                  ))}
                </div>
              </header>

              {activeSection === 'CREATION' && (
                <Creation
                  isActive={true}
                  onSelectEssay={handleEssaySelect}
                  onLaunchApp={handleAppLaunch}
                />
              )}

              {activeSection === 'CONSUMPTION' && <Consumption />}

              {activeSection === 'CONTACT' && <Contact />}

              {activeSection === 'CONSCIOUSNESS' && <Consciousness />}
            </div>
          )}
        </section>
      </main>

      <EssayView
        isOpen={!!selectedEssayId}
        onClose={() => setSelectedEssayId(null)}
      />

      <Suspense fallback={null}>
        <SoundMind
          isOpen={isMusicOpen}
          onClose={() => setIsMusicOpen(false)}
        />
      </Suspense>
    </div>
  );
};

export default App;
