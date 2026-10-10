import React from 'react';
import { Sliders, Sparkles, Volume2, FastForward, Play, Loader2 } from 'lucide-react';
import { VoiceProfile } from '../../types';

interface VoiceControlsProps {
  voice: VoiceProfile;
  emotion: string;
  setEmotion: (emotion: string) => void;
  style: string;
  setStyle: (style: string) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  pitch: number;
  setPitch: (pitch: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  format: 'mp3' | 'wav';
  setFormat: (format: 'mp3' | 'wav') => void;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  voice,
  emotion,
  setEmotion,
  style,
  setStyle,
  speed,
  setSpeed,
  pitch,
  setPitch,
  volume,
  setVolume,
  format,
  setFormat,
  onGenerate,
  isGenerating,
  disabled,
}) => {
  const emotions = voice.supportedEmotions.length > 0
    ? voice.supportedEmotions
    : ['Natural', 'Professional', 'Friendly', 'Calm', 'Serious', 'Energetic', 'Dramatic'];

  const styles = voice.supportedStyles.length > 0
    ? voice.supportedStyles
    : ['Narration', 'Conversational', 'News', 'Storytelling', 'Documentary', 'Advertisement'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-slate-100 text-sm sm:text-base">Voice Customization & Controls</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Engine: {voice.provider === 'gemini' ? 'Gemini 3.8 Flash Lite TTS' : 'VoxAI Acoustic Synthesizer'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Emotion control */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 block">
            Emotion
          </label>
          <select
            value={emotion}
            onChange={e => setEmotion(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 outline-none"
          >
            {emotions.map(em => (
              <option key={em} value={em}>
                {em}
              </option>
            ))}
          </select>
        </div>

        {/* Style control */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 block">
            Delivery Style
          </label>
          <select
            value={style}
            onChange={e => setStyle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-slate-200 outline-none"
          >
            {styles.map(st => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Output Format */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-300 block">
            Output Format
          </label>
          <div className="flex rounded-xl bg-slate-950 border border-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setFormat('mp3')}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-center transition-colors ${
                format === 'mp3' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MP3 (Compact)
            </button>
            <button
              type="button"
              onClick={() => setFormat('wav')}
              className={`flex-1 py-1.5 rounded-lg font-semibold text-center transition-colors ${
                format === 'wav' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              WAV (Lossless)
            </button>
          </div>
        </div>

        {/* Speed Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="font-semibold">Speed Rate</span>
            <span className="font-mono text-indigo-400">{speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={speed}
            onChange={e => setSpeed(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Sliders: Pitch & Volume */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800/60">
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="font-semibold">Pitch Offset</span>
            <span className="font-mono text-indigo-400">
              {pitch > 0 ? `+${pitch}` : pitch} semitones
            </span>
          </div>
          <input
            type="range"
            min="-10"
            max="10"
            step="1"
            value={pitch}
            onChange={e => setPitch(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span className="font-semibold">Master Volume</span>
            <span className="font-mono text-indigo-400">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Primary Action Button: Generate Speech */}
      <div className="pt-2">
        <button
          onClick={onGenerate}
          disabled={disabled || isGenerating}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating Speech (Preparing & Synthesizing Audio)...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Generate Speech</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
