import React, { useState } from 'react';
import { Search, Play, Pause, Globe, Sparkles, Check, Filter } from 'lucide-react';
import { VoiceProfile } from '../../types';

interface VoiceSelectorProps {
  voices: VoiceProfile[];
  selectedVoice: VoiceProfile;
  onSelectVoice: (voice: VoiceProfile) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
}) => {
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [selectedGender, setSelectedGender] = useState('All');
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Play voice sample using browser speech synthesis as a preview or simple tone
  const playPreview = (voice: VoiceProfile, e: React.MouseEvent) => {
    e.stopPropagation();

    if (previewingId === voice.id) {
      window.speechSynthesis?.cancel();
      setPreviewingId(null);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(voice.sampleText);
      utterance.lang = voice.languageCode;
      utterance.pitch = voice.gender === 'female' ? 1.2 : 0.9;
      utterance.rate = 1.0;

      utterance.onend = () => setPreviewingId(null);
      utterance.onerror = () => setPreviewingId(null);

      window.speechSynthesis.speak(utterance);
      setPreviewingId(voice.id);
    } else {
      alert(`Preview: "${voice.sampleText}"`);
    }
  };

  // Distinct languages in catalog
  const languages = ['All', 'English', 'Hindi', 'Urdu', 'Spanish', 'French', 'German', 'Arabic'];

  const filteredVoices = voices.filter(v => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.language.toLowerCase().includes(search.toLowerCase()) ||
      v.accent.toLowerCase().includes(search.toLowerCase()) ||
      v.useCases.some(u => u.toLowerCase().includes(search.toLowerCase()));

    const matchesLang =
      selectedLanguage === 'All' || v.language.toLowerCase() === selectedLanguage.toLowerCase();

    const matchesGender =
      selectedGender === 'All' || v.gender.toLowerCase() === selectedGender.toLowerCase();

    return matchesSearch && matchesLang && matchesGender;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            Voice Actor
          </span>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-100">{selectedVoice.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
              {selectedVoice.language} ({selectedVoice.accent})
            </span>
          </div>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          {voices.length} Multilingual Voices Available
        </span>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search voice name, language, accent, or use case..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-colors"
          />
        </div>

        {/* Language Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {languages.map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-3 py-1 rounded-lg whitespace-nowrap transition-colors ${
                selectedLanguage === lang
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {lang}
            </button>
          ))}

          <div className="h-4 w-[1px] bg-slate-800 mx-1 shrink-0" />

          {/* Gender Filter */}
          {['All', 'Female', 'Male'].map(gender => (
            <button
              key={gender}
              onClick={() => setSelectedGender(gender)}
              className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${
                selectedGender === gender
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-slate-950 text-slate-500 hover:text-slate-300'
              }`}
            >
              {gender}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
        {filteredVoices.map(voice => {
          const isSelected = selectedVoice.id === voice.id;
          const isPlaying = previewingId === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => onSelectVoice(voice)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 text-left relative group ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-200 text-xs sm:text-sm truncate">
                      {voice.name}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {voice.language} • {voice.gender} • {voice.accent}
                  </span>
                </div>

                {/* Preview Audio Button */}
                <button
                  onClick={e => playPreview(voice, e)}
                  title="Preview Voice Sample"
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                    isPlaying
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {voice.description}
              </p>

              <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/60 text-[9px]">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                  {voice.provider === 'gemini' ? 'Google Gemini' : 'VoxAI Neural'}
                </span>
                {voice.useCases.slice(0, 2).map(u => (
                  <span key={u} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
