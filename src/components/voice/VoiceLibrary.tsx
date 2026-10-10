import React, { useState } from 'react';
import { Sparkles, Search, Play, Pause, Globe, ArrowRight, ShieldCheck } from 'lucide-react';
import { VoiceProfile } from '../../types';

interface VoiceLibraryProps {
  voices: VoiceProfile[];
  onSelectAndOpenStudio: (voice: VoiceProfile) => void;
}

export const VoiceLibrary: React.FC<VoiceLibraryProps> = ({ voices, onSelectAndOpenStudio }) => {
  const [search, setSearch] = useState('');
  const [selectedLang, setSelectedLang] = useState('All');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const playPreview = (voice: VoiceProfile) => {
    if (playingId === voice.id) {
      window.speechSynthesis?.cancel();
      setPlayingId(null);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(voice.sampleText);
      utterance.lang = voice.languageCode;
      utterance.pitch = voice.gender === 'female' ? 1.2 : 0.9;
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
      setPlayingId(voice.id);
    }
  };

  const languages = ['All', 'English', 'Hindi', 'Urdu', 'Spanish', 'French', 'German', 'Arabic'];

  const filtered = voices.filter(v => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.language.toLowerCase().includes(search.toLowerCase()) ||
      v.accent.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase());
    const matchesLang = selectedLang === 'All' || v.language.toLowerCase() === selectedLang.toLowerCase();
    return matchesSearch && matchesLang;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Global Voice Library</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browse our complete roster of multilingual, emotion-aware voice personas.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search voice library..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 outline-none"
          />
        </div>
      </div>

      {/* Language filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {languages.map(l => (
          <button
            key={l}
            onClick={() => setSelectedLang(l)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              selectedLang === l
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Grid of Voices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(voice => {
          const isPlaying = playingId === voice.id;

          return (
            <div
              key={voice.id}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">{voice.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                      <span>{voice.language}</span>
                      <span>•</span>
                      <span>{voice.country}</span>
                      <span>•</span>
                      <span>{voice.accent}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => playPreview(voice)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                      isPlaying
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 group-hover:text-white'
                    }`}
                    title="Play voice preview sample"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{voice.description}</p>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300 italic font-serif">
                  "{voice.sampleText}"
                </div>

                <div className="space-y-1.5 text-[10px]">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-slate-500 mr-1 font-mono">Styles:</span>
                    {voice.supportedStyles.map(s => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <span className="text-slate-500 mr-1 font-mono">Emotions:</span>
                    {voice.supportedEmotions.slice(0, 4).map(e => (
                      <span key={e} className="px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 font-mono">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  {voice.provider === 'gemini' ? 'Google Gemini Audio' : 'VoxAI Neural Formant'}
                </span>

                <button
                  onClick={() => onSelectAndOpenStudio(voice)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <span>Use Voice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
