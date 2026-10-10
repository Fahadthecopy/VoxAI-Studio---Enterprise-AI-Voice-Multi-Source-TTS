import React, { useState } from 'react';
import { Radio, Users, Play, Plus, Trash2, Sparkles, Volume2, Loader2 } from 'lucide-react';
import { VoiceProfile } from '../../types';
import { api } from '../../services/api';

interface PodcastStudioProps {
  voices: VoiceProfile[];
  onPodcastGenerated: (gen: any) => void;
}

interface SpeakerLine {
  id: string;
  speaker: 'HOST' | 'GUEST' | 'NARRATOR';
  voiceId: string;
  text: string;
}

export const PodcastStudio: React.FC<PodcastStudioProps> = ({ voices, onPodcastGenerated }) => {
  const [episodeTitle, setEpisodeTitle] = useState('Episode 1: The Frontier of AI Speech');
  const [hostVoiceId, setHostVoiceId] = useState(voices[0]?.id || 'kore');
  const [guestVoiceId, setGuestVoiceId] = useState(voices[1]?.id || 'zephyr');
  const [narratorVoiceId, setNarratorVoiceId] = useState(voices[2]?.id || 'puck');

  const [lines, setLines] = useState<SpeakerLine[]>([
    {
      id: '1',
      speaker: 'HOST',
      voiceId: voices[0]?.id || 'kore',
      text: 'Welcome to VoxAI Audio Tech. Today we are exploring the huge leap forward in multi-source speech generation.',
    },
    {
      id: '2',
      speaker: 'GUEST',
      voiceId: voices[1]?.id || 'zephyr',
      text: 'Thanks for having me, Sarah. It really is incredible how any document or live article can become fluent dialogue in seconds.',
    },
    {
      id: '3',
      speaker: 'HOST',
      voiceId: voices[0]?.id || 'kore',
      text: 'Exactly! Let us walk through how automated chunking and acoustic formant modeling works.',
    },
    {
      id: '4',
      speaker: 'NARRATOR',
      voiceId: voices[2]?.id || 'puck',
      text: 'Deep within the neural architecture, sound synthesis preserves the emotional dynamics of every word.',
    },
  ]);

  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const addLine = (speaker: 'HOST' | 'GUEST' | 'NARRATOR') => {
    const vId = speaker === 'HOST' ? hostVoiceId : speaker === 'GUEST' ? guestVoiceId : narratorVoiceId;
    setLines([
      ...lines,
      {
        id: Date.now().toString(),
        speaker,
        voiceId: vId,
        text: '',
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLineText = (id: string, text: string) => {
    setLines(lines.map(l => (l.id === id ? { ...l, text } : l)));
  };

  const handleGeneratePodcast = async () => {
    const fullScript = lines
      .map(l => `${l.speaker}: ${l.text}`)
      .join('\n\n');

    if (!fullScript.trim()) return;

    setIsSynthesizing(true);
    try {
      const res = await api.generateSpeech({
        text: fullScript,
        voiceId: hostVoiceId,
        title: episodeTitle,
        sourceType: 'text',
        sourceName: 'Podcast Studio Multi-Speaker',
        style: 'Conversational',
        emotion: 'Natural',
      });

      onPodcastGenerated(res);
      alert('Podcast episode successfully synthesized!');
    } catch (err: any) {
      alert(`Podcast synthesis failed: ${err.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Podcast Multi-Speaker Studio</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Create conversational interviews and multi-character episodes with independent voice personas.
          </p>
        </div>

        <input
          type="text"
          value={episodeTitle}
          onChange={e => setEpisodeTitle(e.target.value)}
          className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-slate-200 outline-none w-full md:w-80"
          placeholder="Podcast episode title"
        />
      </div>

      {/* Speaker Roles & Assigned Voices */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Host */}
        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-400 text-xs uppercase tracking-wider">🎙 Host</span>
            <span className="text-[10px] text-slate-400">Primary Voice</span>
          </div>
          <select
            value={hostVoiceId}
            onChange={e => setHostVoiceId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none"
          >
            {voices.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.language})
              </option>
            ))}
          </select>
        </div>

        {/* Guest */}
        <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-violet-400 text-xs uppercase tracking-wider">🎧 Guest</span>
            <span className="text-[10px] text-slate-400">Co-Speaker</span>
          </div>
          <select
            value={guestVoiceId}
            onChange={e => setGuestVoiceId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none"
          >
            {voices.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.language})
              </option>
            ))}
          </select>
        </div>

        {/* Narrator */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-400 text-xs uppercase tracking-wider">📖 Narrator</span>
            <span className="text-[10px] text-slate-400">Intro / Outro</span>
          </div>
          <select
            value={narratorVoiceId}
            onChange={e => setNarratorVoiceId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 outline-none"
          >
            {voices.map(v => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.language})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Script Lines Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Episode Script ({lines.length} Cue Points)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addLine('HOST')}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30"
            >
              + Host Line
            </button>
            <button
              onClick={() => addLine('GUEST')}
              className="px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-semibold hover:bg-violet-600/30"
            >
              + Guest Line
            </button>
            <button
              onClick={() => addLine('NARRATOR')}
              className="px-2.5 py-1 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-600/30"
            >
              + Narrator Line
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {lines.map((line, idx) => {
            const isHost = line.speaker === 'HOST';
            const isGuest = line.speaker === 'GUEST';

            return (
              <div
                key={line.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
                  isHost
                    ? 'bg-indigo-950/20 border-indigo-500/20'
                    : isGuest
                    ? 'bg-violet-950/20 border-violet-500/20'
                    : 'bg-amber-950/20 border-amber-500/20'
                }`}
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isHost
                        ? 'bg-indigo-500 text-white'
                        : isGuest
                        ? 'bg-violet-500 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {line.speaker}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">#{idx + 1}</span>
                </div>

                <input
                  type="text"
                  value={line.text}
                  onChange={e => updateLineText(line.id, e.target.value)}
                  placeholder={`Spoken lines for ${line.speaker}...`}
                  className="w-full bg-slate-950/70 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 outline-none"
                />

                <button
                  onClick={() => removeLine(line.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                  title="Remove line"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleGeneratePodcast}
            disabled={isSynthesizing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            {isSynthesizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Multi-Speaker Episode...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Render Full Podcast Audio</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
