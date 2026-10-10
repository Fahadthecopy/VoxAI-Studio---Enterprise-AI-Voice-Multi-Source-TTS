import React from 'react';
import {
  Sparkles,
  Volume2,
  Video,
  Radio,
  Clock,
  BookOpen,
  CreditCard,
  ShieldAlert,
  BarChart2,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  usage?: { charactersUsed: number; planLimit: number; planTier: string };
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, usage }) => {
  const navItems = [
    { id: 'studio', label: 'TTS Studio', icon: Volume2 },
    { id: 'youtube', label: 'YouTube Studio', icon: Video },
    { id: 'podcast', label: 'Podcast Studio', icon: Radio },
    { id: 'voices', label: 'Voice Library', icon: Sparkles },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'pronunciation', label: 'Dictionary', icon: BookOpen },
    { id: 'pricing', label: 'Plans', icon: CreditCard },
    { id: 'admin', label: 'Admin', icon: ShieldAlert },
  ];

  const charsUsed = usage?.charactersUsed ?? 12450;
  const limit = usage?.planLimit ?? 100000;
  const percent = Math.min(100, Math.round((charsUsed / limit) * 100));

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setCurrentTab('studio')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                  VoxAI
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Studio
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Multi-Source Voice Synthesis</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Header Status / Usage */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-xs">
              <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
              <div className="flex flex-col">
                <span className="text-slate-400 font-mono text-[10px]">Quota: {usage?.planTier || 'PRO'}</span>
                <span className="font-semibold text-slate-200">
                  {charsUsed.toLocaleString()} / {limit.toLocaleString()} chars
                </span>
              </div>
              <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden ml-1">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => setCurrentTab('studio')}
              className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition-all active:scale-95"
            >
              + New Voice
            </button>
          </div>
        </div>

        {/* Mobile Submenu */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800 text-xs scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md whitespace-nowrap ${
                  isActive ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
