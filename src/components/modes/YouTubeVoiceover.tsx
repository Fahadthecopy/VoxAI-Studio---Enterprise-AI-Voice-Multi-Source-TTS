import React, { useState } from 'react';
import { Video, Sparkles, Play, Layers, Compass, Loader2 } from 'lucide-react';
import { VoiceProfile } from '../../types';
import { api } from '../../services/api';

interface YouTubeVoiceoverProps {
  voices: VoiceProfile[];
  onVoiceoverGenerated: (gen: any) => void;
}

export const YouTubeVoiceover: React.FC<YouTubeVoiceoverProps> = ({
  voices,
  onVoiceoverGenerated,
}) => {
  const [videoTitle, setVideoTitle] = useState('Top 10 Breakthroughs in Quantum Computing');
  const [selectedPreset, setSelectedPreset] = useState('Technology');
  const [selectedVoiceId, setSelectedVoiceId] = useState('zephyr');
  const [script, setScript] = useState(
    `Quantum computers don't just calculate faster; they process reality differently. In this video, we uncover the ten groundbreaking moments where science fiction became laboratory reality. Make sure to subscribe, and let's jump right in!`
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const presets = [
    { id: 'Technology', label: 'Tech & AI Explainer', voice: 'zephyr', style: 'Conversational', emotion: 'Energetic' },
    { id: 'Documentary', label: 'Cinematic Documentary', voice: 'puck', style: 'Documentary', emotion: 'Dramatic' },
    { id: 'History', label: 'Historical Deep-Dive', voice: 'charon', style: 'Narration', emotion: 'Serious' },
    { id: 'News', label: 'Breaking News / Weekly', voice: 'kore', style: 'News', emotion: 'Professional' },
    { id: 'Storytelling', label: 'Dramatic Storytelling', voice: 'puck', style: 'Storytelling', emotion: 'Dramatic' },
    { id: 'Gaming', label: 'Gaming & High-Energy', voice: 'fenrir', style: 'Advertisement', emotion: 'Excited' },
    { id: 'Finance', label: 'Finance & Market Analysis', voice: 'kore', style: 'Narration', emotion: 'Professional' },
    { id: 'Motivation', label: 'Inspirational / Motivation', voice: 'zephyr', style: 'Storytelling', emotion: 'Energetic' },
  ];

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.id);
    setSelectedVoiceId(preset.voice);
  };

  const handleGenerate = async () => {
    if (!script.trim()) return;
    setIsGenerating(true);

    try {
      const presetObj = presets.find(p => p.id === selectedPreset);
      const res = await api.generateSpeech({
        text: script,
        voiceId: selectedVoiceId,
        title: videoTitle,
        sourceType: 'text',
        sourceName: `YouTube Voiceover (${selectedPreset})`,
        style: presetObj?.style || 'Narration',
        emotion: presetObj?.emotion || 'Natural',
      });

      onVoiceoverGenerated(res);
      alert('YouTube voiceover narration generated successfully!');
    } catch (err: any) {
      alert(`Voiceover generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">YouTube Voiceover Generator</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create high-retention video narrations tailored for modern content creators.
          </p>
        </div>

        <input
          type="text"
          value={videoTitle}
          onChange={e => setVideoTitle(e.target.value)}
          placeholder="Video Title..."
          className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none w-full md:w-80"
        />
      </div>

      {/* Preset Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
          Genre & Retention Preset
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {presets.map(preset => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <p className="font-bold text-xs">{preset.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  Style: {preset.style}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Script & Voice Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <label className="text-xs font-semibold text-slate-300">
            Narration Script
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Selected Voice:</span>
            <select
              value={selectedVoiceId}
              onChange={e => setSelectedVoiceId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none"
            >
              {voices.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.language} - {v.accent})
                </option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          rows={6}
          value={script}
          onChange={e => setScript(e.target.value)}
          placeholder="Paste or write your YouTube script here..."
          className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-xs sm:text-sm text-slate-100 outline-none leading-relaxed font-sans"
        />

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs font-mono text-slate-400">
            <span>{script.length} characters</span> •{' '}
            <span>{script.split(/\s+/).filter(Boolean).length} words</span> •{' '}
            <span className="text-indigo-400">
              Est. ~{Math.round((script.split(/\s+/).filter(Boolean).length / 150) * 60)}s
            </span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !script.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-40"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rendering Audio...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Generate YouTube Voiceover</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
