import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Download,
  Share2,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Check,
  Copy,
  Clock,
  Layers,
  FileText,
} from 'lucide-react';
import { GenerationRecord } from '../../types';

interface AudioPlayerProps {
  generation: GenerationRecord | null;
  onRegenerate?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ generation, onRegenerate }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    if (generation && audioRef.current) {
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(generation.duration || 0);
    }
  }, [generation?.id, generation?.audioUrl]);

  // Waveform canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const bars = 48;
    const barWidth = 4;
    const gap = (width - bars * barWidth) / (bars - 1);

    const progress = duration > 0 ? currentTime / duration : 0;
    const activeBars = Math.floor(progress * bars);

    for (let i = 0; i < bars; i++) {
      // Procedural waveform height pattern
      const angle = (i / bars) * Math.PI * 4;
      const baseAmp = Math.abs(Math.sin(angle) * 0.7) + Math.abs(Math.cos(angle * 2) * 0.3);
      const barHeight = Math.max(6, baseAmp * (height - 12));

      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      if (i <= activeBars) {
        ctx.fillStyle = '#6366f1'; // Indigo-500
      } else {
        ctx.fillStyle = '#334155'; // Slate-700
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }
  }, [currentTime, duration, isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error('Audio play error:', err));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const changeRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1.0;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const copyShareLink = () => {
    const shareUrl = window.location.origin + (generation ? `/api/audio/${generation.audioFileId}.wav` : '');
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!generation) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center mb-3">
          <Play className="w-5 h-5 text-slate-400 ml-0.5" />
        </div>
        <h4 className="text-sm font-semibold text-slate-300">No Audio Generated Yet</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Type text, upload a document, or paste an article URL above, then click Generate Speech to synthesize audio.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
      <audio
        ref={audioRef}
        src={generation.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-slate-100 text-base sm:text-lg truncate max-w-md">
              {generation.title || 'Speech Synthesis'}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
            <span className="font-semibold text-indigo-400">Voice: {generation.voiceName}</span>
            <span>•</span>
            <span>{generation.language}</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-[10px]">
              Source: {generation.sourceType === 'article' ? 'Article URL' : generation.sourceType === 'file' ? 'Uploaded File' : 'Text'}
            </span>
          </div>
        </div>

        {/* Action buttons: Download & Share */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={generation.audioUrl}
            download={`${generation.voiceName.replace(/\s+/g, '_')}_speech.${generation.format || 'wav'}`}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Download {generation.format?.toUpperCase() || 'WAV'}
          </a>

          <button
            onClick={() => setShowShareModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        </div>
      </div>

      {/* Waveform & Scrubber */}
      <div className="space-y-2 py-2">
        <div className="w-full flex justify-center py-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <canvas ref={canvasRef} width={480} height={48} className="w-full max-w-lg h-12" />
        </div>

        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.01"
          value={currentTime}
          onChange={handleSeek}
          className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Player Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
        {/* Play/Pause & Skip */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-transform active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Restart playback"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed Presets */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
              <button
                key={rate}
                onClick={() => changeRate(rate)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  playbackRate === rate ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Volume & Audio Format Info */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-slate-400 hover:text-white">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 accent-indigo-500 cursor-pointer h-1 bg-slate-800"
            />
          </div>

          <span className="font-mono text-slate-500 text-[10px] hidden sm:inline">
            {generation.format?.toUpperCase()} • 24,000 Hz
          </span>
        </div>
      </div>

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-base">Share Audio Narration</h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Anyone with this link can stream or download this generated speech file directly.
            </p>

            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <input
                type="text"
                readOnly
                value={window.location.origin + `/api/audio/${generation.audioFileId}.wav`}
                className="bg-transparent text-xs text-slate-300 w-full outline-none font-mono"
              />
              <button
                onClick={copyShareLink}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1 shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
